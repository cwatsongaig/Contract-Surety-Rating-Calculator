"""
Contract Surety Bond Rate Table - Streamlit App

4-tab layout: Rate Lookup, Premium Calculator, Commission, Compare Plans.
Styled to match the Commercial Surety Rating Calculator (navy/red palette,
compact card layout, custom HTML tables).

Designed to be uploaded to GitHub and shared with other users.
"""

import streamlit as st
import base64
import os
import io
import pandas as pd

# Compatibility: st.rerun was experimental before 1.27
_rerun = st.rerun if hasattr(st, 'rerun') else st.experimental_rerun

from rate_data import (
    RATES,
    VARIOUS_RATES,
    COMMISSION_SCALES,
    RATE_CODES,
    COMPANIES,
    STATES,
    CLASSES,
    RATING_PLANS,
    TIER_LABELS,
    SHORT_TIER_LABELS,
)
from rate_engine import (
    calculate_premium,
    find_maintenance_rate,
    apply_additional_maint_years,
)

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Contract Surety Rate Table",
    page_icon="CS",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Design tokens (matches commercial app)
# ---------------------------------------------------------------------------
NAVY = "#1B2A4A"
RED = "#C41230"
GRAY_BG = "#F8F9FA"
GRAY_BORDER = "#E5E7EB"
GRAY_100 = "#F3F4F6"
GRAY_50 = "#F9FAFB"
GRAY_400 = "#9CA3AF"
GRAY_500 = "#6B7280"
GRAY_700 = "#374151"
GREEN = "#059669"
AMBER_BG = "#FFFBEB"
AMBER_BORDER = "#FDE68A"
AMBER_TEXT = "#92400E"

# ---------------------------------------------------------------------------
# GAI Logo (base64 encoded for embedding in HTML)
# ---------------------------------------------------------------------------
_logo_path = os.path.join(os.path.dirname(__file__), "gai-logo.png")
if os.path.exists(_logo_path):
    with open(_logo_path, "rb") as _f:
        GAI_LOGO_B64 = base64.b64encode(_f.read()).decode()
else:
    GAI_LOGO_B64 = ""


# ---------------------------------------------------------------------------
# Rate Card HTML builder (for copy-to-clipboard feature)
# ---------------------------------------------------------------------------
def render_rate_card(title: str, content_html: str, card_id: str = "rate-card"):
    """Render a professional styled rate card with GAI logo for email use."""
    logo_img = ""
    if GAI_LOGO_B64:
        logo_img = (
            f'<img src="data:image/png;base64,{GAI_LOGO_B64}" '
            f'style="height:44px;object-fit:contain;" />'
        )

    card_html = (
        f'<div id="{card_id}" style="background:white;border:1px solid #D1D5DB;'
        f'border-radius:8px;padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,'
        f'Segoe UI,Roboto,sans-serif;font-size:13px;line-height:1.5;color:#1F2937;'
        f'box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:560px;">'
        f'<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;'
        f'padding-bottom:10px;border-bottom:2px solid {NAVY};">'
        f'{logo_img}'
        f'<div>'
        f'<div style="font-size:14px;font-weight:700;color:{NAVY};">Contract Rate Information</div>'
        f'<div style="font-size:11px;color:{GRAY_400};margin-top:1px;">Great American Insurance Group</div>'
        f'</div>'
        f'</div>'
        f'{content_html}'
        f'</div>'
    )

    return card_html


def render_copy_image_component(card_id: str, card_html: str, height: int = 80):
    """Render an HTML component with Copy as Image and the card content."""
    import streamlit.components.v1 as components

    copy_component_html = f'''
    <html>
    <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <style>
            html, body {{ margin: 0; padding: 0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
            .btn-row {{ display: flex; gap: 10px; margin-bottom: 8px; }}
            .copy-btn {{
                padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;
                cursor: pointer; border: none; color: white; background: {NAVY};
                transition: opacity 0.2s;
            }}
            .copy-btn:hover {{ opacity: 0.85; }}
            .status {{
                padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;
                display: none; background: #059669; color: white; border: none;
            }}
        </style>
    </head>
    <body>
        <div id="wrapper-{card_id}">
            <div class="btn-row">
                <button class="copy-btn" onclick="copyAsImage()">Copy as Image</button>
                <span class="status" id="status-{card_id}">Copied!</span>
            </div>
            <div id="card-container-{card_id}">
                {card_html}
            </div>
        </div>
        <script>
            // Auto-resize iframe to fit content
            function resizeFrame() {{
                var wrapper = document.getElementById("wrapper-{card_id}");
                var h = wrapper.scrollHeight + 10;
                window.frameElement.style.height = h + "px";
            }}
            window.addEventListener("load", resizeFrame);
            setTimeout(resizeFrame, 100);
            setTimeout(resizeFrame, 500);

            async function copyAsImage() {{
                var el = document.getElementById("card-container-{card_id}");
                try {{
                    var canvas = await html2canvas(el, {{ backgroundColor: "#ffffff", scale: 2 }});
                    canvas.toBlob(async function(blob) {{
                        await navigator.clipboard.write([
                            new ClipboardItem({{ "image/png": blob }})
                        ]);
                        var status = document.getElementById("status-{card_id}");
                        status.style.display = "inline-block";
                        setTimeout(function() {{ status.style.display = "none"; }}, 2000);
                    }}, "image/png");
                }} catch(err) {{
                    alert("Copy failed. Try Download as Image instead.");
                }}
            }}
        </script>
    </body>
    </html>
    '''
    components.html(copy_component_html, height=height, scrolling=False)


