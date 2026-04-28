"""Creator Experts — internal proposal deck for Aaron Langerman (Mercor).

Framed as an internal proposal from two current Mercor contractors (Logan +
Aarnav, both on the CUA-envs contract for Anthropic under Drew Geoly).

Mercor design tokens mirror work.mercor.com 1:1:
  - bg #ffffff, bg-elev #fafafa
  - fg #0a0a0a, fg-muted #6b7280, fg-subtle #9ca3af
  - border #e5e7eb
  - accent #7857ff (Mercor purple), accent-soft #ede9fe
  - typography: Inter

Structure: 5 slides. Cover → Why now → Proof → Plan + asks → Demo handoff.

Run: python3 scripts/build_aaron_deck.py
Output: docs/pitch/Mercor-Creators-Domain.pptx
"""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

# ─── Tokens ─────────────────────────────────────────────────────────────────
BG = RGBColor(0xFF, 0xFF, 0xFF)
BG_ELEV = RGBColor(0xFA, 0xFA, 0xFA)
FG = RGBColor(0x0A, 0x0A, 0x0A)
FG_MUTED = RGBColor(0x6B, 0x72, 0x80)
FG_SUBTLE = RGBColor(0x9C, 0xA3, 0xAF)
BORDER = RGBColor(0xE5, 0xE7, 0xEB)
ACCENT = RGBColor(0x78, 0x57, 0xFF)
ACCENT_SOFT = RGBColor(0xED, 0xE9, 0xFE)

FONT_DISPLAY = "Inter"
FONT_BODY = "Inter"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

PFP_DIR = Path("/tmp/mercor-pfps")
PFP_AARON = PFP_DIR / "aaron.jpg"
PFP_LOGAN = PFP_DIR / "logan.jpg"
PFP_LUNA = PFP_DIR / "luna.jpg"
PFP_JORDAN = PFP_DIR / "jordan.jpg"
PFP_EDDIE = PFP_DIR / "eddie.jpg"

REPO_ROOT = Path(__file__).resolve().parents[1]
MERCOR_LOGO = REPO_ROOT / "docs" / "pitch" / "mercor-logo.png"


# ─── Primitives ─────────────────────────────────────────────────────────────

def _set_run_style(run, *, size=14, bold=False, color=FG, font=FONT_BODY, spacing=None):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    if spacing is not None:
        run.font._rPr.set("spc", str(spacing))


def _add_textbox(slide, *, left, top, width, height, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(left, top, width, height)
    tf = tb.text_frame
    tf.word_wrap = True
    for attr in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, attr, Emu(0))
    tf.vertical_anchor = anchor
    tf.paragraphs[0].text = ""
    return tf


def _add_paragraph(
    tf, text, *,
    size=14, bold=False, color=FG, font=FONT_BODY, spacing=None,
    space_before=0, space_after=4, align=PP_ALIGN.LEFT, first=False,
):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    run = p.add_run()
    run.text = text
    _set_run_style(run, size=size, bold=bold, color=color, font=font, spacing=spacing)
    return p


def _white_background(slide):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = BG


def _accent_bar(slide, *, top, height_pt=4, width_in=0.6, left_in=0.7):
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(left_in), top, Inches(width_in), Pt(height_pt),
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT
    bar.line.fill.background()


def _wordmark(slide, *, text="mercor"):
    tf = _add_textbox(slide, left=Inches(0.7), top=Inches(0.45), width=Inches(6), height=Inches(0.3))
    _add_paragraph(tf, text, size=11, bold=True, color=FG, font=FONT_DISPLAY, first=True)


def _logo_corner(slide, *, size_in=0.35, right_pad=0.7, top_pad=0.35):
    """Small Mercor M logo in the top-right corner. Transparent PNG."""
    if not MERCOR_LOGO.exists():
        return
    slide_w_in = 13.333
    left = slide_w_in - right_pad - size_in
    slide.shapes.add_picture(
        str(MERCOR_LOGO),
        Inches(left), Inches(top_pad),
        Inches(size_in), Inches(size_in),
    )


def _footer(slide, *, page, total):
    tf = _add_textbox(slide, left=Inches(0.7), top=Inches(7.05), width=Inches(12), height=Inches(0.3))
    _add_paragraph(
        tf,
        f"creator experts   ·   internal proposal for aaron langerman   ·   {page} / {total}",
        size=9, color=FG_SUBTLE, font=FONT_BODY, first=True,
    )


