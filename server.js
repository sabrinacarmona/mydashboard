const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

// --- Caching and Database Dependencies ---
const Database = require('better-sqlite3');
const NodeCache = require('node-cache');

let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn("⚠️  GEMINI_API_KEY not found in environment. Auto-Scheduling AI features will be disabled.");
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = process.env.RAILWAY_ENVIRONMENT ? '/data/token.json' : path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

// --- Initialization: Database ---
const DB_PATH = process.env.RAILWAY_ENVIRONMENT ? '/data/database.db' : path.join(__dirname, 'database.db');

// Ensure the directory exists before attempting to open the database
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    console.log(`[Database] Directory not found. Creating: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    context_mode TEXT DEFAULT 'both'
  );
  CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    title TEXT,
    completed INTEGER DEFAULT 0,
    lastResetDate TEXT
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    context_mode TEXT DEFAULT 'both'
  );
  CREATE TABLE IF NOT EXISTS pomodoros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    duration_minutes INTEGER,
    completed_at TEXT,
    task_id_optional TEXT
  );
`);

// --- Initialization: Cache ---
// TTL is 300 seconds (5 minutes)
const apiCache = new NodeCache({ stdTTL: 300 });

// --- One-Time Flat File to SQLite Migration ---
const TASKS_PATH = path.join(__dirname, 'tasks.json');
const RITUALS_PATH = path.join(__dirname, 'rituals.json');
const NOTES_PATH = path.join(__dirname, 'notes.json');

if (fs.existsSync(TASKS_PATH)) {
    try {
        const tasks = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO tasks (id, title, status) VALUES (@id, @title, @status)');
        const insertMany = db.transaction((txs) => {
            for (const t of txs) insert.run(t);
        });
        insertMany(tasks);
        fs.unlinkSync(TASKS_PATH);
        console.log("✅ Migrated tasks.json to SQLite and deleted file.");
    } catch (err) { console.error("Tasks migration failed:", err); }
}

