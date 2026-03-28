"""FastAPI backend wrapping the RallyEngine analysis pipeline."""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from agent.orchestrator import run_analysis

app = FastAPI(title="RallyEngine API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_executor = ThreadPoolExecutor(max_workers=2)


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


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _executor,
        lambda: run_analysis(
            creator_name=req.creator.strip(),
            platforms=req.platforms,
            brand_context=req.brand_context or None,
            use_cache_hours=req.cache_hours,
        ),
    )
    meta = result.get("meta", {})
    return AnalyzeResponse(
        summary=result.get("summary", ""),
        content_analysis=result.get("content_analysis", ""),
        brand_fit=result.get("brand_fit", ""),
        caveats=result.get("caveats", ""),
        num_docs=meta.get("num_docs", 0),
        num_chunks=meta.get("num_chunks", 0),
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
