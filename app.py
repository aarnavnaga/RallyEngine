"""
UGC Creator Evaluation Agent - Streamlit UI.
Enter a creator name/handle, run analysis, view summary and brand-fit report.
"""
import os
import streamlit as st

from agent.orchestrator import run_analysis


def _report_to_markdown(result: dict, creator_name: str) -> str:
    """Build a Markdown string for the report download."""
    lines = [
        f"# UGC Creator Report: {creator_name}",
        "",
        "## Creator summary",
        (result.get("summary") or result.get("content_analysis") or "—").strip(),
        "",
        "## Content analysis",
        (result.get("content_analysis") or "—").strip(),
        "",
        "## Brand fit assessment",
        (result.get("brand_fit") or "—").strip(),
        "",
        "## Caveats",
        (result.get("caveats") or "—").strip(),
    ]
    meta = result.get("meta") or {}
    if meta:
        lines.extend(["", f"*Based on {meta.get('num_docs', 0)} doc(s), {meta.get('num_chunks', 0)} chunks.*"])
    return "\n".join(lines)

st.set_page_config(page_title="UGC Creator Evaluation", page_icon="📊", layout="wide")
st.title("UGC Creator Evaluation Agent")
st.caption("Analyze creators from TikTok, Instagram, and other platforms for brand fit.")

creator_name = st.text_input("Creator name or handle", placeholder="e.g. @username or sample")
platforms = st.multiselect(
    "Platforms to analyze",
    options=["TikTok", "Instagram"],
    default=["TikTok", "Instagram"],
)
brand_context = st.text_area(
    "Brand context (optional)",
    placeholder="e.g. Skincare brand targeting Gen Z",
    height=80,
)

with st.expander("Options"):
    _cache_default = 24
    try:
        _cache_default = int(os.environ.get("CACHE_HOURS", "24") or 0) or 24
    except Exception:
        pass
    cache_hours = st.number_input(
        "Use cache (hours): skip re-scrape if data is newer than this. 0 = always scrape.",
        min_value=0,
        value=_cache_default,
        step=1,
    )
    use_cache_hours = 0.0 if cache_hours <= 0 else float(cache_hours)

if st.button("Analyze creator", type="primary"):
    if not creator_name or not creator_name.strip():
        st.warning("Please enter a creator name or handle.")
    else:
        progress = st.empty()
        try:
            def update_status(msg):
                progress.status(msg)

            result = run_analysis(
                creator_name=creator_name.strip(),
                platforms=platforms,
                brand_context=brand_context.strip() or None,
                use_cache_hours=use_cache_hours,
                progress_callback=update_status,
            )
            progress.empty()

            st.session_state["last_report"] = result
            st.session_state["last_creator"] = creator_name.strip()

            st.success("Analysis complete.")
            meta = result.get("meta") or {}
            st.caption(f"Based on {meta.get('num_docs', 0)} doc(s), {meta.get('num_chunks', 0)} chunks.")

            st.subheader("Creator summary")
            st.markdown(result.get("summary") or result.get("content_analysis") or "—")

            st.subheader("Content analysis")
            st.markdown(result.get("content_analysis") or "—")

            st.subheader("Brand fit assessment")
            st.markdown(result.get("brand_fit") or "—")

            st.subheader("Caveats")
            st.markdown(result.get("caveats") or "—")

            # Report export (Markdown)
            md = _report_to_markdown(result, st.session_state.get("last_creator", ""))
            st.download_button(
                "Download report (Markdown)",
                data=md,
                file_name=f"ugc_report_{(st.session_state.get('last_creator') or 'creator').replace(' ', '_')}.md",
                mime="text/markdown",
            )

        except Exception as e:
            progress.empty()
            st.error(f"Analysis failed: {e}")
            raise

st.divider()
st.markdown("*Try **sample** as creator name to use pre-loaded sample data (no scraping).*")
