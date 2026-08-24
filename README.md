# 🚌 Ahilyanagar City Bus (अहिल्यानगर शहर बस सेवा)

> **Next-Gen Smart City Transit Management System & Commuter Mobility Platform**  
> *Empowering Ahilyanagar (Ahmednagar) with real-time bus tracking, digital QR ticketing, automated pass management, conductor/driver consoles, and AI-powered fleet analytics.*

---

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [📱 Commuter Portal](#-commuter-portal)
  - [🚍 Driver Console](#-driver-console)
  - [🎟️ Conductor Portal](#️-conductor-portal)
  - [📊 Admin Command Center & AI Insights](#-admin-command-center--ai-insights)
- [Tech Stack](#-tech-stack)
- [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
- [Getting Started](#-getting-started)
- [Demo Credentials & Role Access](#-demo-credentials--role-access)
- [Key Ahilyanagar Transit Routes](#-key-ahilyanagar-transit-routes)
- [Scripts & Quality Assurance](#-scripts--quality-assurance)
- [License](#-license)

---

## 🌐 Overview

**Ahilyanagar City Bus** is a comprehensive, modern Intelligent Transportation System (ITS) designed to modernize public transit in Ahilyanagar (Ahmednagar), Maharashtra. 

The application bridges the gap between commuters, transit crews, and municipal administrative authorities by offering:
- **For Commuters**: Real-time live bus tracking on interactive Leaflet maps, instant journey planning across local hubs, digital QR tickets, and hassle-free bus pass applications.
- **For Drivers & Conductors**: Dedicated operational interfaces for turn-by-turn route navigation, speed safety telemetry, automated occupancy tracking, QR verification, and SOS emergency dispatch.
- **For Fleet Administrators**: Centralized control room dashboards, real-time fleet GPS tracking, automated passenger analytics, incident response, and AI-driven route optimization.

---

## ✨ Key Features

### 📱 Commuter Portal
- 🗺️ **Live Bus Tracking**: Real-time interactive Leaflet GIS map displaying live positions of active buses, live movement speed, occupancy levels, and route lines.
- 🎯 **Smart Journey Planner**: Multi-stop trip planner supporting key Ahilyanagar locations (*Savedi, Swastik Chowk, Market Yard, Railway Station, MIDC Nagapur, Maliwada, Bolhegaon*). Includes estimated trip duration, transfer details, and fare breakdown.
- 🎟️ **Digital QR Ticketing**: Instant ticket booking with dynamic QR code generation, fare calculator, booking history, and active ticket status.
- 💳 **Digital Bus Passes**: Apply, renew, and manage daily, monthly, student, and senior citizen bus passes with digital status verification.
- 🚏 **Bus Stop & Route Explorer**: Searchable timetables, upcoming arrival ETAs per stop, platform information, and route sequence visualization.
- ⭐ **Favorites & Notifications**: Bookmark frequently used routes and stops; receive real-time service disruption alerts and municipal transport announcements.
- 🌐 **Multilingual Support**: Seamless toggle between English and Marathi (मराठी) interfaces.

---

### 🚍 Driver Console
- 🛣️ **Turn-by-Turn Route Telemetry**: Interactive driver route map showing upcoming stops, current distance, and scheduled arrival targets.
- ⏱️ **Speed & Safety Monitoring**: Live speedometer with over-speed alerts and passenger headcount updates.
- 🚨 **One-Touch Emergency SOS**: Instant panic alert button sending exact GPS coordinates to the Central Control Room in case of accidents or vehicle breakdowns.
- 📋 **Shift Management**: Duty log counter, trip completion metrics, and break status controls.

---

### 🎟️ Conductor Portal
- 📷 **QR Code Scanner & Verifier**: On-device QR verification for passenger tickets and digital passes.
- 💵 **On-Board Fare Collection**: Quick cash/UPI ticket issuance with custom origin-destination selection.
- 📈 **Trip Collection Summary**: Real-time ticker of tickets sold, total revenue collected on current trip, and live passenger count.

---

### 📊 Admin Command Center & AI Insights
- 📡 **Live Fleet Tracking Grid**: City-wide map view displaying all active buses, route adherence, speed stats, and operational alerts.
- 🛣️ **Route & Schedule Management**: Create, edit, and assign routes, stops, schedules, and bus fleet deployments.
- 👥 **Fleet & Staff Allocation**: Monitor vehicle maintenance statuses, driver assignments, and conductor rosters.
- 📈 **Data Analytics & Reports**: Visualized passenger traffic trends, peak-hour congestion metrics, and revenue analytics using Recharts.
- 🤖 **AI Insights Engine**: Automated recommendations for crowd management, dynamic frequency adjustments, fuel consumption optimization, and predictive maintenance.
- 📢 **Incident Command & Announcements**: Centralized handling of emergency SOS calls, route diversions, and public transit announcements.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) | Modern UI component rendering with React 19 features |
| **Language** | [TypeScript ~6.0](https://www.typescriptlang.org/) | Type-safe application development |
| **Build System** | [Vite 8](https://vitejs.dev/) | Fast HMR dev server & optimized productionbundling |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS styling framework |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | Smooth UI transitions, gesture animations, and modals |
| **GIS & Mapping** | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) | Interactive vector maps, custom markers, and tile layers |
| **Charts & Visualization** | [Recharts](https://recharts.org/) | Responsive analytics charts and performance graphs |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean and modern open-source UI iconography |
| **Routing** | [React Router v7](https://reactrouter.com/) | Client-side routing with role-based guard layout |
| **State & Data Fetching**| [TanStack React Query v5](https://tanstack.com/query) | Async state management and cached data queries |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) | Validated input forms and dynamic schema checking |
| **Linter** | [Oxlint](https://oxc.rs/) | Ultra-fast JavaScript & TypeScript code linter |

---

## 📂 Project Architecture & Directory Structure

```text
ahilyanagar-city-bus/
├── public/                     # Static public assets (favicon, images)
├── src/
│   ├── assets/                 # App assets and icons
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Protected routes, modals, loaders, badges
│   │   ├── layout/             # Top navbar, sidebars, mobile bottom navigation
│   │   └── map/                # Leaflet map wrappers, bus markers, stop pins
│   ├── context/                # React contexts (Auth, Language, App State)
│   ├── data/                   # Mock data stores & city geospatial coordinates
│   │   ├── ahilyanagarLocations.ts # Landmarks & bus stop GPS coordinates
│   │   ├── mockAdminData.ts    # Analytics, fleet statistics, and staff rosters
│   │   ├── mockAuth.ts         # User profiles and demo authentication states
│   │   ├── mockBuses.ts        # Active bus status, speed, and GPS positions
│   │   ├── mockRoutes.ts       # City bus routes, timetables, and stop lists
│   │   └── mockStops.ts        # Bus stop details and line connections
│   ├── pages/                  # Page components structured by access portal
│   │   ├── admin/              # Admin dashboard layout & overview views
│   │   │   └── views/          # Analytics, Fleet, Routes, AI Insights views
│   │   ├── auth/               # Multi-role login & register page
│   │   ├── conductor/          # Conductor ticketing & scanner dashboard
│   │   ├── driver/             # Driver navigation & SOS emergency console
│   │   ├── BusPass.tsx         # Digital pass application page
│   │   ├── BusStopDetails.tsx  # Stop timetable and live arrival page
│   │   ├── Home.tsx            # Commuter home dashboard
│   │   ├── LiveTracking.tsx    # Live tracking map view
│   │   ├── PlanJourney.tsx     # Route & fare trip planner
│   │   ├── RouteDetails.tsx    # Route timeline and stop overview
│   │   └── Tickets.tsx         # Active tickets and QR generation
│   ├── types/                  # TypeScript interface & type definitions
│   ├── utils/                  # Helper utilities (distance calc, date formaters)
│   ├── App.tsx                 # Core App routes & Provider setup
│   └── main.tsx                # Entry point
├── index.html                  # HTML template with Google Fonts & Leaflet CSS
├── package.json                # Dependencies and npm script runner
├── tsconfig.json               # TypeScript compiler config
└── vite.config.ts              # Vite configuration with React plugin
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18.0.0 or higher) and npm installed on your machine.

```bash
node -v
npm -v
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ahilyanagar-city-bus.git
   cd ahilyanagar-city-bus
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

4. **Build for Production**:
   ```bash
   npm run build
   ```
   The optimized production bundle will be generated in the `dist` directory.

5. **Preview Production Build**:
   ```bash
   npm run preview
   ```

---

## 🔑 Demo Credentials & Role Access

The application features built-in multi-role authentication. On the login screen (`/login`), you can click the quick-select demo role buttons or use the following profiles:

| Role | Name | Default Start Route | Access Features |
| :--- | :--- | :--- | :--- |
| **Passenger** | Chirag Tapre | `/app/home` | Journey Planner, Live Tracking, Digital Tickets & Passes, Favorites |
| **Driver** | Rajesh Sharma | `/driver/dashboard` | Route Navigation, Speedometer, Stop Telemetry, One-Touch SOS Alert |
| **Conductor** | Amit Deshmukh | `/conductor/dashboard` | QR Scanner, Manual Ticket Issuer, Daily Fare Revenue Counter |
| **Admin** | Dr. Vikrant Kulkarni | `/admin/dashboard` | Fleet Monitoring, Route Management, Financial Analytics, AI Insights |
| **Operations Manager** | Suresh Patil | `/admin/operations` | Live Fleet Tracking Grid, Schedule Allocation & Dispatch Control |
| **Finance Manager** | Sunita Joshi | `/admin/finance` | Ticket Sales Reports, Revenue Performance & Pass Subscriptions |
| **Control Room** | Dispatch Officer | `/admin/control-room` | Emergency SOS Incident Handler, Breakdown Response, Announcements |

---

## 📍 Key Ahilyanagar Transit Routes

The project comes pre-configured with real Ahilyanagar urban bus corridors:

- 🛣️ **Route 12**: *Savedi Bus Stand ↔ Swastik Chowk ↔ Railway Station*
- 🛣️ **Route 15**: *Market Yard ↔ Maliwada Bus Stand ↔ MIDC Nagapur*
- 🛣️ **Route 08**: *Kedgaon ↔ Imperial Chowk ↔ Bolhegaon*
- 🛣️ **Route 21**: *Vambori ↔ Savedi ↔ Market Yard*

---

## 🧪 Scripts & Quality Assurance

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Runs TypeScript type check and builds for production |
| `npm run lint` | Runs Oxlint linter to verify code standards |
| `npm run preview` | Serves local production build for testing |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p center>
  Made with ❤️ for the citizens of <b>Ahilyanagar (Ahmednagar)</b>
</p>
