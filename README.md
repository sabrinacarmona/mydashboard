# Sabrina's Control Centre (v17.0) 🚀

A private, "Apple-Dark-Mode" inspired life-optimization dashboard designed for deep focus and intentionality.

This project evolved from a static links dashboard into a living, private intelligence hub that securely interacts with your Google Calendar, scans for upcoming travel, and provides real-time environmental context—all directly from your local machine, keeping you out of the corporate grid.

## Core Features
1. **Zenith Focus Mode**: Hit `<kbd>Enter Zen Mode</kbd>` to fade the entire dashboard into black, highlighting only your current active task alongside a live Pomodoro countdown to prevent context switching.
2. **Heads-Up Display (HUD)**: A seamless glassmorphism navigation widget tracking real-time local Time, Date, and live Weather (powered by Open-Meteo).
3. **3-Column Architecture**:
   - **Actionable Inbox**: Automatically syncs your primary unread Google Mail (Gmail) messages to the frontend for rapid triage.
   - **Kanban Tasks & Trips**: A drag-and-drop board for `Focus / Doing` and `Next Up / Todo`. Your tasks are saved locally (`tasks.json`). Underneath, a chronological list of your upcoming Flights & Hotels (synced from your personal Google Calendars).
   - **Events (Calendar)**: A rolling 30-day view of your Google Calendar commitments.

## Architecture & Tech Stack
- **Frontend**: Lightweight HTML, Vanilla JavaScript, and Tailwind CSS (via CDN).
- **Aesthetic**: Custom macOS "Midnight" Black (`#000000`), heavy `backdrop-filter: blur(20px)` glassmorphism, and Apple's `SF Pro` typography.
- **Backend**: A local Vanilla Node.js / Express server running on `localhost:3000`.
- **Security First**: The server securely handles the Google OAuth 2.0 flow natively. Your `credentials.json` and generated `token.json` are strictly `.gitignore`d—ensuring your sensitive Cloud API access never leaves your Macbook.

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

4. **Boot the Engine**:
   ```bash
   node server.js
   ```

5. **Launch & Authorize**:
   - Open a browser and navigate to `http://localhost:3000`.
   - On the very first launch, you will be prompted to click **Authorize with Google**. Follow the terminal/browser prompts to generate your local `token.json` file.
   - Enjoy the focused Control Centre.

---
*Built with ❤️ via Agentic AI.*
