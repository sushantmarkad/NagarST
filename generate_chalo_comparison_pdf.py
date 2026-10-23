import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas

# =========================================================================
# COLOR PALETTE — NAGARST ENTERPRISE DESIGN
# =========================================================================
BRAND_PURPLE    = colors.HexColor("#7847CB")
BRAND_PURPLE_DK = colors.HexColor("#5B21B6")
BRAND_PURPLE_LT = colors.HexColor("#F5F1FD")
DARK_SLATE      = colors.HexColor("#0F172A")
SLATE_BODY      = colors.HexColor("#334155")
MUTED_SLATE     = colors.HexColor("#64748B")
EMERALD_GREEN   = colors.HexColor("#059669")
EMERALD_BG      = colors.HexColor("#ECFDF5")
EMERALD_BORDER  = colors.HexColor("#A7F3D0")
ROSE_RED        = colors.HexColor("#E11D48")
ROSE_BG         = colors.HexColor("#FFF1F2")
ROSE_BORDER     = colors.HexColor("#FECDD3")
AMBER_GOLD      = colors.HexColor("#D97706")
AMBER_BG        = colors.HexColor("#FFFBEB")
AMBER_BORDER    = colors.HexColor("#FDE68A")
BORDER_LIGHT    = colors.HexColor("#E2E8F0")
CARD_BG         = colors.HexColor("#F8FAFC")
WHITE           = colors.HexColor("#FFFFFF")

# =========================================================================
# NUMBERED CANVAS (Header / Footer on every page except cover)
# =========================================================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_decorations(num_pages)
            super().showPage()
        super().save()

    def _draw_decorations(self, total):
        self.saveState()
        if self._pageNumber > 1:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(BRAND_PURPLE)
            self.drawString(54, 11 * inch - 36, "NAGARST INTELLIGENT TRANSIT OPERATING SYSTEM")
            self.setFont("Helvetica", 8)
            self.setFillColor(MUTED_SLATE)
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "STRATEGIC BENCHMARK: NAGARST VS. CHALO APP")
            self.setStrokeColor(BORDER_LIGHT)
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

            # Running Footer
            self.line(54, 46, 8.5 * inch - 54, 46)
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(BRAND_PURPLE)
            self.drawString(54, 32, "NagarST Transit Undertaking • Ahilyanagar Smart City Initiative")
            self.setFont("Helvetica", 8)
            self.setFillColor(MUTED_SLATE)
            self.drawRightString(8.5 * inch - 54, 32, f"Page {self._pageNumber} of {total}")
        self.restoreState()


# =========================================================================
# TYPOGRAPHY STYLES
# =========================================================================
styles = {
    'CoverEyebrow': ParagraphStyle('CoverEyebrow', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=AMBER_GOLD),
    'CoverTitle': ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=26, leading=32, textColor=DARK_SLATE),
    'CoverSubtitle': ParagraphStyle('CoverSubtitle', fontName='Helvetica', fontSize=12, leading=17, textColor=MUTED_SLATE),
    'CoverMeta': ParagraphStyle('CoverMeta', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=DARK_SLATE),

    'H1': ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=DARK_SLATE, spaceBefore=14, spaceAfter=8),
    'H2': ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=BRAND_PURPLE, spaceBefore=10, spaceAfter=6),
    'Body': ParagraphStyle('Body', fontName='Helvetica', fontSize=9.5, leading=14, textColor=SLATE_BODY),
    'BodyBold': ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=9.5, leading=14, textColor=DARK_SLATE),
    'Bullet': ParagraphStyle('Bullet', fontName='Helvetica', fontSize=9, leading=13, textColor=SLATE_BODY, leftIndent=12),
    
    'TableHead': ParagraphStyle('TableHead', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=WHITE),
    'TableCell': ParagraphStyle('TableCell', fontName='Helvetica', fontSize=8, leading=11, textColor=DARK_SLATE),
    'TableCellBold': ParagraphStyle('TableCellBold', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=DARK_SLATE),
    'TableCellNagarST': ParagraphStyle('TableCellNagarST', fontName='Helvetica', fontSize=8, leading=11, textColor=EMERALD_GREEN),
    'TableCellChalo': ParagraphStyle('TableCellChalo', fontName='Helvetica', fontSize=8, leading=11, textColor=ROSE_RED),

    'CardHeader': ParagraphStyle('CardHeader', fontName='Helvetica-Bold', fontSize=10.5, leading=14, textColor=BRAND_PURPLE_DK),
    'CardBody': ParagraphStyle('CardBody', fontName='Helvetica', fontSize=8.5, leading=12.5, textColor=SLATE_BODY),

    'TagNagarST': ParagraphStyle('TagNagarST', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=EMERALD_GREEN),
    'TagChalo': ParagraphStyle('TagChalo', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=ROSE_RED),
}


