# UGC Creator Evaluation Agent

Streamlit app that evaluates UGC creators (TikTok, Instagram) via RAG: scrape content, ingest into a vector store, and generate a summary plus brand-fit report for brands.

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set at least:

   - `OPENAI_API_KEY` – required for embeddings and LLM report.

   Optional: `INSTAGRAM_USER`, `INSTAGRAM_PASSWORD` for Instagram scraping; `CACHE_HOURS`, `RATE_LIMIT_DELAY_SECONDS` (see `.env.example`).

3. For TikTok scraping, install Playwright browsers once:

   ```bash
   playwright install
   ```

## Run

```bash
streamlit run app.py
```

Use **sample** as the creator name to run against pre-loaded sample data (no scraping). For real creators, enter a TikTok/Instagram handle; scraping may require credentials and is subject to platform ToS.

## Options

- **Use cache (hours)** – Skip re-scraping if data under `data/creators/<name>/` is newer than this. Set to 0 to always scrape.
- **Brand context** – Optional text (e.g. "Skincare brand, Gen Z") used in the brand-fit assessment.
- **Download report** – Export the report as Markdown after analysis.

## Project layout

- `app.py` – Streamlit UI
- `agent/` – Orchestrator and prompts
- `rag/` – Ingestion, retrieval, Chroma vector store
- `scrapers/` – TikTok and Instagram scrapers
- `data/creators/` – Scraped content (gitignored); use `data/creators/sample/` for demo