def _micro_label(slide, *, text, top_in, left_in=0.7):
    tf = _add_textbox(slide, left=Inches(left_in), top=Inches(top_in), width=Inches(8), height=Inches(0.3))
    _add_paragraph(
        tf, text.upper(),
        size=10, bold=True, color=ACCENT, font=FONT_DISPLAY, spacing=120, first=True,
    )


def _hero(slide, *, text, top_in=1.5, size=44, color=FG, height=2.2,
          line_spacing=1.05, left_in=0.7, width_in=12):
    tf = _add_textbox(slide, left=Inches(left_in), top=Inches(top_in),
                      width=Inches(width_in), height=Inches(height))
    p = _add_paragraph(tf, text, size=size, bold=True, color=color, font=FONT_DISPLAY, first=True)
    p.line_spacing = line_spacing


def _circle_pfp(slide, *, image_path: Path | None, initials: str,
                left_in: float, top_in: float, diameter_in: float = 0.85):
    """Round PFP. Uses image if available, else initials in accent-soft circle."""
    if image_path and image_path.exists():
        # Background circle for clip-mask appearance.
        circle = slide.shapes.add_shape(
            MSO_SHAPE.OVAL,
            Inches(left_in), Inches(top_in),
            Inches(diameter_in), Inches(diameter_in),
        )
        circle.fill.solid()
        circle.fill.fore_color.rgb = BORDER
        circle.line.color.rgb = BORDER
        circle.line.width = Pt(0.5)
        # Embed image (square — we trade circular-clip for visual simplicity;
        # the OVAL behind reads as a frame on most renderers).
        slide.shapes.add_picture(
            str(image_path),
            Inches(left_in), Inches(top_in),
            Inches(diameter_in), Inches(diameter_in),
        )
        return
    # Fallback: accent-soft circle with initials.
    circle = slide.shapes.add_shape(
        MSO_SHAPE.OVAL,
        Inches(left_in), Inches(top_in),
        Inches(diameter_in), Inches(diameter_in),
    )
    circle.fill.solid()
    circle.fill.fore_color.rgb = ACCENT_SOFT
    circle.line.color.rgb = ACCENT
    circle.line.width = Pt(0.75)
    tf = circle.text_frame
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.paragraphs[0].text = ""
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = initials.upper()
    _set_run_style(run, size=int(diameter_in * 18), bold=True, color=ACCENT, font=FONT_DISPLAY)


# ─── Slide builders ─────────────────────────────────────────────────────────

def slide_cover(prs, total):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _white_background(slide)
    _logo_corner(slide)

    _accent_bar(slide, top=Inches(2.0), width_in=0.8)
    _hero(slide, text="Creator Experts.", top_in=2.3, size=88, height=1.5, line_spacing=1.0)
    _hero(
        slide,
        text="A new Expert Domain for Mercor.",
        top_in=4.0, size=24, color=FG_MUTED, height=0.6, line_spacing=1.0,
    )
    _hero(
        slide,
        text="A 90-day pilot. A half-day integration.",
        top_in=4.6, size=16, color=FG_SUBTLE, height=0.5, line_spacing=1.0,
    )

    # Byline block — minimal. Who, what role, how Aaron knows them.
    tf = _add_textbox(slide, left=Inches(0.7), top=Inches(5.9), width=Inches(12), height=Inches(1.0))
    _add_paragraph(
        tf, "For Aaron Langerman, Strategic Ops.",
        size=13, bold=True, color=FG, font=FONT_DISPLAY, first=True, space_after=14,
    )
    _add_paragraph(
        tf, "Logan Mann  +  Aarnav Nagabhirava",
        size=12, bold=True, color=FG, font=FONT_DISPLAY, space_after=2,
    )
    _add_paragraph(
        tf,
        "On Mercor's CUA-envs contract for Anthropic, under Drew Geoly.",
        size=11, color=FG_MUTED, font=FONT_BODY,
    )

    _footer(slide, page=1, total=total)


