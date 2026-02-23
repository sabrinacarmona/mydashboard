# Personal-OS v2.0

A "Sunsama-style" Personal Life Optimization Dashboard designed for deep focus and intentionality.

This project transitions from a static links dashboard into a living, private intelligence hub that securely interacts with your Google Calendar and Gmail directly from your local machine, keeping you out of the corporate grid.

## Core Features
1. **Zen Mode**: A CSS-driven focus mode that fades the entire dashboard into black and highlights only your current active task to prevent context switching.
2. **3-Column Architecture**:
   - **Kanban Tasks**: A drag-and-drop board for To-Do, Doing, and Done. Data is saved locally to avoid third-party servers.
   - **Rolling Schedule**: A seamless 3-day view of your Google Calendar.
   - **Intelligent Inbox**: Fetches your latest unread actionable emails and automatically scans for upcoming Flight/Hotel confirmations to build a Travel itinerary.

## Architecture
- **Frontend**: Lightweight HTML, Vanilla JavaScript, and Tailwind CSS (via CDN).
- **Backend**: A local Node.js / Express server running on `localhost:3000`.
- **Security**: The server handles the Google OAuth 2.0 flow natively. Your `credentials.json` and generated `token.json` are strictly `.gitignored` ensuring this sensitive access remains only on your Macbook.
- **Task Storage**: A local `tasks.json` database.

## Prerequisites
To run Personal-OS v2.0 on your machine, you need:
1. Node.js installed.
2. A `credentials.json` file from Google Cloud Console placed in the root directory (see Setup below).

## Setup & Installation

1. **Clone the repository** (if not already local)
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Add Google Credentials**:
   Place your OAuth 2.0 `credentials.json` directly into the root folder. (Ensure this file is in `.gitignore`).
4. **Start the Engine**:
   ```bash
   node server.js
   ```
5. **Launch**:
   Open a browser and navigate to `http://localhost:3000`. Click "Authorize with Google" on first launch to connect your accounts.