def generate_rate_card_image(content_html: str) -> bytes:
    """Generate a PNG image from rate card HTML content using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    # Load GAI logo if available
    logo_img = None
    if os.path.exists(_logo_path):
        logo_img = Image.open(_logo_path)
        # Resize logo to fit header
        logo_height = 40
        aspect = logo_img.width / logo_img.height
        logo_img = logo_img.resize((int(logo_height * aspect), logo_height), Image.LANCZOS)

    # Create image - we'll make a simple branded card
    width = 900
    padding = 30
    header_height = 60
    # Estimate content height based on lines
    lines = content_html.count('<tr') + 2
    row_height = 22
    content_height = max(lines * row_height + 80, 200)
    height = header_height + content_height + padding * 2

    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)

    # Try to use a system font
    try:
        font = ImageFont.truetype("arial.ttf", 12)
        font_bold = ImageFont.truetype("arialbd.ttf", 12)
        font_small = ImageFont.truetype("arial.ttf", 10)
        font_header = ImageFont.truetype("arialbd.ttf", 11)
    except (IOError, OSError):
        font = ImageFont.load_default()
        font_bold = font
        font_small = font
        font_header = font

    y = padding

    # Paste logo if available
    if logo_img:
        img.paste(logo_img, (padding, y), logo_img if logo_img.mode == 'RGBA' else None)
        y += logo_img.height + 5

    # Draw header text
    draw.text((padding, y), "Contract Rate Information", fill='#6B7280', font=font_small)
    y += 20

    # Draw separator line
    draw.line([(padding, y), (width - padding, y)], fill='#E5E7EB', width=1)
    y += 15

    # Parse simple text from HTML content for the image
    import re
    # Strip HTML tags to get plain text rows
    text = re.sub(r'<[^>]+>', ' ', content_html)
    text = re.sub(r'\s+', ' ', text).strip()
    # Split into chunks for display
    words = text.split()
    line = ""
    for word in words:
        test_line = line + " " + word if line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] > width - padding * 2:
            draw.text((padding, y), line, fill='#374151', font=font)
            y += row_height
            line = word
            if y > height - padding:
                break
        else:
            line = test_line
    if line and y < height - padding:
        draw.text((padding, y), line, fill='#374151', font=font)

    # Save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()

# ---------------------------------------------------------------------------
# Compact CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
    /* Hide Streamlit chrome */
    #MainMenu {visibility: hidden;}
    header[data-testid="stHeader"] {display: none;}
    footer {visibility: hidden;}
    div[data-testid="stDecoration"] {display: none;}
    section[data-testid="stSidebar"] {display: none;}

    .stApp { background-color: #F8F9FA; }

    /* Tight block container */
    .block-container {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        max-width: 100% !important;
    }

    /* Reduce vertical gap between elements */
    div[data-testid="stVerticalBlock"] > div {
        gap: 0.25rem !important;
    }

    /* Input focus rings */
    .stSelectbox > div > div:focus-within,
    .stNumberInput > div > div:focus-within {
        border-color: #C41230 !important;
        box-shadow: 0 0 0 2px rgba(196, 18, 48, 0.15) !important;
    }

    /* Number inputs: monospace */
    .stNumberInput input {
        font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace !important;
    }

    /* Compact metric cards */
    div[data-testid="stMetric"] {
        background-color: white;
        border: 1px solid #E5E7EB;
        border-radius: 6px;
        padding: 0.5rem 0.75rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    div[data-testid="stMetric"] label {
        font-size: 0.65rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        color: #6B7280 !important;
    }
    div[data-testid="stMetric"] div[data-testid="stMetricValue"] {
        font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace !important;
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        color: #1B2A4A !important;
    }

    /* Compact labels */
    .stSelectbox label, .stNumberInput label, .stCheckbox label, .stTextInput label {
        font-size: 0.7rem !important;
        font-weight: 600 !important;
        color: #6B7280 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        margin-bottom: 0 !important;
    }

    /* Tighter dividers */
    hr {
        margin-top: 0.35rem !important;
        margin-bottom: 0.35rem !important;
    }

    /* Compact expander */
    div[data-testid="stExpander"] {
        border: 1px solid #E5E7EB !important;
        border-radius: 8px !important;
        background: white !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
    }
    div[data-testid="stExpander"] summary {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        color: #1B2A4A !important;
        padding: 0.5rem 0.75rem !important;
    }

    /* Tab styling */
    button[data-baseweb="tab"] {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Header bar
# ---------------------------------------------------------------------------
num_rates = len(RATES)
num_companies = len(COMPANIES)
num_states = len(STATES)
num_classes = len(CLASSES)

header_html = (
    f'<div style="background:white;border-bottom:1px solid {GRAY_BORDER};'
    f'margin:-1rem -1rem 0 -1rem;width:calc(100% + 2rem);">'
    f'<div style="display:flex;align-items:center;justify-content:space-between;'
    f'height:44px;padding:0 1.5rem;">'
    f'<div style="display:flex;align-items:center;gap:10px;">'
    f'<div style="width:28px;height:28px;background:{NAVY};border-radius:5px;'
    f'display:flex;align-items:center;justify-content:center;color:white;'
    f'font-weight:700;font-size:12px;">CS</div>'
    f'<span style="color:#D1D5DB;font-size:0.8rem;font-weight:300;">|</span>'
    f'<span style="font-size:0.8rem;font-weight:600;color:{NAVY};'
    f'letter-spacing:0.025em;">Contract Surety Rate Table</span>'
    f'</div>'
    f'<span style="font-size:0.8rem;color:{GRAY_400};">'
    f'{num_rates} rates &middot; {num_companies} companies &middot; '
    f'{num_states} states &middot; {num_classes} classes</span>'
    f'</div>'
    f'<div style="height:2px;background:{RED};"></div>'
    f'</div>'
)
st.markdown(header_html, unsafe_allow_html=True)
st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)


# ===========================================================================
# Helper: cascading filter logic
# ===========================================================================
def get_filtered_options(rates, company, state, bond_class, rating_plan):
    """Return available options for each filter given current selections."""
    def matches(r, exclude_field):
        return (
            (exclude_field == "company" or not company or r["company"] == company)
            and (exclude_field == "state" or not state or r["state"] == state)
            and (exclude_field == "class" or not bond_class or r["bond_class"] == bond_class)
            and (exclude_field == "plan" or not rating_plan or r["rating_plan"] == rating_plan)
        )

    companies = sorted(set(r["company"] for r in rates if matches(r, "company")))
    states = sorted(set(r["state"] for r in rates if matches(r, "state")))
    classes = sorted(set(r["bond_class"] for r in rates if matches(r, "class")))
    plans = sorted(set(r["rating_plan"] for r in rates if matches(r, "plan")))
    return companies, states, classes, plans


def format_currency(value):
    """Format a number as currency."""
    return f"${value:,.2f}"


def format_rate(value):
    """Format a rate value."""
    if value is None:
        return "N/A"
    return f"{value:.2f}"


def format_percent(value):
    """Format a decimal as percentage."""
    return f"{value * 100:.1f}%"


# ===========================================================================
# Dialog functions for Rate Card popups
# ===========================================================================
@st.dialog("Rate Card", width="large")
def show_rate_lookup_card():
    """Show rate card dialog for selected rates."""
    selected = st.session_state.get("lu_selected_rates", [])
    if not selected:
        st.warning("No rates selected.")
        return

    # Build professional vertical card content
    card_blocks = ""
    for idx, r in enumerate(selected):
        if idx > 0:
            card_blocks += f'<div style="border-top:1px solid {GRAY_BORDER};margin:14px 0;"></div>'

        # Rate header
        card_blocks += (
            f'<div style="margin-bottom:8px;">'
            f'<div style="font-size:14px;font-weight:700;color:{NAVY};margin-bottom:2px;">'
            f'{r["company"]}</div>'
            f'<div style="font-size:13px;color:{GRAY_700};">'
            f'{r["state"]} &nbsp;&bull;&nbsp; {r["bond_class"]} &nbsp;&bull;&nbsp; '
            f'<span style="font-weight:600;">{r["rating_plan"]}</span></div>'
            f'</div>'
        )

        # Rate tiers
        card_blocks += '<div style="margin-left:2px;">'
        for j, sl in enumerate(SHORT_TIER_LABELS):
            val = format_rate(r["tiers"][j]) if r["tiers"][j] is not None else "N/A"
            bg = "#F9FAFB" if j % 2 == 0 else "white"
            card_blocks += (
                f'<div style="display:flex;justify-content:space-between;padding:5px 8px;'
                f'background:{bg};border-radius:3px;">'
                f'<span style="color:{GRAY_500};font-size:13px;">{sl}</span>'
                f'<span style="font-size:13px;font-weight:600;">{val}</span>'
                f'</div>'
            )
        # D/C line
        dc_val = f"{r['debit_credit'] * 100:.0f}%" if r["debit_credit"] is not None else "-"
        card_blocks += (
            f'<div style="display:flex;justify-content:space-between;padding:5px 8px;'
            f'margin-top:2px;border-top:1px solid {GRAY_BORDER};">'
            f'<span style="color:{GRAY_500};font-size:13px;">Debit/Credit</span>'
            f'<span style="font-size:13px;font-weight:600;">{dc_val}</span>'
            f'</div>'
        )
        card_blocks += '</div>'

    # Render card - calculate tight height based on content
    card_html = render_rate_card("Rate Card", card_blocks, "lu-card")
    num_rows = len(selected)
    # Logo header ~70px + per rate block ~(header 40px + 7 tier rows * 26px + separator 14px) + button 40px
    card_height = 70 + (num_rows * (40 + 7 * 26 + 14)) + 40
    render_copy_image_component("lu-card", card_html, height=card_height)

    # Download as image (secondary option)
    img_bytes = generate_rate_card_image(card_blocks)
    st.download_button(
        label="Download as Image",
        data=img_bytes,
        file_name="rate_card.png",
        mime="image/png",
    )


@st.dialog("Premium Rate Card", width="large")
def show_premium_card():
    """Show rate card dialog for premium breakdown."""
    data = st.session_state.get("premium_card_data", {})
    if not data:
        st.warning("No premium data available.")
        return

    card_content = data.get("html", "")
    card_html = render_rate_card("Premium Rate Card", card_content, "prem-card")
    # Header 70px + info 50px + table header 30px + ~6 rows * 28px + totals 80px + button 40px
    render_copy_image_component("prem-card", card_html, height=440)

    img_bytes = generate_rate_card_image(card_content)
    st.download_button(
        label="Download as Image",
        data=img_bytes,
        file_name="premium_rate_card.png",
        mime="image/png",
    )


@st.dialog("Plan Comparison Rate Card", width="large")
def show_compare_card():
    """Show rate card dialog for plan comparison."""
    data = st.session_state.get("compare_card_data", {})
    if not data:
        st.warning("No comparison data available.")
        return

    card_content = data.get("html", "")
    card_html = render_rate_card("Plan Comparison", card_content, "cmp-card")
    # Header 70px + info 40px + plan header 36px + 6 rows * 28px + total 40px + button 40px
    render_copy_image_component("cmp-card", card_html, height=400)

    img_bytes = generate_rate_card_image(card_content)
    st.download_button(
        label="Download as Image",
        data=img_bytes,
        file_name="plan_comparison_card.png",
        mime="image/png",
    )


# ===========================================================================
# Tabs
# ===========================================================================
tab_lookup, tab_premium, tab_commission, tab_compare = st.tabs(
    ["Rate Lookup", "Premium Calculator", "Commission", "Compare Plans"]
)


# ===========================================================================
# TAB 1: Rate Lookup
# ===========================================================================
with tab_lookup:
    st.markdown(
        f'<div style="font-size:0.8rem;font-weight:600;color:{NAVY};'
        f'margin-bottom:0.15rem;padding-left:0.25rem;">Filter Rates</div>',
        unsafe_allow_html=True,
    )

    lc1, lc2, lc3, lc4 = st.columns(4)
    with lc1:
        lu_company = st.selectbox(
            "Company", options=[""] + COMPANIES,
            index=(COMPANIES.index("Great American Insurance") + 1) if "Great American Insurance" in COMPANIES else 0,
            format_func=lambda x: "All Companies" if x == "" else x,
            key="lu_company",
        )
    with lc2:
        lu_state = st.selectbox(
            "State", options=[""] + STATES,
            format_func=lambda x: "All States" if x == "" else x,
            key="lu_state",
        )
    with lc3:
        lu_class = st.selectbox(
            "Class", options=[""] + CLASSES,
            format_func=lambda x: "All Classes" if x == "" else x,
            key="lu_class",
        )
    with lc4:
        lu_plan = st.selectbox(
            "Rating Plan", options=[""] + RATING_PLANS,
            format_func=lambda x: "All Plans" if x == "" else x,
            key="lu_plan",
        )

    # Filter rates
    filtered_rates = [
        r for r in RATES
        if (not lu_company or r["company"] == lu_company)
        and (not lu_state or r["state"] == lu_state)
        and (not lu_class or r["bond_class"] == lu_class)
        and (not lu_plan or r["rating_plan"] == lu_plan)
    ]

    st.markdown(
        f'<div style="font-size:0.8rem;color:{GRAY_400};padding-left:0.25rem;'
        f'margin-bottom:0.25rem;">{len(filtered_rates)} rate'
        f'{"s" if len(filtered_rates) != 1 else ""}</div>',
        unsafe_allow_html=True,
    )

    if filtered_rates:
        # Show Rate Card button at top if rows were previously selected
        if st.session_state.get("lu_selected_rates"):
            num_selected = len(st.session_state["lu_selected_rates"])
            if st.button(f"📋 Rate Card ({num_selected} selected)", key="lu_rate_card_btn"):
                show_rate_lookup_card()

        display_rates = filtered_rates[:500]

        # Build dataframe only if filters changed (use session state to cache)
        filter_key = (lu_company, lu_state, lu_class, lu_plan)
        if st.session_state.get("_lu_filter_key") != filter_key:
            df_rows = []
            for r in display_rates:
                is_na = all(t is None for t in r["tiers"])
                row_data = {
                    "Company": r["company"],
                    "State": r["state"],
                    "Class": r["bond_class"],
                    "Rating Plan": r["rating_plan"],
                }
                for j, sl in enumerate(SHORT_TIER_LABELS):
                    if is_na and j == 0:
                        row_data[sl] = "N/A"
                    elif is_na:
                        row_data[sl] = ""
                    else:
                        row_data[sl] = format_rate(r["tiers"][j]) if r["tiers"][j] is not None else "N/A"
                row_data["D/C"] = f"{r['debit_credit'] * 100:.0f}%" if r["debit_credit"] is not None else "-"
                row_data["Max Term"] = r["max_term"] or "-"
                df_rows.append(row_data)
            st.session_state["_lu_df"] = pd.DataFrame(df_rows)
            st.session_state["_lu_filter_key"] = filter_key

        df = st.session_state["_lu_df"]

        # Use st.dataframe with selection
        event = st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
            on_select="rerun",
            selection_mode="multi-row",
            key="lu_rate_table",
        )

        # Get selected rows and store for next rerun
        selected_rows = event.selection.rows if event and event.selection else []

        if selected_rows:
            selected_rate_data = [display_rates[i] for i in selected_rows if i < len(display_rates)]
            st.session_state["lu_selected_rates"] = selected_rate_data
        else:
            st.session_state["lu_selected_rates"] = []

        if len(filtered_rates) > 500:
            st.markdown(
                f'<div style="font-size:0.8rem;color:{AMBER_TEXT};background:{AMBER_BG};'
                f'border:1px solid {AMBER_BORDER};border-radius:6px;padding:0.4rem 0.6rem;'
                f'margin-top:0.5rem;">Showing first 500 of {len(filtered_rates)} rates. '
                f'Use filters to narrow results.</div>',
                unsafe_allow_html=True,
            )

    else:
        st.markdown(
            f'<div style="text-align:center;padding:3rem;color:{GRAY_400};">'
            f'No rates match your filters. Try adjusting your selections above.</div>',
            unsafe_allow_html=True,
        )


# ===========================================================================
# TAB 2: Premium Calculator
# ===========================================================================
with tab_premium:
    # --- Rate Selection ---
    st.markdown(
        f'<div style="font-size:0.8rem;font-weight:600;color:{NAVY};'
        f'margin-bottom:0.15rem;padding-left:0.25rem;">Select Rate</div>',
        unsafe_allow_html=True,
    )

    pc1, pc2, pc3, pc4 = st.columns(4)
    with pc1:
        pc_company = st.selectbox(
            "Company", options=COMPANIES,
            index=COMPANIES.index("Great American Insurance") if "Great American Insurance" in COMPANIES else 0,
            key="pc_company",
        )
    with pc2:
        # Get available states for selected company
        pc_avail_states = sorted(set(
            r["state"] for r in RATES if r["company"] == pc_company
        ))
        pc_state = st.selectbox("State", options=pc_avail_states, key="pc_state")

    with pc3:
        pc_avail_classes = sorted(set(
            r["bond_class"] for r in RATES
            if r["company"] == pc_company and r["state"] == pc_state
        ))
        pc_class = st.selectbox("Class", options=pc_avail_classes, key="pc_class")

    with pc4:
        pc_avail_plans = sorted(set(
            r["rating_plan"] for r in RATES
            if r["company"] == pc_company and r["state"] == pc_state
            and r["bond_class"] == pc_class
        ))
        pc_plan = st.selectbox("Rating Plan", options=pc_avail_plans, key="pc_plan")

    # Find matching rate
    matching_rate = None
    for r in RATES:
        if (r["company"] == pc_company and r["state"] == pc_state
                and r["bond_class"] == pc_class and r["rating_plan"] == pc_plan):
            matching_rate = r
            break

    rate_is_na = matching_rate is not None and all(t is None for t in matching_rate["tiers"])

    if rate_is_na:
        st.markdown(
            f'<div style="background:#FEF2F2;border:1px solid #FECACA;padding:0.75rem;'
            f'border-radius:6px;color:#991B1B;font-size:0.8rem;font-weight:500;">'
            f'This rating plan is <strong>Not Available</strong> for the selected combination.</div>',
            unsafe_allow_html=True,
        )

    if matching_rate and not rate_is_na:
        # --- Contract Details (single compact row) ---
        cd1, cd2, cd3, cd4, cd5, cd6 = st.columns([1.2, 1, 1, 0.8, 0.8, 0.8])
        with cd1:
            # Bond amount with comma formatting
            def _format_contract_amount():
                raw = st.session_state.get("pc_contract_amt", "")
                digits = raw.replace("$", "").replace(",", "").replace(" ", "").strip()
                cleaned = ""
                dot_seen = False
                for ch in digits:
                    if ch.isdigit():
                        cleaned += ch
                    elif ch == "." and not dot_seen:
                        cleaned += ch
                        dot_seen = True
                if not cleaned or cleaned == ".":
                    return
                try:
                    val = float(cleaned)
                except ValueError:
                    return
                val = min(val, 999_999_999.0)
                if "." in cleaned:
                    int_part, dec_part = cleaned.split(".", 1)
                    int_val = int(int_part) if int_part else 0
                    st.session_state["pc_contract_amt"] = f"{int_val:,}.{dec_part}"
                else:
                    st.session_state["pc_contract_amt"] = f"{int(val):,}"

            contract_amt_raw = st.text_input(
                "Contract Amount",
                placeholder="10,000,000",
                help="Enter contract amount - commas added automatically",
                key="pc_contract_amt",
                on_change=_format_contract_amount,
            )
            _cleaned = contract_amt_raw.replace("$", "").replace(",", "").replace(" ", "").strip()
            try:
                contract_amount = max(0.0, min(float(_cleaned), 999_999_999.0))
            except (ValueError, TypeError):
                contract_amount = 0.0

        with cd2:
            max_dc = matching_rate.get("debit_credit")
            if max_dc is not None:
                max_dc_int = int(abs(max_dc) * 100)
                dc_label = f"D/C % (+/-{max_dc_int}%)"
            else:
                dc_label = "D/C %"
                max_dc_int = 0
            dc_input = st.number_input(
                dc_label,
                min_value=-max_dc_int if max_dc is not None else 0,
                max_value=max_dc_int if max_dc is not None else 0,
                value=0,
                step=1,
                key="pc_dc",
                disabled=max_dc is None,
            )
            debit_credit_pct = dc_input / 100.0

        with cd3:
            scale_names = [s["name"] for s in COMMISSION_SCALES]
            default_idx = scale_names.index("GAIG Standard") if "GAIG Standard" in scale_names else 0
            scale_name = st.selectbox(
                "Commission Scale", options=scale_names, index=default_idx, key="pc_scale",
            )
            selected_scale = next(s for s in COMMISSION_SCALES if s["name"] == scale_name)

        with cd4:
            time_surcharge_months = st.number_input(
                "Time Surchg. Mo.",
                min_value=0, max_value=60, value=0, step=1, key="pc_ts_months",
            )

        with cd5:
            if pc_class != "Maintenance":
                include_maint = st.checkbox(
                    "Incl. Maint.", value=False, key="pc_include_maint",
                )
            else:
                include_maint = False

        with cd6:
            if include_maint or pc_class == "Maintenance":
                additional_maint_years = st.number_input(
                    "Addl. Maint. Yrs",
                    min_value=0, max_value=20, value=0, step=1, key="pc_maint_years",
                )
            else:
                additional_maint_years = 0

        # --- Calculate ---
        if contract_amount > 0:
            # Main rate (apply maint years if class is Maintenance)
            calc_rate = matching_rate
            if pc_class == "Maintenance":
                calc_rate = apply_additional_maint_years(matching_rate, additional_maint_years)

            result = calculate_premium(
                calc_rate, contract_amount, debit_credit_pct,
                selected_scale, time_surcharge_months,
            )

            # Maintenance calculation
            maint_result = None
            if include_maint and pc_class != "Maintenance":
                maint_rate = find_maintenance_rate(RATES, pc_company, pc_state, pc_plan)
                if maint_rate and not all(t is None for t in maint_rate["tiers"]):
                    adj_maint = apply_additional_maint_years(maint_rate, additional_maint_years)
                    maint_result = calculate_premium(adj_maint, contract_amount, debit_credit_pct)

            total_premium = result.total_premium + (maint_result.total_premium if maint_result else 0.0)

            # --- Warnings (above breakdown so they're visible) ---
            if include_maint and not maint_result and pc_class != "Maintenance":
                st.markdown(
                    f'<div style="background:{AMBER_BG};border:1px solid {AMBER_BORDER};'
                    f'border-radius:6px;padding:0.4rem 0.6rem;margin:0.25rem 0;'
                    f'font-size:0.8rem;color:{AMBER_TEXT};font-weight:500;">'
                    f'No maintenance rate available for {pc_company} / {pc_state} / {pc_plan}. '
                    f'Try a different Rating Plan (Bureau/Standard/Manual, Reduced, or Merit '
                    f'have broader coverage).</div>',
                    unsafe_allow_html=True,
                )

            if matching_rate.get("notes") and "SPECIAL PERMISSION" in matching_rate["notes"]:
                st.markdown(
                    f'<div style="background:{AMBER_BG};border:1px solid {AMBER_BORDER};'
                    f'border-radius:6px;padding:0.4rem 0.6rem;margin:0.25rem 0;'
                    f'font-size:0.8rem;color:{AMBER_TEXT};font-weight:500;">'
                    f'{matching_rate["notes"]}</div>',
                    unsafe_allow_html=True,
                )

            # --- Compact KPI bar + Breakdown Table ---
            has_time_surcharge = any(t.time_surcharge > 0 for t in result.tiers)
            has_maint = maint_result is not None

            # Header
            bk_header = (
                f'<th style="text-align:left;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Contract Range</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Amount</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Price/M</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Debit/Credit</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Adj. Price/M</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Contract Premium</th>'
            )
            if has_time_surcharge:
                bk_header += (
                    f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                    f'color:{GRAY_700};font-size:0.8rem;">Time Surcharge</th>'
                )
            if has_maint:
                bk_header += (
                    f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                    f'color:{GRAY_700};font-size:0.8rem;">Maint. Rate/M</th>'
                    f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                    f'color:{GRAY_700};font-size:0.8rem;">Maint. Premium</th>'
                )
            bk_header += (
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Comm. %</th>'
                f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Comm. $</th>'
            )

            # Body rows
            bk_body = ""
            for i, tier in enumerate(result.tiers):
                opacity = "opacity:0.4;" if tier.amount == 0 else ""
                mt = maint_result.tiers[i] if has_maint else None

                row = (
                    f'<td style="padding:0.3rem 0.5rem;{opacity}">'
                    f'<span style="font-weight:500;color:{GRAY_700};margin-right:0.5rem;">'
                    f'{tier.label}</span>'
                    f'<span style="color:{GRAY_400};font-size:0.8rem;">'
                    f'{tier.range_label}</span></td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_currency(tier.amount)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_rate(tier.rate_per_m)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_percent(tier.debit_credit_pct)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_rate(tier.adj_rate_per_m)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'font-weight:600;{opacity}">{format_currency(tier.premium)}</td>'
                )
                if has_time_surcharge:
                    row += (
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'{opacity}">{format_currency(tier.time_surcharge)}</td>'
                    )
                if has_maint and mt:
                    row += (
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'{opacity}">{format_rate(mt.rate_per_m)}</td>'
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'font-weight:600;{opacity}">{format_currency(mt.premium)}</td>'
                    )
                elif has_maint:
                    row += (
                        f'<td style="padding:0.3rem 0.5rem;"></td>'
                        f'<td style="padding:0.3rem 0.5rem;"></td>'
                    )
                row += (
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_percent(tier.commission_pct)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'{opacity}">{format_currency(tier.commission_amt)}</td>'
                )
                bk_body += f'<tr style="border-bottom:1px solid {GRAY_100};">{row}</tr>'

            # Footer
            total_ts = sum(t.time_surcharge for t in result.tiers)
            ts_extra_cols = 1 if has_time_surcharge else 0
            maint_extra_cols = 2 if has_maint else 0

            if has_maint:
                # Contract subtotal row
                bk_foot = (
                    f'<tr style="background:{GRAY_50};border-top:1px solid {GRAY_BORDER};">'
                    f'<td style="padding:0.3rem 0.5rem;font-weight:600;" colspan="2">Contract Subtotal</td>'
                    f'<td colspan="3"></td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'font-weight:600;color:{NAVY};">'
                    f'{format_currency(result.total_premium - total_ts)}</td>'
                )
                if has_time_surcharge:
                    bk_foot += (
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'font-weight:600;color:{NAVY};">{format_currency(total_ts)}</td>'
                    )
                bk_foot += f'<td colspan="2"></td>'
                bk_foot += (
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'color:{NAVY};">{format_percent(result.blended_commission_pct)}</td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'color:{NAVY};">{format_currency(result.total_commission)}</td>'
                    f'</tr>'
                )

                # Maintenance subtotal row
                bk_foot += (
                    f'<tr style="background:{GRAY_50};">'
                    f'<td style="padding:0.3rem 0.5rem;font-weight:600;" colspan="2">Maintenance Subtotal</td>'
                    f'<td colspan="{3 + ts_extra_cols}"></td>'
                    f'<td></td><td></td>'
                    f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                    f'font-weight:600;color:{NAVY};">'
                    f'{format_currency(maint_result.total_premium)}</td>'
                    f'<td colspan="2"></td>'
                    f'</tr>'
                )

                # Total row
                bk_foot += (
                    f'<tr style="background:rgba(27,42,74,0.05);border-top:2px solid rgba(27,42,74,0.2);">'
                    f'<td style="padding:0.5rem;font-weight:700;color:{NAVY};" '
                    f'colspan="{5 + ts_extra_cols}">Total Premium</td>'
                    f'<td style="padding:0.5rem;text-align:right;'
                    f'font-weight:700;color:{NAVY};font-size:1rem;" colspan="{1 + maint_extra_cols}">'
                    f'{format_currency(total_premium)}</td>'
                    f'<td colspan="2"></td>'
                    f'</tr>'
                )
            else:
                # Simple subtotal row
                bk_foot = (
                    f'<tr style="background:{GRAY_50};font-weight:600;border-top:1px solid {GRAY_BORDER};">'
                    f'<td style="padding:0.5rem;" colspan="2">Subtotal</td>'
                    f'<td colspan="3"></td>'
                    f'<td style="padding:0.5rem;text-align:right;'
                    f'color:{NAVY};font-size:1rem;">'
                    f'{format_currency(result.total_premium - total_ts)}</td>'
                )
                if has_time_surcharge:
                    bk_foot += (
                        f'<td style="padding:0.5rem;text-align:right;'
                        f'color:{NAVY};font-size:1rem;">{format_currency(total_ts)}</td>'
                    )
                bk_foot += (
                    f'<td style="padding:0.5rem;text-align:right;'
                    f'color:{NAVY};">{format_percent(result.blended_commission_pct)}</td>'
                    f'<td style="padding:0.5rem;text-align:right;'
                    f'color:{NAVY};">{format_currency(result.total_commission)}</td>'
                    f'</tr>'
                )

            # KPI summary bar
            kpi_parts = f'Contract: {format_currency(result.total_premium)}'
            if maint_result:
                kpi_parts += f' + Maint: {format_currency(maint_result.total_premium)}'
            kpi_total = format_currency(total_premium)

            breakdown_html = (
                f'<div style="background:white;border:1px solid {GRAY_BORDER};border-radius:6px;'
                f'overflow:auto;box-shadow:0 1px 2px rgba(0,0,0,0.04);">'
                f'<div style="background:{GRAY_50};padding:0.35rem 0.5rem;border-bottom:1px solid '
                f'{GRAY_BORDER};display:flex;justify-content:space-between;align-items:center;">'
                f'<span style="font-size:0.8rem;font-weight:600;color:{NAVY};">Premium Breakdown</span>'
                f'<span style="font-size:0.8rem;color:{GRAY_500};">'
                f'{kpi_parts + " = " if maint_result else ""}'
                f'<span style="font-weight:700;color:{NAVY};font-size:0.8rem;">'
                f'{kpi_total}</span></span>'
                f'</div>'
                f'<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'
                f'<thead><tr style="background:{GRAY_50};border-bottom:1px solid {GRAY_BORDER};">'
                f'{bk_header}</tr></thead>'
                f'<tbody>{bk_body}</tbody>'
                f'<tfoot>{bk_foot}</tfoot>'
                f'</table></div>'
            )
            
            # --- Copy Rate Card for Premium (at top) ---
            # Build professional premium card with proper columns
            prem_card = (
                f'<div style="margin-bottom:10px;">'
                f'<div style="font-size:15px;font-weight:700;color:{NAVY};margin-bottom:3px;">'
                f'{pc_company}</div>'
                f'<div style="font-size:13px;color:{GRAY_700};">'
                f'{pc_state} &nbsp;&bull;&nbsp; {pc_class} &nbsp;&bull;&nbsp; '
                f'<span style="font-weight:600;">{pc_plan}</span></div>'
                f'</div>'
                f'<div style="display:flex;gap:16px;margin-bottom:12px;padding-bottom:10px;'
                f'border-bottom:1px solid {GRAY_BORDER};font-size:13px;color:{GRAY_500};">'
                f'<span>Amount: <b style="color:{GRAY_700};">{format_currency(contract_amount)}</b></span>'
                f'<span>D/C: <b style="color:{GRAY_700};">{dc_input}%</b></span>'
                f'<span>Scale: <b style="color:{GRAY_700};">{scale_name}</b></span>'
                f'</div>'
            )

            # Table header
            prem_card += (
                f'<table style="width:100%;border-collapse:collapse;font-size:12px;">'
                f'<thead><tr style="border-bottom:1px solid {GRAY_BORDER};">'
                f'<th style="text-align:left;padding:4px 6px;font-weight:600;color:{GRAY_700};">Range</th>'
                f'<th style="text-align:right;padding:4px 6px;font-weight:600;color:{GRAY_700};">Rate/M</th>'
                f'<th style="text-align:right;padding:4px 6px;font-weight:600;color:{GRAY_700};">Premium</th>'
                f'<th style="text-align:right;padding:4px 6px;font-weight:600;color:{GRAY_700};">Comm %</th>'
                f'<th style="text-align:right;padding:4px 6px;font-weight:600;color:{GRAY_700};">Comm $</th>'
                f'</tr></thead><tbody>'
            )

            # Tier rows with range_label
            for j, tier in enumerate(result.tiers):
                if tier.amount == 0:
                    continue
                bg = "#F9FAFB" if j % 2 == 0 else "white"
                prem_card += (
                    f'<tr style="background:{bg};">'
                    f'<td style="padding:5px 6px;"><span style="font-weight:500;">{tier.label}</span> '
                    f'<span style="color:{GRAY_400};font-size:11px;">{tier.range_label}</span></td>'
                    f'<td style="text-align:right;padding:5px 6px;">{format_rate(tier.adj_rate_per_m)}</td>'
                    f'<td style="text-align:right;padding:5px 6px;font-weight:600;">{format_currency(tier.premium)}</td>'
                    f'<td style="text-align:right;padding:5px 6px;">{format_percent(tier.commission_pct)}</td>'
                    f'<td style="text-align:right;padding:5px 6px;">{format_currency(tier.commission_amt)}</td>'
                    f'</tr>'
                )

            prem_card += f'</tbody></table>'

            # Totals section
            prem_card += (
                f'<div style="margin-top:10px;padding-top:8px;border-top:2px solid {NAVY};">'
                f'<div style="display:flex;justify-content:space-between;font-size:14px;'
                f'font-weight:700;color:{NAVY};">'
                f'<span>Total Premium</span>'
                f'<span>{format_currency(result.total_premium)}</span>'
                f'</div>'
            )
            if maint_result:
                prem_card += (
                    f'<div style="display:flex;justify-content:space-between;padding-top:4px;'
                    f'font-size:13px;">'
                    f'<span>Maintenance Premium</span>'
                    f'<span style="font-weight:600;">{format_currency(maint_result.total_premium)}</span>'
                    f'</div>'
                    f'<div style="display:flex;justify-content:space-between;font-size:14px;'
                    f'font-weight:700;color:{NAVY};padding-top:6px;margin-top:6px;'
                    f'border-top:2px solid {NAVY};">'
                    f'<span>Combined Total</span>'
                    f'<span>{format_currency(total_premium)}</span>'
                    f'</div>'
                )
            # Commission summary
            prem_card += (
                f'<div style="display:flex;justify-content:space-between;padding-top:4px;'
                f'font-size:12px;color:{GRAY_400};">'
                f'<span>Blended Commission ({format_percent(result.blended_commission_pct)})</span>'
                f'<span>{format_currency(result.total_commission)}</span>'
                f'</div>'
            )
            prem_card += f'</div>'

            st.session_state["premium_card_data"] = {"html": prem_card}

            if st.button("📋 Rate Card", key="pc_rate_card_btn"):
                show_premium_card()

            st.markdown(breakdown_html, unsafe_allow_html=True)


# ===========================================================================
# TAB 3: Commission
# ===========================================================================
with tab_commission:
    st.markdown(
        f'<div style="font-size:0.8rem;font-weight:600;color:{NAVY};'
        f'margin-bottom:0.25rem;padding-left:0.25rem;">All Commission Scales</div>',
        unsafe_allow_html=True,
    )

    # Header
    comm_header = (
        f'<th style="text-align:left;padding:0.35rem 0.5rem;font-weight:600;'
        f'color:{GRAY_700};font-size:0.8rem;">Scale</th>'
    )
    for tl in TIER_LABELS:
        comm_header += (
            f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
            f'color:{GRAY_700};font-size:0.8rem;">{tl}</th>'
        )

    # Body
    comm_body = ""
    for s in COMMISSION_SCALES:
        row = f'<td style="padding:0.3rem 0.5rem;font-weight:500;">{s["name"]}</td>'
        for t in s["tiers"]:
            row += (
                f'<td style="padding:0.3rem 0.5rem;text-align:right;">'
                f'{format_percent(t)}</td>'
            )
        comm_body += f'<tr style="border-bottom:1px solid {GRAY_100};">{row}</tr>'

    comm_html = (
        f'<div style="background:white;border:1px solid {GRAY_BORDER};border-radius:6px;'
        f'overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">'
        f'<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'
        f'<thead><tr style="background:{GRAY_50};border-bottom:1px solid {GRAY_BORDER};">'
        f'{comm_header}</tr></thead>'
        f'<tbody>{comm_body}</tbody>'
        f'</table></div>'
    )
    st.markdown(comm_html, unsafe_allow_html=True)


# ===========================================================================
# TAB 4: Compare Plans
# ===========================================================================
with tab_compare:
    st.markdown(
        f'<div style="font-size:0.8rem;font-weight:600;color:{NAVY};'
        f'margin-bottom:0.15rem;padding-left:0.25rem;">Compare Plans</div>',
        unsafe_allow_html=True,
    )

    cc1, cc2, cc3, cc4 = st.columns(4)
    with cc1:
        cp_company = st.selectbox(
            "Company", options=COMPANIES,
            index=COMPANIES.index("Great American Insurance") if "Great American Insurance" in COMPANIES else 0,
            key="cp_company",
        )
    with cc2:
        cp_avail_states = sorted(set(
            r["state"] for r in RATES if r["company"] == cp_company
        ))
        cp_state = st.selectbox("State", options=cp_avail_states, key="cp_state")
    with cc3:
        cp_avail_classes = sorted(set(
            r["bond_class"] for r in RATES
            if r["company"] == cp_company and r["state"] == cp_state
        ))
        cp_class = st.selectbox("Class", options=cp_avail_classes, key="cp_class")
    with cc4:
        # Contract amount for comparison
        def _format_cp_amount():
            raw = st.session_state.get("cp_contract_amt", "")
            digits = raw.replace("$", "").replace(",", "").replace(" ", "").strip()
            cleaned = ""
            dot_seen = False
            for ch in digits:
                if ch.isdigit():
                    cleaned += ch
                elif ch == "." and not dot_seen:
                    cleaned += ch
                    dot_seen = True
            if not cleaned or cleaned == ".":
                return
            try:
                val = float(cleaned)
            except ValueError:
                return
            val = min(val, 999_999_999.0)
            if "." in cleaned:
                int_part, dec_part = cleaned.split(".", 1)
                int_val = int(int_part) if int_part else 0
                st.session_state["cp_contract_amt"] = f"{int_val:,}.{dec_part}"
            else:
                st.session_state["cp_contract_amt"] = f"{int(val):,}"

        cp_amt_raw = st.text_input(
            "Contract Amount",
            placeholder="10,000,000",
            key="cp_contract_amt",
            on_change=_format_cp_amount,
        )
        _cp_cleaned = cp_amt_raw.replace("$", "").replace(",", "").replace(" ", "").strip()
        try:
            cp_amount = max(0.0, min(float(_cp_cleaned), 999_999_999.0))
        except (ValueError, TypeError):
            cp_amount = 0.0

    # Available plans for selected combo
    cp_avail_rates = [
        r for r in RATES
        if r["company"] == cp_company and r["state"] == cp_state
        and r["bond_class"] == cp_class
        and not all(t is None for t in r["tiers"])
    ]
    cp_avail_plans = sorted(set(r["rating_plan"] for r in cp_avail_rates))

    if cp_avail_plans:
        st.markdown(
            f'<div style="font-size:0.8rem;font-weight:600;color:{GRAY_500};'
            f'text-transform:uppercase;letter-spacing:0.03em;margin:0.5rem 0 0.25rem 0.25rem;">'
            f'Select Plans to Compare (up to 4)</div>',
            unsafe_allow_html=True,
        )

        # Plan toggle buttons (clickable chips instead of dropdown)
        if "cp_selected_plans" not in st.session_state:
            st.session_state["cp_selected_plans"] = []

        # Render clickable plan buttons
        if len(cp_avail_plans) > 0:
            plan_cols = st.columns(min(len(cp_avail_plans), 8))
            for idx, plan in enumerate(cp_avail_plans):
                with plan_cols[idx % len(plan_cols)]:
                    is_selected = plan in st.session_state["cp_selected_plans"]
                    if st.button(
                        f"{'✓ ' if is_selected else ''}{plan}",
                        key=f"cp_plan_btn_{plan}",
                        use_container_width=True,
                    ):
                        if plan in st.session_state["cp_selected_plans"]:
                            st.session_state["cp_selected_plans"].remove(plan)
                        elif len(st.session_state["cp_selected_plans"]) < 4:
                            st.session_state["cp_selected_plans"].append(plan)
                        _rerun()

        # Clean up selections that are no longer available
        selected_plans = [p for p in st.session_state["cp_selected_plans"] if p in cp_avail_plans]
        st.session_state["cp_selected_plans"] = selected_plans

        if selected_plans:
            # Build rates by plan
            rates_by_plan = {}
            for r in cp_avail_rates:
                if r["rating_plan"] in selected_plans:
                    rates_by_plan[r["rating_plan"]] = r

            # Maintenance rates
            maint_by_plan = {}
            if cp_class != "Maintenance":
                for plan in selected_plans:
                    maint = find_maintenance_rate(RATES, cp_company, cp_state, plan)
                    if maint and not all(t is None for t in maint["tiers"]):
                        maint_by_plan[plan] = maint

            has_maint_compare = len(maint_by_plan) > 0

            # Calculate results
            results_by_plan = {}
            maint_results_by_plan = {}
            if cp_amount > 0:
                for plan, rate in rates_by_plan.items():
                    results_by_plan[plan] = calculate_premium(rate, cp_amount, 0.0)
                for plan, rate in maint_by_plan.items():
                    maint_results_by_plan[plan] = calculate_premium(rate, cp_amount, 0.0)

            # Build comparison table
            cmp_header = (
                f'<th style="text-align:left;padding:0.35rem 0.5rem;font-weight:600;'
                f'color:{GRAY_700};font-size:0.8rem;">Contract Range</th>'
            )
            for plan in selected_plans:
                cmp_header += (
                    f'<th style="text-align:right;padding:0.35rem 0.5rem;font-weight:600;'
                    f'color:{GRAY_700};font-size:0.8rem;">{plan}</th>'
                )

            cmp_body = ""
            for i, label in enumerate(TIER_LABELS):
                rates_for_tier = [
                    rates_by_plan.get(plan, {}).get("tiers", [None]*6)[i]
                    for plan in selected_plans
                ]
                valid_rates = [r for r in rates_for_tier if r is not None]
                min_rate = min(valid_rates) if valid_rates else None

                row = (
                    f'<td style="padding:0.3rem 0.5rem;color:{GRAY_700};font-size:0.8rem;">'
                    f'{label}</td>'
                )
                for rate_val in rates_for_tier:
                    is_min = (rate_val == min_rate and len(valid_rates) > 1
                              and rate_val is not None)
                    color = GREEN if is_min else GRAY_700
                    weight = "700" if is_min else "400"
                    row += (
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'color:{color};font-weight:{weight};">{format_rate(rate_val)}</td>'
                    )
                cmp_body += f'<tr style="border-bottom:1px solid {GRAY_100};">{row}</tr>'

            # Premium totals (if contract amount entered)
            cmp_foot = ""
            if cp_amount > 0:
                # Contract premium row
                row = (
                    f'<td style="padding:0.3rem 0.5rem;font-weight:600;color:{GRAY_700};">'
                    f'Contract Premium</td>'
                )
                for plan in selected_plans:
                    r = results_by_plan.get(plan)
                    row += (
                        f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                        f'color:{GRAY_700};">{format_currency(r.total_premium) if r else "-"}</td>'
                    )
                cmp_foot += (
                    f'<tr style="background:{GRAY_50};font-weight:600;border-top:1px solid '
                    f'{GRAY_BORDER};">{row}</tr>'
                )

                # Maintenance row
                if has_maint_compare:
                    row = (
                        f'<td style="padding:0.3rem 0.5rem;font-weight:600;color:{GRAY_700};">'
                        f'Maintenance Premium</td>'
                    )
                    for plan in selected_plans:
                        mr = maint_results_by_plan.get(plan)
                        row += (
                            f'<td style="padding:0.3rem 0.5rem;text-align:right;'
                            f'color:{GRAY_700};">{format_currency(mr.total_premium) if mr else "-"}</td>'
                        )
                    cmp_foot += f'<tr style="background:{GRAY_50};">{row}</tr>'

                # Total row
                all_totals = []
                for plan in selected_plans:
                    cr = results_by_plan.get(plan)
                    mr = maint_results_by_plan.get(plan)
                    total = (cr.total_premium if cr else 0) + (mr.total_premium if mr else 0)
                    all_totals.append(total)

                min_total = min(all_totals) if all_totals else 0

                row = (
                    f'<td style="padding:0.5rem;font-weight:700;color:{NAVY};">Total Premium</td>'
                )
                for idx, plan in enumerate(selected_plans):
                    total = all_totals[idx]
                    is_min = (total == min_total
                              and sum(1 for t in all_totals if t == min_total) < len(selected_plans))
                    color = "#15803D" if is_min else NAVY
                    row += (
                        f'<td style="padding:0.5rem;text-align:right;'
                        f'font-weight:700;color:{color};">'
                        f'{format_currency(total) if results_by_plan.get(plan) else "-"}</td>'
                    )
                cmp_foot += (
                    f'<tr style="background:rgba(27,42,74,0.05);'
                    f'border-top:2px solid rgba(27,42,74,0.2);">{row}</tr>'
                )

            comp_html = (
                f'<div style="background:white;border:1px solid {GRAY_BORDER};border-radius:6px;'
                f'overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">'
                f'<div style="background:{GRAY_50};padding:0.35rem 0.5rem;border-bottom:1px solid '
                f'{GRAY_BORDER};font-size:0.8rem;font-weight:600;color:{NAVY};">'
                f'Side-by-Side Comparison</div>'
                f'<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">'
                f'<thead><tr style="background:{GRAY_50};border-bottom:1px solid {GRAY_BORDER};">'
                f'{cmp_header}</tr></thead>'
                f'<tbody>{cmp_body}</tbody>'
                f'<tfoot>{cmp_foot}</tfoot>'
                f'</table></div>'
            )

            # --- Copy Rate Card for Compare Plans (at top) ---
            # Build professional vertical comparison card
            cp_card = (
                f'<div style="margin-bottom:10px;">'
                f'<div style="font-size:15px;font-weight:700;color:{NAVY};margin-bottom:3px;">'
                f'{cp_company}</div>'
                f'<div style="font-size:13px;color:{GRAY_700};">'
                f'{cp_state} &nbsp;&bull;&nbsp; {cp_class}'
            )
            if cp_amount > 0:
                cp_card += f' &nbsp;&bull;&nbsp; Amount: <b>{format_currency(cp_amount)}</b>'
            cp_card += f'</div></div>'

            # Plan column headers
            cp_card += (
                f'<div style="display:flex;justify-content:space-between;padding:8px 10px;'
                f'margin-bottom:4px;background:{NAVY};border-radius:4px;color:white;'
                f'font-size:13px;font-weight:600;">'
                f'<span>Contract Range</span>'
                f'<span>{" &nbsp;&nbsp;&nbsp; ".join(selected_plans)}</span>'
                f'</div>'
            )

            # Tier rows
            for i, sl in enumerate(SHORT_TIER_LABELS):
                rates_for_tier_card = [
                    rates_by_plan.get(plan, {}).get("tiers", [None]*6)[i]
                    for plan in selected_plans
                ]
                valid_rates_card = [r for r in rates_for_tier_card if r is not None]
                min_rate_card = min(valid_rates_card) if valid_rates_card else None

                bg = "#F9FAFB" if i % 2 == 0 else "white"
                rate_vals_str = ""
                for rate_val in rates_for_tier_card:
                    is_min = (rate_val == min_rate_card and len(valid_rates_card) > 1
                              and rate_val is not None)
                    if is_min:
                        rate_vals_str += f'<b style="color:#059669;">{format_rate(rate_val)}</b> &nbsp;&nbsp;&nbsp; '
                    else:
                        rate_vals_str += f'{format_rate(rate_val)} &nbsp;&nbsp;&nbsp; '

                cp_card += (
                    f'<div style="display:flex;justify-content:space-between;padding:6px 10px;'
                    f'background:{bg};border-radius:3px;font-size:13px;">'
                    f'<span style="color:{GRAY_500};">{sl}</span>'
                    f'<span>{rate_vals_str.strip()}</span>'
                    f'</div>'
                )

            # Total premium row
            if cp_amount > 0:
                cp_card += (
                    f'<div style="display:flex;justify-content:space-between;padding:10px;'
                    f'margin-top:8px;border-top:2px solid {NAVY};font-size:15px;'
                    f'font-weight:700;color:{NAVY};">'
                    f'<span>Total Premium</span><span>'
                )
                for idx_p, plan in enumerate(selected_plans):
                    cr = results_by_plan.get(plan)
                    mr = maint_results_by_plan.get(plan)
                    total = (cr.total_premium if cr else 0) + (mr.total_premium if mr else 0)
                    cp_card += f'{format_currency(total) if cr else "-"} &nbsp;&nbsp;&nbsp; '
                cp_card += f'</span></div>'

            st.session_state["compare_card_data"] = {"html": cp_card}

            if st.button("📋 Rate Card", key="cp_rate_card_btn"):
                show_compare_card()

            st.markdown(comp_html, unsafe_allow_html=True)

    if not cp_avail_plans:
        st.markdown(
            f'<div style="text-align:center;padding:3rem;color:{GRAY_400};">'
            f'No plans available for this combination.</div>',
            unsafe_allow_html=True,
        )
