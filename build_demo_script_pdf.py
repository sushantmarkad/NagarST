import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

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
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#7847CB"))
        self.drawString(54, 11 * inch - 36, "AHILYANAGAR CITY BUS (NAGARST)")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "END-TO-END DEMO VIDEO SCRIPT")

        # Top rule
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Bottom rule & page numbering
        self.line(54, 45, 8.5 * inch - 54, 45)
        self.setFont("Helvetica", 8)
        self.drawString(54, 32, "Ahilyanagar City Bus Prototype Walkthrough - Simple Language Script")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Brand Colors
    brand_purple = colors.HexColor("#7847CB")
    dark_slate = colors.HexColor("#0F172A")
    muted_slate = colors.HexColor("#475569")
    bg_subtle = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=brand_purple,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=muted_slate,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=brand_purple,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=dark_slate,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate,
        leftIndent=10,
        spaceAfter=2.5
    )

    spoken_script_style = ParagraphStyle(
        'SpokenScript',
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#1E1B4B"),
        spaceBefore=2,
        spaceAfter=2
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_slate
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("Ahilyanagar City Bus — Complete Demo Video Script", title_style))
    story.append(Paragraph("<b>Connected Workflow Guide:</b> City Admin Request → Superadmin Approval → Fleet Setup → Driver Trip → Passenger Tracking & Ticketing", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_purple, spaceBefore=0, spaceAfter=10))

    # Meta Overview Box
    meta_data = [
        [
            Paragraph("<b>Target Video Length:</b> ~4 Minutes", table_cell_style),
            Paragraph("<b>Language Style:</b> Very simple, plain English (easy for everyone)", table_cell_style)
        ],
        [
            Paragraph("<b>Story Flow:</b> Admin Request → Approval → Setup → Driver → Passenger", table_cell_style),
            Paragraph("<b>Future Feature Highlight:</b> Upcoming Conductor QR Scanner Dashboard", table_cell_style)
        ],
        [
            Paragraph("<b>Screen View:</b> Full HD 1080p, smooth mouse movements", table_cell_style),
            Paragraph("<b>App Server:</b> <code>http://localhost:5173</code>", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[240, 264])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_subtle),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # Quick Recording Instructions
    story.append(Paragraph("Quick Tips for Smooth Recording", h1_style))
    tips = [
        "<b>Keep Tabs Ready:</b> Have three tabs open: Tab 1 (Landing Page), Tab 2 (Superadmin Console <code>/super-admin</code>), Tab 3 (Driver <code>/driver/dashboard</code>).",
        "<b>Speak Slowly:</b> Don't rush. Use a friendly and conversational tone.",
        "<b>Mouse Pointer:</b> Hover clearly on buttons and elements for a second before clicking so viewers can see where you click."
    ]
    for tip in tips:
        story.append(Paragraph(f"• {tip}", bullet_style))
    story.append(Spacer(1, 8))

    # Scene-by-Scene Breakdown
    scenes = [
        {
            "num": "Scene 1",
            "time": "0:00 – 0:35",
            "title": "Welcome & Landing Page",
            "action": [
                "Open browser at <code>http://localhost:5173/</code>.",
                "Show the modern header: <b>Ahilyanagar City Bus</b>.",
                "Scroll down smoothly through the stats (2L+ passengers, 150+ buses) and feature cards.",
                "Scroll back up to the top navigation."
            ],
            "script": (
                "\"Hello everyone! Welcome to the demo of our Ahilyanagar City Bus application.\n\n"
                "In this video, I will show you how our complete transit system works from start to finish.\n\n"
                "You will see how a new City Admin sends a request, how the Superadmin approves them, how the Admin sets up buses and drivers, how the driver runs their daily trip, and finally, how passengers can track buses and buy digital tickets on their phones.\n\n"
                "Let's start!\""
            ),
            "feature": "Landing page overview and introduction of the story flow."
        },
        {
            "num": "Scene 2",
            "time": "0:35 – 1:05",
            "title": "City Admin Sends Access Request",
            "action": [
                "Click on the <b>'Get Started'</b> button in the top navbar.",
                "Notice: Commuters can create an account directly, but Admins must request access.",
                "Click the tab: <b>'Request Admin Access'</b>.",
                "Fill in the form: Full Name (e.g. <i>'Ramesh Shinde'</i>), Official Email (e.g. <i>'admin.ahilyanagar@bus.in'</i>), and Password.",
                "Click <b>'Send Request'</b>.",
                "Show the clean confirmation message: <i>'Request Sent! After approval, you will be notified on your email.'</i>"
            ],
            "script": (
                "\"First, regular passengers can create an account right away. But for security, City Administrators cannot directly create an account.\n\n"
                "A transport official clicks 'Request Admin Access', fills in their name, official email, and sets a password, then clicks 'Send Request'.\n\n"
                "The system shows a simple confirmation that their request has been sent, and they will be notified by email once approved. Now, let's see how this request is approved.\""
            ),
            "feature": "Admin request submission and secure access gatekeeping."
        },
        {
            "num": "Scene 3",
            "time": "1:05 – 1:35",
            "title": "Superadmin Approves the City Admin",
            "action": [
                "Switch to the Superadmin tab (or navigate to <code>http://localhost:5173/super-admin</code>).",
                "Show the <b>Role & Access Control</b> table.",
                "Point to the pending request with the badge: <b>ADMIN REQUEST</b>.",
                "Click the green <b>'Approve Admin'</b> button.",
                "Show the success popup: <i>'Role updated to City Admin'</i>."
            ],
            "script": (
                "\"Now we are inside the Superadmin console.\n\n"
                "Here, the Superadmin sees all user accounts and pending access requests.\n\n"
                "Right at the top, we see the new request from our transport official with an 'Admin Request' badge.\n\n"
                "The Superadmin verifies the request and clicks 'Approve Admin'. That's it! The account is now activated, and our City Admin can log into their dashboard.\""
            ),
            "feature": "One-click approval in Superadmin dashboard."
        },
        {
            "num": "Scene 4",
            "time": "1:35 – 2:20",
            "title": "City Admin Dashboard: Setup Buses, Routes & Assign Driver",
            "action": [
                "Sign in as the approved City Admin and open <code>/admin/dashboard</code>.",
                "Show the Dashboard Overview with active bus counts and live stats.",
                "Click on <b>'Routes & Stops'</b>: show route paths (e.g. Route 12: Savedi to Maliwada).",
                "Click on <b>'Fleet & Staff Management'</b>.",
                "Show the driver list. Click to edit or assign a driver (e.g. <i>'Rajesh Sharma'</i>) to Bus <b>AH-01</b>.",
                "Save changes and show the updated assignment: Driver Rajesh Sharma is now assigned to Bus AH-01 on Route 12."
            ],
            "script": (
                "\"Now we are inside the City Admin Dashboard.\n\n"
                "The admin can see city-wide stats, active buses, and daily ridership.\n\n"
                "Next, the admin sets up routes, stops, and schedules. Under Fleet and Staff Management, the admin can add buses and drivers.\n\n"
                "Here, the admin selects Bus AH-01 and assigns driver Rajesh Sharma to this bus on Route 12. Notice how simple it is—no paperwork needed. Everything is linked in real time.\""
            ),
            "feature": "Central operational setup: assigning driver, bus, and route."
        },
        {
            "num": "Scene 5",
            "time": "2:20 – 3:05",
            "title": "Driver Dashboard: Auto-Fetch Bus Info & Running the Trip",
            "action": [
                "Switch to the Driver view (<code>http://localhost:5173/driver/dashboard</code>).",
                "Show the Driver Cockpit screen.",
                "Point out how the app automatically fetches the assigned bus: <b>Bus AH-01</b> and <b>Route 12 (Savedi ➔ Maliwada)</b>.",
                "Click the green <b>'Start Trip'</b> button: show the live telemetry connection turning green.",
                "Tap the <b>Passenger Counter (+ / -)</b> buttons to show seat occupancy updating.",
                "Tap <b>'Next Stop'</b> to advance along the route.",
                "Click <b>'End Trip'</b> to show how the driver finishes their shift safely."
            ],
            "script": (
                "\"Now let's switch to the Driver Dashboard. This interface is made for drivers using a phone mounted on the bus.\n\n"
                "As soon as the driver logs in, the app automatically fetches their assigned bus—Bus AH-01—and the exact route set by the admin.\n\n"
                "The driver clicks 'Start Trip'. Immediately, the bus starts broadcasting its live GPS location and speed to the server.\n\n"
                "The driver can click 'Next Stop' as they reach each station, and adjust the passenger counter with simple plus and minus buttons. When the route is complete, they tap 'End Trip'.\""
            ),
            "feature": "Auto-fetching assigned bus info, live trip start/stop, passenger count."
        },
        {
            "num": "Scene 6",
            "time": "3:05 – 3:50",
            "title": "Passenger Dashboard: Live Tracking & Self Digital Ticket",
            "action": [
                "Open Passenger view (<code>http://localhost:5173/app/home</code>).",
                "Click <b>'Live Tracking'</b> (<code>/app/live</code>).",
                "Show the live map: point to Bus <b>AH-01</b> moving on Route 12.",
                "Click the bus marker: show the popup with live speed, next stop ETA, and crowd level.",
                "Navigate to <b>'Tickets & Passes'</b> (<code>/app/tickets</code>).",
                "Click <b>'Book Single Ticket'</b> (₹15), choose UPI payment, and complete the instant purchase.",
                "Show the active <b>Digital QR Ticket</b> with the countdown validity timer."
            ],
            "script": (
                "\"Now let's look at the Passenger experience.\n\n"
                "On the live map, commuters can see Bus AH-01 moving in real time! Clicking the bus shows its exact speed, when it will arrive at their stop, and how crowded it is.\n\n"
                "Passengers can also buy tickets directly on their phone using UPI. No cash, no waiting in line.\n\n"
                "Once booked, an instant Digital QR Ticket appears on their screen with a validity timer.\""
            ),
            "feature": "Live passenger bus tracking, real-time ETA, and instant cashless QR ticket."
        },
        {
            "num": "Scene 7",
            "time": "3:50 – 4:20",
            "title": "Future Conductor Scanner & Conclusion",
            "action": [
                "Show the QR Code on the Passenger ticket clearly.",
                "Explain the upcoming Conductor app feature.",
                "Return to the main Landing Page or overview dashboard.",
                "Show the Ahilyanagar City Bus logo and wrap up."
            ],
            "script": (
                "\"Currently, ticket checking is done visually by showing this QR code to the bus staff. In our next update, we are adding a dedicated Conductor Dashboard where conductors can scan this QR code with their camera to verify tickets instantly.\n\n"
                "From Superadmin approval to City Admin management, Driver trip tracking, and Passenger ticketing—everything works together in one seamless app.\n\n"
                "Thank you for watching this demonstration of Ahilyanagar City Bus!\""
            ),
            "feature": "Future conductor QR scanner roadmap and closing summary."
        }
    ]

    for s in scenes:
        card = []
        card.append(Paragraph(f"<b>{s['num']}: {s['title']}</b> <font color='#7847CB'>({s['time']})</font>", h2_style))
        
        # Action bullets
        action_html = "<br/>".join([f"• {a}" for a in s['action']])
        
        scene_table_data = [
            [
                Paragraph("<b>WHAT TO SHOW ON SCREEN (ACTIONS)</b>", table_header_style),
                Paragraph("<b>WHAT TO SPEAK (VOICEOVER SCRIPT)</b>", table_header_style)
            ],
            [
                Paragraph(action_html, table_cell_style),
                Paragraph(s['script'].replace('\n\n', '<br/><br/>'), spoken_script_style)
            ]
        ]
        
        scene_table = Table(scene_table_data, colWidths=[225, 279])
        scene_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), brand_purple),
            ('BACKGROUND', (0,1), (0,1), bg_subtle),
            ('BACKGROUND', (1,1), (1,1), colors.HexColor("#FDF2F8")),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
            ('PADDING', (0,0), (-1,-1), 5.5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        card.append(scene_table)
        card.append(Spacer(1, 3))
        card.append(Paragraph(f"<b>Key Takeaway:</b> <font color='#64748B'>{s['feature']}</font>", ParagraphStyle('Highlight', fontName='Helvetica', fontSize=7.5, textColor=muted_slate)))
        card.append(Spacer(1, 7))
        story.append(KeepTogether(card))

    # Summary Cheat Sheet Table
    story.append(Spacer(1, 6))
    story.append(Paragraph("Quick Recording Timing & Route Cheat Sheet", h1_style))
    summary_rows = [
        [
            Paragraph("<b>Scene</b>", table_header_style),
            Paragraph("<b>Timestamp</b>", table_header_style),
            Paragraph("<b>Screen / URL</b>", table_header_style),
            Paragraph("<b>Main Action</b>", table_header_style)
        ]
    ]
    for s in scenes:
        summary_rows.append([
            Paragraph(s['num'], table_cell_style),
            Paragraph(s['time'], table_cell_style),
            Paragraph(s['title'], table_cell_style),
            Paragraph(s['feature'], table_cell_style)
        ])
    sum_table = Table(summary_rows, colWidths=[60, 75, 175, 194])
    sum_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), dark_slate),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_subtle])
    ]))
    story.append(sum_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == '__main__':
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else 'Ahilyanagar_City_Bus_Demo_Video_Script.pdf'
    build_pdf(output_pdf)