def slide_why(prs, total):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _white_background(slide)
    _logo_corner(slide)
    _micro_label(slide, text="Why this. Why now.", top_in=0.95)

    _hero(slide, text="Three timers converging.", top_in=1.55, size=38, height=1.0)

    timers = [
        ("01", "Handshake AI takes Mercor's college funnel.",
         "18M students. Cheaper RLHF labor."),
        ("02", "Brand-voice RLHF — nobody owns it yet.",
         "Anthropic / OpenAI demand opens ~6 months out."),
        ("03", "Mercor's own UGC funnel leaks to Meta ads.",
         "$1M+/yr in CAC that creators could absorb."),
    ]
    top = 3.4
    for idx, (num, head, body) in enumerate(timers):
        y = top + idx * 1.05
        num_tf = _add_textbox(slide, left=Inches(0.7), top=Inches(y), width=Inches(0.8), height=Inches(1))
        _add_paragraph(num_tf, num, size=22, bold=True, color=ACCENT, font=FONT_DISPLAY, first=True)
        body_tf = _add_textbox(slide, left=Inches(1.7), top=Inches(y), width=Inches(11), height=Inches(1))
        _add_paragraph(body_tf, head, size=18, bold=True, color=FG, font=FONT_DISPLAY, first=True, space_after=3)
        _add_paragraph(body_tf, body, size=12, color=FG_MUTED, font=FONT_BODY)

    _footer(slide, page=2, total=total)


def slide_proof(prs, total):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _white_background(slide)
    _logo_corner(slide)
    _micro_label(slide, text="Proof + Moat", top_in=0.95)

    _hero(
        slide,
        text="The model is proven. Mercor has the moat.",
        top_in=1.55, size=32, height=1.2,
    )

    col_w = 5.9
    gap = 0.25
    top = 2.95
    height = 2.5

    # LEFT — Cluely
    left_box = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.7), Inches(top), Inches(col_w), Inches(height),
    )
    left_box.adjustments[0] = 0.05
    left_box.fill.solid()
    left_box.fill.fore_color.rgb = BG_ELEV
    left_box.line.color.rgb = BORDER
    left_box.line.width = Pt(0.75)

    left_tf = _add_textbox(
        slide,
        left=Inches(0.95), top=Inches(top + 0.3),
        width=Inches(col_w - 0.5), height=Inches(height - 0.4),
    )
    _add_paragraph(left_tf, "CLUELY", size=10, bold=True, color=FG_MUTED,
                   font=FONT_DISPLAY, spacing=120, first=True, space_after=10)
    _add_paragraph(left_tf, "$500K", size=56, bold=True, color=FG, font=FONT_DISPLAY, space_after=4)
    _add_paragraph(left_tf, "creator bounty — all-time.",
                   size=13, color=FG_MUTED, font=FONT_BODY)

    # RIGHT — Mercor
    right_left = 0.7 + col_w + gap
    right_box = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(right_left), Inches(top), Inches(col_w), Inches(height),
    )
    right_box.adjustments[0] = 0.05
    right_box.fill.solid()
    right_box.fill.fore_color.rgb = ACCENT_SOFT
    right_box.line.color.rgb = ACCENT
    right_box.line.width = Pt(1.0)

    right_tf = _add_textbox(
        slide,
        left=Inches(right_left + 0.25), top=Inches(top + 0.3),
        width=Inches(col_w - 0.5), height=Inches(height - 0.4),
    )
    _add_paragraph(right_tf, "MERCOR", size=10, bold=True, color=ACCENT,
                   font=FONT_DISPLAY, spacing=120, first=True, space_after=10)
    _add_paragraph(right_tf, "$1M / day", size=56, bold=True, color=ACCENT,
                   font=FONT_DISPLAY, space_after=4)
    _add_paragraph(right_tf, "contractor wages — every day.",
                   size=13, color=FG, font=FONT_BODY)

    # Execution proof — single line under the cards
    proof_tf = _add_textbox(slide, left=Inches(0.7), top=Inches(6.0),
                            width=Inches(12), height=Inches(0.7))
    _add_paragraph(
        proof_tf,
        "Proven on UCSB + fraternity networks for real revenue. Mercor scales it.",
        size=12, color=FG_MUTED, font=FONT_BODY, first=True,
    )

    _footer(slide, page=3, total=total)


