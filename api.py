"""FastAPI backend wrapping the RallyEngine analysis pipeline."""
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from agent.orchestrator import run_analysis

app = FastAPI(title="RallyEngine API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_executor = ThreadPoolExecutor(max_workers=4)


class AnalyzeRequest(BaseModel):
    creator: str
    platforms: list[str] = ["TikTok", "Instagram"]
    brand_context: str | None = None
    cache_hours: float = 0


class AnalyzeResponse(BaseModel):
    summary: str
    content_analysis: str
    brand_fit: str
    caveats: str
    num_docs: int
    num_chunks: int


def _run_pipeline_sync(req: AnalyzeRequest, progress_cb, token_cb):
    return run_analysis(
        creator_name=req.creator.strip(),
        platforms=req.platforms,
        brand_context=req.brand_context or None,
        use_cache_hours=req.cache_hours,
        progress_callback=progress_cb,
        token_callback=token_cb,
    )


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Stream progress events as NDJSON, followed by a final result event.
    Event shapes:
      {"type":"progress","phase":"..."}
      {"type":"token","section":"summary"|"brand_fit","chunk":"..."}
      {"type":"result","data":{summary,content_analysis,brand_fit,caveats,num_docs,num_chunks}}
      {"type":"error","message":"..."}
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(phase: str) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "progress", "phase": phase})

    def on_token(section: str, chunk: str) -> None:
        loop.call_soon_threadsafe(
            queue.put_nowait, {"type": "token", "section": section, "chunk": chunk}
        )

    def worker():
        try:
            result = _run_pipeline_sync(req, on_progress, on_token)
            meta = result.get("meta", {})
            payload = {
                "summary": result.get("summary", ""),
                "content_analysis": result.get("content_analysis", ""),
                "brand_fit": result.get("brand_fit", ""),
                "caveats": result.get("caveats", ""),
                "num_docs": meta.get("num_docs", 0),
                "num_chunks": meta.get("num_chunks", 0),
            }
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "result", "data": payload})
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "message": str(e)})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    async def event_stream():
        yield json.dumps({"type": "progress", "phase": "Starting analysis..."}) + "\n"
        future = loop.run_in_executor(_executor, worker)
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=200.0)
                except asyncio.TimeoutError:
                    yield json.dumps({"type": "error", "message": "Analysis timed out"}) + "\n"
                    break
                if item is None:
                    break
                yield json.dumps(item) + "\n"
        finally:
            if not future.done():
                future.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