if (fs.existsSync(RITUALS_PATH)) {
    try {
        const rituals = JSON.parse(fs.readFileSync(RITUALS_PATH, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO rituals (id, title, completed, lastResetDate) VALUES (@id, @title, @completed, @lastResetDate)');
        const insertMany = db.transaction((rits) => {
            for (const r of rits) insert.run({ ...r, completed: r.completed ? 1 : 0 });
        });
        insertMany(rituals);
        fs.unlinkSync(RITUALS_PATH);
        console.log("✅ Migrated rituals.json to SQLite and deleted file.");
    } catch (err) { console.error("Rituals migration failed:", err); }
} else {
    // Seed default rituals if table is empty
    const count = db.prepare("SELECT COUNT(*) as count FROM rituals").get().count;
    if (count === 0) {
        const today = new Date().toDateString();
        const stmt = db.prepare("INSERT INTO rituals (id, title, completed, lastResetDate) VALUES (?, ?, ?, ?)");
        db.transaction(() => {
            stmt.run("r1", "Drink a large glass of water", 0, today);
            stmt.run("r2", "10 minute stretching session", 0, today);
            stmt.run("r3", "Review Zenith Priority goals", 0, today);
        })();
    }
}

if (fs.existsSync(NOTES_PATH)) {
    try {
        const notes = JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
        db.prepare('INSERT OR REPLACE INTO notes (id, content) VALUES (1, ?)').run(notes.content || "");
        fs.unlinkSync(NOTES_PATH);
        console.log("✅ Migrated notes.json to SQLite and deleted file.");
    } catch (err) { console.error("Notes migration failed:", err); }
}

// Helper to get Google API Config
function getGoogleApiConfig() {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        return {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uris: [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback']
        };
    }
    if (fs.existsSync(CREDENTIALS_PATH)) {
        const content = fs.readFileSync(CREDENTIALS_PATH);
        const credentials = JSON.parse(content);
        return credentials.installed || credentials.web;
    }
    throw new Error('credentials.json not found and environment variables not set.');
}

// Helper wrapper to get OAuth2 Client
async function getOAuth2Client() {
    const { client_secret, client_id, redirect_uris } = getGoogleApiConfig();
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (process.env.GOOGLE_TOKEN_JSON) {
        oAuth2Client.setCredentials(JSON.parse(process.env.GOOGLE_TOKEN_JSON));
        return oAuth2Client;
    }
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
        const { client_secret, client_id, redirect_uris } = getGoogleApiConfig();
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
        const { client_secret, client_id, redirect_uris } = getGoogleApiConfig();
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Tasks Endpoints (SQLite) ---
app.get('/api/tasks', (req, res) => {
    const context = req.query.context || 'both';
    let tasks;
    if (context === 'both') {
        tasks = db.prepare('SELECT * FROM tasks').all();
    } else {
        tasks = db.prepare('SELECT * FROM tasks WHERE context_mode IN (?, "both")').all(context);
    }
    res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const tasks = req.body;
    const context = req.query.context || 'both';
    const insert = db.prepare('INSERT INTO tasks (id, title, status, context_mode) VALUES (@id, @title, @status, @context_mode)');

    // Batch replace strategy to match frontend Kanban arrays
    const transaction = db.transaction((txs) => {
        if (context === 'both') {
            db.prepare('DELETE FROM tasks').run();
        } else {
            db.prepare('DELETE FROM tasks WHERE context_mode = ?').run(context);
        }
        for (const t of txs) {
            insert.run({
                id: t.id,
                title: t.title,
                status: t.status,
                context_mode: t.context_mode || context
            });
        }
    });

    transaction(tasks);
    res.json({ success: true });
});

// --- Quick Notes Endpoints (SQLite) ---
app.get('/api/notes', (req, res) => {
    const context = req.query.context || 'both';
    let note = db.prepare('SELECT content FROM notes WHERE context_mode = ?').get(context);
    if (!note) {
        db.prepare("INSERT INTO notes (content, context_mode) VALUES ('', ?)").run(context);
        note = { content: "" };
    }
    res.json(note);
});

app.post('/api/notes', (req, res) => {
    const { content } = req.body;
    const context = req.query.context || 'both';

    let note = db.prepare('SELECT id FROM notes WHERE context_mode = ?').get(context);
    if (note) {
        db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content || "", note.id);
    } else {
        db.prepare('INSERT INTO notes (content, context_mode) VALUES (?, ?)').run(content || "", context);
    }
    res.json({ success: true });
});

// --- Daily Rituals Endpoints (SQLite) ---
app.get('/api/rituals', (req, res) => {
    const today = new Date().toDateString();
    const context = req.query.context || 'both';

    try {
        db.prepare('ALTER TABLE rituals ADD COLUMN context_mode TEXT DEFAULT "both"').run();
    } catch (e) { /* Column already exists */ }

    let rituals;
    if (context === 'both') {
        rituals = db.prepare('SELECT * FROM rituals').all();
    } else {
        rituals = db.prepare('SELECT * FROM rituals WHERE context_mode IN (?, "both")').all(context);
    }

    if (rituals.length > 0 && rituals[0].lastResetDate !== today) {
        db.prepare('UPDATE rituals SET completed = 0, lastResetDate = ?').run(today);
        if (context === 'both') {
            rituals = db.prepare('SELECT * FROM rituals').all(); // Fetch updated
        } else {
            rituals = db.prepare('SELECT * FROM rituals WHERE context_mode IN (?, "both")').all(context);
        }
    }

    res.json(rituals.map(r => ({ ...r, completed: r.completed === 1 })));
});

app.put('/api/rituals/:id', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    db.prepare('UPDATE rituals SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
    res.json({ success: true });
});

// --- Calendar Endpoint (Cached) ---
app.get('/api/calendar', async (req, res) => {
    const context = req.query.context || 'both';
    const cacheKey = `calendarData_${context}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
    }

    try {
        const auth = await getOAuth2Client();
        const calendar = google.calendar({ version: 'v3', auth });

        // Next 30 days window
        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);

        let calendarIds = ['primary']; // Default fallback

        if (context === 'professional') {
            calendarIds = process.env.PROFESSIONAL_CALENDAR_IDS ? process.env.PROFESSIONAL_CALENDAR_IDS.split(',') : ['primary'];
        } else if (context === 'personal') {
            calendarIds = process.env.PERSONAL_CALENDAR_IDS ? process.env.PERSONAL_CALENDAR_IDS.split(',') : ['primary'];
        } else {
            // Context 'both' -> Combine both
            const profCals = process.env.PROFESSIONAL_CALENDAR_IDS ? process.env.PROFESSIONAL_CALENDAR_IDS.split(',') : [];
            const persCals = process.env.PERSONAL_CALENDAR_IDS ? process.env.PERSONAL_CALENDAR_IDS.split(',') : ['primary'];
            calendarIds = Array.from(new Set([...profCals, ...persCals]));
            if (calendarIds.length === 0) calendarIds = ['primary'];
        }

        const eventsPromises = calendarIds.map(async (calendarId) => {
            try {
                const response = await calendar.events.list({
                    calendarId: calendarId.trim(),
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    maxResults: 15,
                    singleEvents: true,
                    orderBy: 'startTime',
                });
                return response.data.items;
            } catch (e) {
                console.error(`Failed to fetch from calendar ${calendarId}`, e.message);
                return [];
            }
        });

        const allItems = (await Promise.all(eventsPromises)).flat();

        // Sort the merged items by startTime and filter empty
        allItems.sort((a, b) => {
            const dateA = new Date(a.start.dateTime || a.start.date);
            const dateB = new Date(b.start.dateTime || b.start.date);
            return dateA - dateB;
        });

        const events = allItems.slice(0, 15).map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date
        }));

        res.setHeader('X-Cache', 'MISS');
        apiCache.set(cacheKey, events);
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message, requiresAuth: err.message.includes('authenticate') || err.message.includes('credentials.json') });
    }
});

// --- Inbox Endpoint (Cached) ---
app.get('/api/inbox', async (req, res) => {
    const cacheKey = 'inboxData';
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
    }

    try {
        const auth = await getOAuth2Client();
        const gmail = google.gmail({ version: 'v1', auth });

        // Get unread messages
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'in:inbox is:unread',
            maxResults: 5
        });

        if (!response.data.messages) {
            apiCache.set(cacheKey, []);
            return res.json([]);
        }

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

        res.setHeader('X-Cache', 'MISS');
        apiCache.set(cacheKey, messages);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message, requiresAuth: err.message.includes('authenticate') || err.message.includes('credentials.json') });
    }
});

// --- Trips Endpoint (Parsing Inbox & Calendar) ---
// Not heavily cached since it processes multiple calendars, maybe 5 min cache too.
app.get('/api/trips', async (req, res) => {
    const context = req.query.context || 'both';
    const cacheKey = `tripsData_${context}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedData);
    }

    try {
        const auth = await getOAuth2Client();
        const gmail = google.gmail({ version: 'v1', auth });
        const calendar = google.calendar({ version: 'v3', auth });

        const parseTrip = (subject, dateStrFallback) => {
            let tripType = 'flight';
            let cleanTitle = subject;
            const lower = subject.toLowerCase();

            if (lower.includes('hotel') || lower.includes('reservation') || lower.includes('stay') || lower.includes('airbnb')) {
                tripType = 'hotel';
            } else if (lower.includes('train')) {
                tripType = 'train';
            }

            cleanTitle = cleanTitle.replace("TripIt Pro alert: ", "")
                .replace("Gate update for ", "Gate Update: ")
                .replace("Departure summary for your flight to ", "Flight to ")
                .replace(": Travel Advisory - A terminal change for your upcoming flight", " (Terminal Change)")
                .replace("Reservation confirmed", "Hotel/Stay confirmed");

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

        let calendarIds = ['primary'];
        if (context === 'professional') {
            calendarIds = process.env.PROFESSIONAL_CALENDAR_IDS ? process.env.PROFESSIONAL_CALENDAR_IDS.split(',') : ['primary'];
        } else if (context === 'personal') {
            calendarIds = process.env.PERSONAL_CALENDAR_IDS ? process.env.PERSONAL_CALENDAR_IDS.split(',') : ['primary'];
        } else {
            const profCals = process.env.PROFESSIONAL_CALENDAR_IDS ? process.env.PROFESSIONAL_CALENDAR_IDS.split(',') : [];
            const persCals = process.env.PERSONAL_CALENDAR_IDS ? process.env.PERSONAL_CALENDAR_IDS.split(',') : ['primary'];
            calendarIds = Array.from(new Set([...profCals, ...persCals]));
            if (calendarIds.length === 0) calendarIds = ['primary'];
        }
        calendarIds = calendarIds.map(id => id.trim());

        const calListResponse = await calendar.calendarList.list();
        let targetCals = calListResponse.data.items;

        // Filter by context calendarIds if they are not 'primary' fallback
        if (calendarIds[0] !== 'primary') {
            targetCals = targetCals.filter(cal => calendarIds.includes(cal.id));
        }

        const calPromises = targetCals.map(cal => {
            return calendar.events.list({
                calendarId: cal.id,
                timeMin: new Date().toISOString(),
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

        const allCalTripsArrays = await Promise.all(calPromises);
        let allTrips = allCalTripsArrays.flat();

        allTrips.sort((a, b) => a.timestamp - b.timestamp);
        const results = allTrips.slice(0, 10);

        res.setHeader('X-Cache', 'MISS');
        apiCache.set(cacheKey, results);
        res.json(results);

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

        let responseText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();

        const suggestion = JSON.parse(responseText);
        res.json(suggestion);

    } catch (err) {
        console.error("AI Scheduling Error:", err);
        res.status(500).json({ error: 'Failed to generate AI schedule.' });
    }
});

// --- Pomodoro Endpoints ---
app.post('/api/pomodoros', express.json(), (req, res) => {
    try {
        const { duration_minutes, task_id_optional } = req.body;
        const insertPomodoro = db.prepare('INSERT INTO pomodoros (duration_minutes, completed_at, task_id_optional) VALUES (?, ?, ?)');
        const result = insertPomodoro.run(duration_minutes, new Date().toISOString(), task_id_optional || null);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Pomodoro logged successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to log Pomodoro' });
    }
});

app.get('/api/pomodoros/stats', (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const getStats = db.prepare(`
            SELECT 
                date(completed_at) as date,
                SUM(duration_minutes) as minutes
            FROM pomodoros
            WHERE date(completed_at) >= date(?)
            GROUP BY date(completed_at)
            ORDER BY date(completed_at) ASC
        `);

        const rawStats = getStats.all(sevenDaysAgo.toISOString());

        // Build 7-day array
        const heatmap = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(sevenDaysAgo.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];

            const existing = rawStats.find(r => r.date.startsWith(dateStr));
            heatmap.push({
                date: dateStr,
                minutes: existing ? existing.minutes : 0
            });
        }

        const todayStr = today.toISOString().split('T')[0];
        const todayMins = heatmap.find(h => h.date === todayStr)?.minutes || 0;

        res.json({
            today: todayMins,
            heatmap: heatmap
        });
    } catch (err) {
        console.error("Pomodoro Stats Error:", err);
        res.status(500).json({ error: 'Failed to fetch Pomodoro stats' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0 binding)`);
});