def slide_plan(prs, total):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _white_background(slide)
    _logo_corner(slide)
    _micro_label(slide, text="The plan + the asks", top_in=0.95)

    _hero(slide, text="Half a day to ship. 90 days to learn.",
          top_in=1.55, size=30, height=1.0)

    # Compact 4-phase strip — name only
    phases = ["Greenlight", "Ship", "Pilot", "Decision"]
    box_w = 2.95
    gap = 0.15
    start = 0.7
    top = 2.85
    for i, name in enumerate(phases):
        left = start + i * (box_w + gap)
        box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(left), Inches(top), Inches(box_w), Inches(0.9),
        )
        box.adjustments[0] = 0.08
        box.fill.solid()
        box.fill.fore_color.rgb = BG_ELEV
        box.line.color.rgb = BORDER
        box.line.width = Pt(0.6)

        tf = box.text_frame
        tf.margin_left = Emu(0)
        tf.margin_right = Emu(0)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf.paragraphs[0].text = ""
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run_step = p.add_run()
        run_step.text = f"{i + 1:02d}  "
        _set_run_style(run_step, size=11, bold=True, color=ACCENT, font=FONT_DISPLAY, spacing=120)
        run_name = p.add_run()
        run_name.text = name
        _set_run_style(run_name, size=16, bold=True, color=FG, font=FONT_DISPLAY)

    # Named connects with PFPs — name + role only
    _micro_label(slide, text="Who Aaron should connect us with", top_in=4.15)

    connects = [
        ("Luna Aizarani",  "GM, Growth",                "LA", PFP_LUNA,
         "Owns Mercor's expert pipeline."),
        ("Jordan Winawer", "GM (ex-Scale AI verticals)", "JW", PFP_JORDAN,
         "Shipped Scale's GenAI vertical."),
        ("Eddie Huang",    "PM, Growth",                "EH", PFP_EDDIE,
         "Builds the growth surface."),
    ]
    base_top = 4.45
    row_h = 0.78
    for i, (name, role, initials, pfp, why) in enumerate(connects):
        y = base_top + i * row_h
        _circle_pfp(slide, image_path=pfp, initials=initials,
                    left_in=0.7, top_in=y, diameter_in=0.6)
        tf = _add_textbox(slide, left=Inches(1.5), top=Inches(y),
                          width=Inches(11.5), height=Inches(0.75))
        _add_paragraph(tf, name, size=13, bold=True, color=FG, font=FONT_DISPLAY,
                       first=True, space_after=1)
        _add_paragraph(tf, role, size=10, color=FG_MUTED, font=FONT_BODY,
                       space_after=1)
        _add_paragraph(tf, why, size=10, color=ACCENT, font=FONT_BODY)

    _footer(slide, page=4, total=total)


def slide_demo(prs, total):
    blank = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank)
    _white_background(slide)
    _logo_corner(slide)
    _micro_label(slide, text="Now → live demo", top_in=0.95)

    _hero(
        slide,
        text="Slides set the case.\nThe demo proves it.",
        top_in=1.55, size=42, height=2.3,
    )

    body_tf = _add_textbox(slide, left=Inches(0.7), top=Inches(4.4),
                           width=Inches(12), height=Inches(1.4))
    lines = [
        "Logan as creator — real 22.7K-follower TikTok inside Mercor's stepper.",
        "Aaron as admin — RAG cites real posts by URL. Persona outreach. Live sim.",
    ]
    first = True
    for body in lines:
        p = body_tf.paragraphs[0] if first else body_tf.add_paragraph()
        p.space_after = Pt(10)
        run = p.add_run()
        run.text = body
        _set_run_style(run, size=15, color=FG, font=FONT_BODY)
        first = False

    url_box = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(0.7), Inches(6.2), Inches(12), Inches(0.65),
    )
    url_box.adjustments[0] = 0.4
    url_box.fill.solid()
    url_box.fill.fore_color.rgb = ACCENT
    url_box.line.fill.background()
    url_tf = url_box.text_frame
    url_tf.margin_left = Emu(0)
    url_tf.margin_right = Emu(0)
    url_tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    url_tf.paragraphs[0].text = ""
    p = url_tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = "Live: musing-maxwell-84ed29.vercel.app"
    _set_run_style(run, size=15, bold=True, color=BG, font=FONT_DISPLAY)

    _footer(slide, page=5, total=total)


# ─── Build ──────────────────────────────────────────────────────────────────

def build_deck(out_path: Path) -> None:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    builders = [slide_cover, slide_why, slide_proof, slide_plan, slide_demo]
    total = len(builders)
    for fn in builders:
        fn(prs, total)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(out_path)
    print(f"saved → {out_path}  ({total} slides)")


if __name__ == "__main__":
    here = Path(__file__).resolve().parent.parent
    out = here / "docs" / "pitch" / "Mercor-Creators-Domain.pptx"
    build_deck(out)
