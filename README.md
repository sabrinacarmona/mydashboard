# Sabrina's Control Centre (v17.0) 🚀

A private, "Apple-Dark-Mode" inspired life-optimization dashboard designed for deep focus and intentionality.

This project evolved from a static links dashboard into a living, private intelligence hub that securely interacts with your Google Calendar, scans for upcoming travel, and provides real-time environmental context—all directly from your local machine, keeping you out of the corporate grid.

## Comprehensive Feature Set
We built this application from the ground up to replace heavy SaaS productivity tools. Here is everything currently implemented:

### 1. The Zenith Focus Mode (UI/UX)
- **Deep Work Toggle**: Press `<kbd>Enter Zen Mode</kbd>` (or hit `<kbd>F</kbd>`) to fade the entire dashboard into black.
- **Micro-Interactions**: Features a heavy `backdrop-filter: blur(15px)` glassmorphism, completely obscuring the dashboard and centering *only* your current active task alongside a live Pomodoro countdown.
- **macOS Midnight Aesthetic**: Custom UI explicitly defined with `#0A0A0B` backgrounds, `rgba(255, 255, 255, 0.05)` translucent cards, and Apple's `SF Pro` system typography.

### 2. Heads-Up Display (The HUD)
- **Live Clock**: Vanilla JS `setInterval` engine that ticks every second natively without React overhead.
- **Environmental Context**: Automatically fetches real-time London temperatures via the **Open-Meteo API**.
- **Emoji Mapping**: Intelligently converts WMO weather codes into native Unicode emojis (e.g., ☁️, ☀️, 🌧️) directly in the navigation bar.

### 3. Google API Integrations (Local & Private)
The backend (`server.js`) uses the official `googleapis` SDK, authenticating strictly via your local `credentials.json` and `token.json`. No databases, no external servers. 
- **The Intelligent Inbox (`/api/inbox`)**: Connects to the Gmail API (`q: 'in:inbox is:unread'`) to pull down your primary actionable emails for rapid Kanban triage.
- **The 30-Day Calendar (`/api/calendar`)**: Syncs with Google Calendar API to render a strict 30-day rolling timeline of your upcoming commitments.

### 4. Advanced Travel & Trip Engine (`/api/trips`)
- **Automated Scanning**: The Node server queries *all* of your connected Google Calendars for travel-related keywords (`Flight`, `Hotel`, `Train`, `TripIt`).
- **Regex Cleaning**: Cleans messy subject lines (e.g., stripping out "TripIt Pro alert:") to render clean destinations.
- **Chronological Sorting**: Algorithms sort the multi-calendar payloads chronologically so the most imminent trip always sits at the top of Column 2.

### 5. Gemini AI Auto-Scheduler (`/api/ai/schedule`)
- **Agentic Scheduling**: Hover over a Kanban task and hit `<kbd>X</kbd>`. The Express backend sends the task metadata alongside your *entire* 30-day Google Calendar payload to **Google's `gemini-2.5-pro`** model.
- **Smart Placement**: Gemini acts natively as an Executive Assistant, finding the optimal 30-to-60-minute gap in your schedule to execute the task, and returns the assigned Date/Time with its logical reasoning.

### 6. Local Kanban Engine
- **Zero Latency**: A fully functional Drag-and-Drop (`dragstart`, `dragover`, `drop`) KanBan board.
- **Persistence**: State is saved instantly to a local `tasks.json` file on your Macbook via `POST /api/tasks`.

---

## Setup & Installation

To run Sabrina's Control Centre locally:

1. **Install Node.js** (v18+ recommended).
2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Add Google Cloud Credentials**:
   - Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable the **Google Calendar API** and **Gmail API**.
   - Create an OAuth 2.0 Client ID (Desktop Application) and download the JSON file.
   - Rename the file to `credentials.json` and place it directly into the root folder of this repository. *(Note: This file is ignored by git).*

4. **Add Gemini Capabilities (Optional)**:
   - Create a `.env` file in the root directory.
   - Add your API key: `GEMINI_API_KEY=your_key_here`.

5. **Boot the Engine**:
   ```bash
   node server.js
   ```

6. **Launch & Authorize**:
   - Open a browser and navigate to `http://localhost:3000`.
   - On the very first launch, you will be prompted to click **Authorize with Google**. Follow the terminal/browser prompts to generate your local `token.json` file.
   - Enjoy the focused Control Centre.

---
*Built with ❤️ via Agentic AI.*