def build_comparison_pdf(filename="NagarST_vs_Chalo_Comparison_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )
    story = []

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE SUMMARY
    # =========================================================================
    story.append(Paragraph("MUNICIPAL TRANSIT BENCHMARK REPORT", styles['CoverEyebrow']))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Why NagarST Outperforms Chalo App", styles['CoverTitle']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "A rigorous technical, operational, financial, and commuter experience comparison between "
        "the <b>NagarST Sovereign Intelligent Transit Operating System</b> and commercial aggregator platforms like Chalo.",
        styles['CoverSubtitle']
    ))
    story.append(Spacer(1, 10))

    # Meta banner
    meta_data = [
        [
            Paragraph("<b>Authority:</b> Ahilyanagar Municipal Corporation (AMC)", styles['CoverMeta']),
            Paragraph("<b>Target Network:</b> NagarST City Bus Service", styles['CoverMeta']),
        ],
        [
            Paragraph("<b>Release:</b> Enterprise v2.4 (Production Ready)", styles['CoverMeta']),
            Paragraph("<b>Classification:</b> Municipal Strategic Comparison", styles['CoverMeta']),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BRAND_PURPLE_LT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#DDD0F7")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#DDD0F7")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Executive Summary Card
    exec_text = (
        "<b>Executive Verdict:</b> While <b>Chalo App</b> operates as a closed third-party commercial aggregator "
        "requiring expensive proprietary GPS OBD black-boxes (AIS-140 hardware) and imposing recurring vendor lock-in, "
        "<b>NagarST</b> is an end-to-end <i>Sovereign Municipal Transit Operating System</i>. "
        "NagarST delivers <b>zero-hardware real-time GPS telemetry</b> via smartphones, sub-second live radar, "
        "an automated <b>Dynamic Stop-to-Stop Fare Matrix Engine</b>, integrated Driver & Conductor terminals, "
        "and a zero-install Progressive Web App (PWA) that loads in milliseconds without forcing commuters into heavy app-store downloads."
    )
    exec_table = Table([[Paragraph(exec_text, styles['Body'])]], colWidths=[504])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1.5, BRAND_PURPLE),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 14))

    # Key Highlights Grid (3 Columns)
    h_col1 = [
        Paragraph("<b>100% Zero-Hardware CapEx</b>", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph("Drivers broadcast live GPS directly from standard smartphones/tablets. Saves <b>Rs. 15,000–Rs. 25,000 per bus</b> in hardware OBD black-boxes.", styles['CardBody'])
    ]
    h_col2 = [
        Paragraph("<b>Stop-to-Stop Dynamic Fares</b>", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph("Commuters select exact boarding & destination stops from live bus markers; pricing engine auto-computes incremental fares.", styles['CardBody'])
    ]
    h_col3 = [
        Paragraph("<b>Unified 5-in-1 Ecosystem</b>", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph("Passenger Live Map, Driver Console, Conductor POS, Municipal Admin HQ, and GPS Demo Simulator built into a unified codebase.", styles['CardBody'])
    ]

    summary_grid = Table([[h_col1, h_col2, h_col3]], colWidths=[164, 164, 164])
    summary_grid.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WHITE),
        ('BOX', (0,0), (0,0), 1, BORDER_LIGHT),
        ('BOX', (1,0), (1,0), 1, BORDER_LIGHT),
        ('BOX', (2,0), (2,0), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(summary_grid)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: MASTER COMPARISON MATRIX (NAGARST VS. CHALO)
    # =========================================================================
    story.append(Paragraph("1. Direct Architectural & Feature Comparison", styles['H1']))
    story.append(Paragraph(
        "A feature-by-feature evaluation comparing core transit capabilities between NagarST and Chalo App across 10 critical dimensions:",
        styles['Body']
    ))
    story.append(Spacer(1, 8))

    matrix_data = [
        [
            Paragraph("Evaluation Dimension", styles['TableHead']),
            Paragraph("Chalo App Platform", styles['TableHead']),
            Paragraph("NagarST Transit Ecosystem", styles['TableHead']),
            Paragraph("Advantage", styles['TableHead'])
        ],
        [
            Paragraph("<b>GPS Hardware & Installation</b>", styles['TableCellBold']),
            Paragraph("Requires dedicated AIS-140 GPS OBD hardware retrofitted into every bus engine. High maintenance & wiring failure.", styles['TableCell']),
            Paragraph("<b>Zero-Hardware Required:</b> Driver Console runs on standard mobile device GPS with automatic watchdog & background broadcast.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(100% Free CapEx)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Ticketing Granularity</b>", styles['TableCellBold']),
            Paragraph("Coarse zonal or full-route tickets. Commuter frequently pays full terminal tariff even for short trips (1–2 stops).", styles['TableCell']),
            Paragraph("<b>Stop-to-Stop Dynamic Pricing:</b> Exact fare calculated per stop (Base + per-stop increment + bus class multiplier + custom overrides).", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Accurate & Fair)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Telemetry & Live Radar</b>", styles['TableCellBold']),
            Paragraph("15–30s polled updates. Ghost buses appear when off-duty. Buses snap abruptly between cell pings.", styles['TableCell']),
            Paragraph("<b>Sub-Second WebSocket / Firestore Sync:</b> Live driver GPS flag (`isLiveDriver`), smooth bearing rotation, and automatic dead-signal timeout.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Real-Time Precision)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Passenger Access Mode</b>", styles['TableCellBold']),
            Paragraph("Heavy native Android/iOS download (>50 MB). Requires OTP signup & location permission before showing arrival ETA.", styles['TableCell']),
            Paragraph("<b>Zero-Install PWA:</b> Commuter scans QR code at bus stop to open live radar in mobile browser instantly in under 1 second.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Frictionless)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Conductor & Staff Integration</b>", styles['TableCellBold']),
            Paragraph("Requires separate handheld proprietary POS device leased from vendor at monthly recurring cost.", styles['TableCell']),
            Paragraph("<b>Integrated Conductor Terminal:</b> Conductor scans digital QR passes, issues cash/UPI tickets, and reconciles cash collections directly on phone.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Unified Platform)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Municipal Data Sovereignty</b>", styles['TableCellBold']),
            Paragraph("Proprietary vendor silo. Chalo owns commuter travel patterns, monetization rights, and ridership telemetry.", styles['TableCell']),
            Paragraph("<b>100% Municipal Control:</b> Transit authority owns Firestore database, revenue metrics, corridor loads, and incident telemetry.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Full Sovereignty)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Testing & Training Drills</b>", styles['TableCellBold']),
            Paragraph("No simulation tools. System can only be tested with physical buses driving on the road, burning diesel.", styles['TableCell']),
            Paragraph("<b>Built-In GPS Demo Simulator:</b> Simulates multi-bus fleet along real OSRM street geometries for drills, training, and exhibitions.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Zero Diesel Cost)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>User Interface & Ads</b>", styles['TableCellBold']),
            Paragraph("Commercial app cluttered with banner ads, insurance promos, third-party loan offers, and cashback upsells.", styles['TableCell']),
            Paragraph("<b>100% Ad-Free Civic UX:</b> Clean, accessible glassmorphic interface dedicated solely to public transit convenience.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Pure Civic Utility)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Local Language & Smart City Customization</b>", styles['TableCellBold']),
            Paragraph("Standardized national template with limited hyper-local adaptation for local historic city landmarks.", styles['TableCell']),
            Paragraph("<b>Hyper-Local Ahilyanagar Alignment:</b> Full Marathi/English bilingual support with stops mapped to CBS, Savedi, Market Yard, MIDC, Maliwada.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(Tailored for City)</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Total 3-Year Ownership Cost (50 Buses)</b>", styles['TableCellBold']),
            Paragraph("Rs. 35,00,000 – Rs. 60,00,000 (Hardware purchase, annual cloud SaaS licenses, POS rental fees, SIM telemetry data packs).", styles['TableCellChalo']),
            Paragraph("<b>Fractional Cost (< Rs. 3,00,000 total):</b> Runs on lightweight cloud tier and existing municipal smartphone infrastructure.", styles['TableCellNagarST']),
            Paragraph("<b>NagarST<br/>(>90% Savings)</b>", styles['TagNagarST']),
        ]
    ]

    col_widths = [110, 160, 174, 60]
    matrix_table = Table(matrix_data, colWidths=col_widths, repeatRows=1)
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BRAND_PURPLE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(matrix_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: TECHNICAL PILLARS — WHY NAGARST WINS
    # =========================================================================
    story.append(Paragraph("2. Deep-Dive: Core Technical Advantages of NagarST", styles['H1']))
    story.append(Paragraph(
        "Examining the underlying engineering innovations that give NagarST superior operational resilience over traditional aggregator models:",
        styles['Body']
    ))
    story.append(Spacer(1, 10))

    # Pillar 1: Hardware-Free Driver GPS Architecture
    p1_content = [
        Paragraph("Pillar 1: Hardware-Free Mobile GPS Broadcast Engine", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph(
            "<b>The Chalo Problem:</b> Chalo relies on hardwired AIS-140 GPS boxes connected to vehicle battery lines. "
            "In Indian municipal bus fleets, vibration, water exposure during washing, and electrical surges result in a <b>15–25% monthly hardware failure rate</b>, "
            "causing 'blind spot buses' that disappear from the map until a technician physically inspects the vehicle.<br/><br/>"
            "<b>The NagarST Solution:</b> NagarST implements a browser-native high-precision Geolocation telemetry system. "
            "When the driver logs into the <b>NagarST Driver Console</b> on their smartphone or dashboard tablet, "
            "the system automatically locks GPS coordinates with heading, altitude, and speed calculations, broadcasting "
            "at 1-second intervals via secure WebSockets and Firestore listeners. If the driver halts or turns off the engine, "
            "the 60-second watchdog immediately flags the bus status, preventing 'ghost bus' confusion.",
            styles['CardBody']
        )
    ]
    p1_box = Table([[p1_content]], colWidths=[504])
    p1_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BRAND_PURPLE_LT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#DDD0F7")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(p1_box)
    story.append(Spacer(1, 10))

    # Pillar 2: Dynamic Stop-to-Stop Fare Pricing Engine
    p2_content = [
        Paragraph("Pillar 2: Stop-to-Stop Dynamic Fare Engine (fareEngine.ts)", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph(
            "<b>The Chalo Limitation:</b> Chalo's ticketing is structured around fixed stage blocks pre-configured on vendor servers. "
            "Commuters frequently pay excessive flat rates even if they disembark after only 2 stops.<br/><br/>"
            "<b>The NagarST Edge:</b> NagarST features a dedicated mathematical pricing engine:<br/>"
            "• <b>Base Minimum Tariff:</b> Covers initial 1–2 stops (e.g. Rs. 10) with configurable urban threshold.<br/>"
            "• <b>Per-Stop Incremental Rate:</b> Adds Rs. 3 per additional stop traveled along the corridor.<br/>"
            "• <b>Route Ceiling Cap:</b> Maximum fare ceiling (e.g. Rs. 35) guarantees passenger affordability across the entire corridor.<br/>"
            "• <b>Vehicle Class Multipliers:</b> Automatic pricing coefficient for Standard City (1.0x), Mini Bus (1.0x), EV Metro Shuttle (1.2x), and AC Express (1.5x).<br/>"
            "• <b>Direct Stop-Pair Overrides:</b> City Admin can assign bespoke promotional tariffs for key commuter corridors (e.g., Central Bus Stand ➔ Savedi Terminal fixed at Rs. 15) "
            "with zero code deployment.",
            styles['CardBody']
        )
    ]
    p2_box = Table([[p2_content]], colWidths=[504])
    p2_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WHITE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(p2_box)
    story.append(Spacer(1, 10))

    # Pillar 3: True Dual-Stream Separation (Live Driver vs Demo Simulator)
    p3_content = [
        Paragraph("Pillar 3: Dual-Stream Separation & Synthetic Simulation Sandbox", styles['CardHeader']),
        Spacer(1, 3),
        Paragraph(
            "NagarST solves the critical challenge of testing and training without confusing citizens. "
            "The platform maintains an explicit distinction between <b>Live Driver Telemetry</b> (`isLiveDriver: true`) "
            "and <b>Virtual GPS Simulator Buses</b> (`isDemo: true`).<br/>"
            "• <b>Citizens see verified on-road vehicles</b> with green 'GPS Verified' badges and real-time speed indicators.<br/>"
            "• <b>City Admin & Control Room operators</b> can spin up virtual simulation fleets along real road polylines "
            "to stress-test schedules, train dispatchers, and evaluate new route corridors prior to real-world capital deployment.",
            styles['CardBody']
        )
    ]
    p3_box = Table([[p3_content]], colWidths=[504])
    p3_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WHITE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(p3_box)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: FINANCIAL COMPARISON & 3-YEAR TCO ANALYSIS
    # =========================================================================
    story.append(Paragraph("3. Financial Analysis: 3-Year Total Cost of Ownership (TCO)", styles['H1']))
    story.append(Paragraph(
        "Cost model comparison for a standard municipal fleet of <b>50 City Transit Buses</b> over a 3-year operating horizon:",
        styles['Body']
    ))
    story.append(Spacer(1, 8))

    cost_data = [
        [
            Paragraph("Expenditure Category", styles['TableHead']),
            Paragraph("Chalo App Commercial Model", styles['TableHead']),
            Paragraph("NagarST Sovereign System", styles['TableHead']),
            Paragraph("Municipal Savings", styles['TableHead'])
        ],
        [
            Paragraph("<b>GPS Hardware (AIS-140 OBD)</b><br/>50 units @ Rs. 18,000/bus", styles['TableCellBold']),
            Paragraph("Rs. 9,00,000 (Initial CapEx)", styles['TableCellChalo']),
            Paragraph("<b>Rs. 0</b> (Uses Driver Smartphones)", styles['TableCellNagarST']),
            Paragraph("<b>Rs. 9,00,000 saved</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Hardware Maintenance & Wiring</b><br/>Replacement of burnt/damaged units", styles['TableCellBold']),
            Paragraph("Rs. 2,40,000 (Rs. 80,000 / year)", styles['TableCellChalo']),
            Paragraph("<b>Rs. 0</b> (Driver phones covered by standard warranty)", styles['TableCellNagarST']),
            Paragraph("<b>Rs. 2,40,000 saved</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Cellular M2M SIMs for GPS</b><br/>50 SIMs @ Rs. 200/mo x 36 mos", styles['TableCellBold']),
            Paragraph("Rs. 3,60,000 (Data roaming packs)", styles['TableCellChalo']),
            Paragraph("<b>Rs. 0</b> (Utilizes staff mobile data / Wi-Fi depot sync)", styles['TableCellNagarST']),
            Paragraph("<b>Rs. 3,60,000 saved</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Platform SaaS / Revenue Commission</b><br/>Vendor license or 3% ticket commission", styles['TableCellBold']),
            Paragraph("Rs. 21,60,000 (Rs. 60,000/mo license fee)", styles['TableCellChalo']),
            Paragraph("<b>Rs. 0</b> (100% Owned by Municipal Corporation)", styles['TableCellNagarST']),
            Paragraph("<b>Rs. 21,60,000 saved</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Handheld Conductor POS Terminals</b><br/>50 POS devices + paper roll costs", styles['TableCellBold']),
            Paragraph("Rs. 7,50,000 (Hardware lease & maintenance)", styles['TableCellChalo']),
            Paragraph("<b>Rs. 0</b> (Runs on Conductor Android Smartphone)", styles['TableCellNagarST']),
            Paragraph("<b>Rs. 7,50,000 saved</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>Cloud Database & Web Hosting</b><br/>Firestore + Cloudflare / Serverless", styles['TableCellBold']),
            Paragraph("Included in SaaS fee", styles['TableCell']),
            Paragraph("<b>Rs. 72,000</b> (Rs. 2,000 / mo total cloud costs)", styles['TableCellNagarST']),
            Paragraph("<b>Predictable Low Cost</b>", styles['TagNagarST']),
        ],
        [
            Paragraph("<b>TOTAL 3-YEAR EXPENDITURE</b>", styles['TableCellBold']),
            Paragraph("<b>Rs. 44,10,000</b>", ParagraphStyle('RedBig', fontName='Helvetica-Bold', fontSize=10, textColor=ROSE_RED)),
            Paragraph("<b>Rs. 72,000</b>", ParagraphStyle('GreenBig', fontName='Helvetica-Bold', fontSize=10, textColor=EMERALD_GREEN)),
            Paragraph("<b>Rs. 43,38,000<br/>(98.3% SAVINGS)</b>", ParagraphStyle('GreenBigTag', fontName='Helvetica-Bold', fontSize=9, textColor=EMERALD_GREEN)),
        ]
    ]

    cost_table = Table(cost_data, colWidths=[140, 130, 140, 94])
    cost_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BRAND_PURPLE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [WHITE, colors.HexColor("#F8FAFC")]),
        ('BACKGROUND', (0,-1), (-1,-1), EMERALD_BG),
        ('BOX', (0,-1), (-1,-1), 1.5, EMERALD_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(cost_table)
    story.append(Spacer(1, 14))

    # Municipal Autonomy & Data Security Card
    story.append(Paragraph("4. Municipal Sovereignty, Security & Public Trust", styles['H2']))
    sec_text = (
        "<b>Data Sovereignty is National Security:</b> When a municipal transit corporation signs up with third-party aggregators like Chalo, "
        "every citizen's travel timestamps, boarding stops, origin-destination matrices, and daily commutes are logged on commercial private clouds. "
        "Aggregators routinely cross-monetize this mobility data through targeted advertisements, fintech credit scoring, and insurance profiling.<br/><br/>"
        "With <b>NagarST</b>, 100% of the passenger data, ticket revenue receipts, and driver telemetry remain the exclusive property "
        "of the <b>Ahilyanagar Municipal Corporation</b>. No third-party advertisements, no behavioral ad trackers, and zero citizen data leakage."
    )
    sec_box = Table([[Paragraph(sec_text, styles['Body'])]], colWidths=[504])
    sec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BRAND_PURPLE_LT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#DDD0F7")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(sec_box)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: USER EXPERIENCE & FINAL RECOMMENDATION
    # =========================================================================
    story.append(Paragraph("5. Stakeholder Experience Breakdown", styles['H1']))
    story.append(Paragraph("How NagarST transforms the daily transit experience for each municipal user group:", styles['Body']))
    story.append(Spacer(1, 8))

    ux_data = [
        [
            Paragraph("Stakeholder", styles['TableHead']),
            Paragraph("Experience with Chalo App", styles['TableHead']),
            Paragraph("Experience with NagarST", styles['TableHead'])
        ],
        [
            Paragraph("<b>Citizen / Passenger</b>", styles['TableCellBold']),
            Paragraph("Must download 50MB app, register with phone/OTP. Sees insurance/loan ads. Must buy fixed flat tickets.", styles['TableCell']),
            Paragraph("Instant PWA scan at bus shelter. Ad-free live radar with interactive stop-to-stop fare calculation and one-tap QR tickets.", styles['TableCellNagarST']),
        ],
        [
            Paragraph("<b>Bus Driver</b>", styles['TableCellBold']),
            Paragraph("Passive participant; has no feedback on route schedule, delay status, or passengers waiting ahead.", styles['TableCell']),
            Paragraph("Interactive Driver Console with live speed speedometer, turn-by-turn stop approach alerts, SOS panic broadcast, and delay counter.", styles['TableCellNagarST']),
        ],
        [
            Paragraph("<b>Bus Conductor</b>", styles['TableCellBold']),
            Paragraph("Carries bulky heavy POS printer machine. Struggles with thermal paper roll jams and battery exhaustion.", styles['TableCell']),
            Paragraph("Lightweight Conductor Terminal on smartphone. Instant optical QR scanner validates passenger passes in under 400ms.", styles['TableCellNagarST']),
        ],
        [
            Paragraph("<b>Municipal Commissioner / Admin</b>", styles['TableCellBold']),
            Paragraph("Dependent on vendor support tickets to change route stops, fare rules, or resolve missing bus locations.", styles['TableCell']),
            Paragraph("Full control via Admin Portal: Live Fleet Radar, Dynamic Fare Matrix tab, Route Corridor Creator, and Fleet Staff Management.", styles['TableCellNagarST']),
        ]
    ]

    ux_table = Table(ux_data, colWidths=[104, 200, 200])
    ux_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK_SLATE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_LIGHT),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(ux_table)
    story.append(Spacer(1, 14))

    # Strategic Recommendation
    story.append(Paragraph("6. Strategic Recommendation for Ahilyanagar", styles['H1']))
    rec_text = (
        "<b>Definitive Conclusion:</b><br/>"
        "Commercial aggregators like <b>Chalo App</b> are designed to maximize vendor profits through hardware sales, "
        "recurring SaaS licenses, and commercial ad monetization. For a municipal city bus service like <b>NagarST</b>, "
        "adopting Chalo introduces unnecessary operational fragility, hardware CapEx liabilities, and recurring budgetary drain.<br/><br/>"
        "<b>NagarST is demonstrably superior</b> across all operational metrics:<br/>"
        "1. <b>Zero Capital Expenditure:</b> Eliminates Rs. 9,00,000+ in hardware black-boxes for every 50 buses.<br/>"
        "2. <b>Fairer Commuter Pricing:</b> Stop-to-Stop Dynamic Pricing ensures passengers only pay for the distance they travel.<br/>"
        "3. <b>Zero-Install Civic Accessibility:</b> Millions of citizens can access live buses instantly without downloading an app.<br/>"
        "4. <b>Complete Municipal Sovereignty:</b> 100% of the revenue, telemetry, and civic data remains under the direct control of Ahilyanagar Municipal Corporation.<br/><br/>"
        "<b>Recommendation:</b> Deploy and scale <b>NagarST</b> as the permanent, sovereign, standard transit operating system for the Ahilyanagar City Bus Service."
    )
    rec_box = Table([[Paragraph(rec_text, styles['Body'])]], colWidths=[504])
    rec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), EMERALD_BG),
        ('BOX', (0,0), (-1,-1), 1.5, EMERALD_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(rec_box)
    story.append(Spacer(1, 14))

    # Signoff footer block
    sign_data = [
        [
            Paragraph("<b>Prepared By:</b> NagarST Transit Engineering Team", styles['TableCellBold']),
            Paragraph("<b>Approved For:</b> Municipal Urban Mobility Council", styles['TableCellBold']),
        ],
        [
            Paragraph("Ahilyanagar Smart City Digital Infrastructure Wing", styles['TableCell']),
            Paragraph("Status: Recommended for Fleet-Wide Deployment", styles['TableCell']),
        ]
    ]
    sign_table = Table(sign_data, colWidths=[252, 252])
    sign_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(sign_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")


if __name__ == '__main__':
    build_comparison_pdf("NagarST_vs_Chalo_Comparison_Report.pdf")
