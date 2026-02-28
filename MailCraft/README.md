# MailCraft

Transform rough thoughts into polished emails with AI.

MailCraft uses the Claude API to turn your quick notes and ideas into well-crafted emails. Choose from 8 tones — professional, warm, concise, friendly, formal, persuasive, apologetic, or grateful — and get a finished email in seconds.

## Setup

1. **Clone and install dependencies**

```bash
cd mailcraft
npm install
```

2. **Add your Anthropic API key**

Copy the example env file and add your key:

```bash
cp .env.example .env
```

Open `.env` and replace `your_key_here` with your actual API key from [console.anthropic.com](https://console.anthropic.com/).

3. **Start the dev server**

```bash
npm run dev
```

The app opens at `http://localhost:5173`.

## Usage

1. Type your rough thoughts into the main text area
2. Optionally paste an email you're replying to
3. Pick a tone
4. Hit **Generate Email**
5. Copy the result to your clipboard with one click

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Anthropic Claude API (streaming)

## Notes

- The API key is used client-side via the Anthropic JS SDK with `dangerouslyAllowBrowser: true`. This is fine for local development but should not be deployed to production without a backend proxy.
- The app uses the `claude-sonnet-4-6` model.
