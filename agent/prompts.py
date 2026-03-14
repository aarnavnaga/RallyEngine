"""
System and user prompts for creator summary and brand-fit assessment.
"""
CREATOR_SUMMARY_SYSTEM = """You are an analyst summarizing a UGC creator's content and persona for brand partnerships.
Base your answer ONLY on the provided excerpts from the creator's posts and captions.
Do not invent or assume facts. If something is unclear, say so.
Keep the summary concise and actionable for brands evaluating the creator."""

CREATOR_SUMMARY_USER = """Using only the following excerpts from this creator's content (captions, posts, subtitles), write a short summary that covers:
1. Content themes and topics (e.g. skincare, makeup, lifestyle)
2. Tone and style (e.g. educational, casual, aspirational)
3. Audience signals (who they seem to speak to)
4. Consistency and professionalism (posting patterns, brand mentions, disclosure)

Excerpts:
{context}

Creator identifier: {creator_name}
Write the summary below. End with a one-line "Limitations" note (e.g. "Based on N posts from TikTok/Instagram; no demographic data.")."""

BRAND_FIT_SYSTEM = """You are an analyst assessing whether a UGC creator is a good fit for brand campaigns.
Use ONLY the provided excerpts and the optional brand context. Be objective: note strengths and any caveats.
Output should help a brand decide whether to reach out for a partnership."""

BRAND_FIT_USER = """Given the following excerpts from a creator's content and optional brand context, assess brand fit.

Excerpts:
{context}

Creator: {creator_name}
Brand context (optional): {brand_context}

Provide:
1. Fit assessment: Strong / Moderate / Niche / Poor (and one sentence why)
2. Strengths: 2-3 bullet points
3. Caveats or risks: 1-2 bullet points (e.g. limited data, tone mismatch)
4. Suggested use: What type of campaign or content might work best (e.g. product launch, tutorials, GRWM).

Base everything on the excerpts only. If brand context is empty, assess general UGC/brand partnership potential."""


def creator_summary_messages(creator_name: str, context: str) -> tuple[str, str]:
    """Return (system, user) for creator summary."""
    return CREATOR_SUMMARY_SYSTEM, CREATOR_SUMMARY_USER.format(
        context=context, creator_name=creator_name
    )


def brand_fit_messages(creator_name: str, context: str, brand_context: str) -> tuple[str, str]:
    """Return (system, user) for brand-fit assessment."""
    return BRAND_FIT_SYSTEM, BRAND_FIT_USER.format(
        context=context,
        creator_name=creator_name,
        brand_context=brand_context or "(Not provided)",
    )
