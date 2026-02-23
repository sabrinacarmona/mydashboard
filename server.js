const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn("⚠️  GEMINI_API_KEY not found in environment. Auto-Scheduling AI features will be disabled.");
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TASKS_PATH = path.join(__dirname, 'tasks.json');

// Helper wrapper to get OAuth2 Client
async function getOAuth2Client() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('credentials.json not found. Please download it from Google Cloud Console.');
    }
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }
    throw new Error('Not authenticated. Please authorize the app.');
}

// Generate Auth URL
app.get('/api/auth/url', (req, res) => {
    try {
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            return res.status(400).json({ error: 'credentials.json not found' });
        }
        const content = fs.readFileSync(CREDENTIALS_PATH);
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        res.json({ url: authUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Exchange Code for Token
app.post('/api/auth/token', async (req, res) => {
    const { code } = req.body;
    try {
        const content = fs.readFileSync(CREDENTIALS_PATH);
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tasks Endpoints (Local JSON)
app.get('/api/tasks', (req, res) => {
    if (!fs.existsSync(TASKS_PATH)) {
        fs.writeFileSync(TASKS_PATH, JSON.stringify([]));
    }
    const tasks = JSON.parse(fs.readFileSync(TASKS_PATH));
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const tasks = req.body;
    fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
    res.json({ success: true });
});

// Calendar Endpoint
app.get('/api/calendar', async (req, res) => {
    try {
        const auth = await getOAuth2Client();
        const calendar = google.calendar({ version: 'v3', auth });

        // Next 30 days window
        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 15,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date
        }));

        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message, requiresAuth: err.message.includes('authenticate') || err.message.includes('credentials.json') });
    }
});

// Inbox Endpoint
app.get('/api/inbox', async (req, res) => {
    try {
        const auth = await getOAuth2Client();
        const gmail = google.gmail({ version: 'v1', auth });

        // Get unread messages
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'in:inbox is:unread',
            maxResults: 5
        });

        if (!response.data.messages) return res.json([]);

        const messages = await Promise.all(response.data.messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
            });
            const headers = detail.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
            return { id: msg.id, snippet: detail.data.snippet, subject, from };
        }));

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message, requiresAuth: err.message.includes('authenticate') || err.message.includes('credentials.json') });
    }
});

// Trips Endpoint (Parsing Inbox & Calendar)
app.get('/api/trips', async (req, res) => {
    try {
        const auth = await getOAuth2Client();
        const gmail = google.gmail({ version: 'v1', auth });
        const calendar = google.calendar({ version: 'v3', auth });

        // Helper to parse subject into clean metadata
        const parseTrip = (subject, dateStrFallback) => {
            let tripType = 'flight';
            let cleanTitle = subject;
            const lower = subject.toLowerCase();

            if (lower.includes('hotel') || lower.includes('reservation') || lower.includes('stay') || lower.includes('airbnb')) {
                tripType = 'hotel';
            } else if (lower.includes('train')) {
                tripType = 'train';
            }

            // Clean title words
            cleanTitle = cleanTitle.replace("TripIt Pro alert: ", "")
                .replace("Gate update for ", "Gate Update: ")
                .replace("Departure summary for your flight to ", "Flight to ")
                .replace(": Travel Advisory - A terminal change for your upcoming flight", " (Terminal Change)")
                .replace("Reservation confirmed", "Hotel/Stay confirmed");

            // Look for inline dates like "on 11/2/2026" or "for Saturday, Feb 14"
            let extractedDate = dateStrFallback;
            const dateMatch = cleanTitle.match(/on (\d{1,2}\/\d{1,2}\/\d{4})/);
            if (dateMatch) {
                extractedDate = dateMatch[1];
                cleanTitle = cleanTitle.replace(dateMatch[0], "").trim();
            } else if (cleanTitle.match(/for (([A-Z][a-z]+),\s+([A-Z][a-z]+)\s+\d+)/i)) {
                const m = cleanTitle.match(/for (([A-Z][a-z]+),\s+([A-Z][a-z]+)\s+\d+)/i);
                extractedDate = m[1];
                cleanTitle = cleanTitle.replace(m[0], "").trim();
            }

            return { tripType, cleanTitle, extractedDate };
        };

        // Fetch Google Calendar Travel Events across ALL calendars
        const calListResponse = await calendar.calendarList.list();
        const calPromises = calListResponse.data.items.map(cal => {
            return calendar.events.list({
                calendarId: cal.id,
                timeMin: new Date().toISOString(), // Only pull future events
                timeMax: new Date(new Date().setDate(new Date().getDate() + 90)).toISOString(),
                maxResults: 50,
                singleEvents: true,
                orderBy: 'startTime',
            }).then(response => {
                if (!response.data.items) return [];
                const travelEvents = response.data.items.filter(e => {
                    const text = (e.summary + " " + (e.description || "")).toLowerCase();
                    return ['flight', 'train', 'hotel', 'travelperk', 'tripit', 'rental', 'reservation'].some(kw => text.includes(kw));
                });
                return travelEvents.map(e => {
                    const start = e.start.dateTime || e.start.date;
                    const formattedDate = new Date(start).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    const parsed = parseTrip(e.summary || "Upcoming Trip", formattedDate);
                    parsed.extractedDate = formattedDate;

                    return {
                        id: e.id,
                        subject: parsed.cleanTitle,
                        dateStr: parsed.extractedDate,
                        tripType: parsed.tripType,
                        timestamp: new Date(start).getTime()
                    };
                });
            }).catch(err => { console.error(`Calendar ${cal.summary} Trips Error:`, err); return []; });
        });

        // Await all calendar promises and flatten
        const allCalTripsArrays = await Promise.all(calPromises);
        let allTrips = allCalTripsArrays.flat();

        // Sort chronologically (earliest first)
        // Since we want upcoming trips, we'll sort by timestamp ascending
        allTrips.sort((a, b) => a.timestamp - b.timestamp);

        res.json(allTrips.slice(0, 10)); // return top 10

    } catch (err) {
        res.status(500).json({ error: err.message, requiresAuth: err.message.includes('authenticate') || err.message.includes('credentials.json') });
    }
});

// AI Auto-Scheduling Endpoint
app.post('/api/ai/schedule', async (req, res) => {
    try {
        const { taskTitle, calendarEvents } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: 'Gemini API Key is missing. Please add it to your .env file.' });
        }

        const prompt = `
You are an intelligent executive assistant like Sunsama.
Your goal is to look at a user's task and their upcoming calendar schedule, and determine the BEST 30-minute to 1-hour time slot for them to complete this task.
The user works roughly 9 AM to 5 PM. Do not schedule tasks during their existing calendar events. Do not schedule tasks in the past.
Assume today is ${new Date().toLocaleDateString()} and the time is ${new Date().toLocaleTimeString()}.

Task to schedule: "${taskTitle}"

User's upcoming calendar events:
${JSON.stringify(calendarEvents, null, 2)}

Respond with ONLY a valid JSON object in the exact following format, with no markdown formatting or extra text:
{
  "recommendedTime": "YYYY-MM-DDTHH:MM:SSZ",
  "reasoning": "A short, 1-sentence explanation of why you chose this time."
}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        // Strip markdown if it returned any
        let responseText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();

        const suggestion = JSON.parse(responseText);
        res.json(suggestion);

    } catch (err) {
        console.error("AI Scheduling Error:", err);
        res.status(500).json({ error: 'Failed to generate AI schedule.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
