# Voice Clone & Text-to-Speech Agent (HeyGen)

A web-based Text-to-Speech (TTS) and Voice Cloning studio powered by HeyGen models via OpenRouter (`heygen/heygen-voice-1-turbo:free`).

## 🌐 Live Demo

You can use and test the application directly in your browser without cloning the repo or running anything locally:

👉 **[https://voice-clone-text-to-speech-agent-he.vercel.app/](https://voice-clone-text-to-speech-agent-he.vercel.app/)**

### Using Your Own API Key in the Live Demo:
1. Visit the [live demo website](https://voice-clone-text-to-speech-agent-he.vercel.app/).
2. Click the **Settings (⚙️ gear icon)** in the top navigation bar.
3. Select **Manual** mode.
4. Paste your [OpenRouter API Key](https://openrouter.ai/keys) (`sk-or-v1-...`) and click **Save**.
5. Your key remains strictly in your local browser session and is sent only with your synthesis requests. You can now generate voiceovers and clone voices instantly!

---

## Features

- **Preset Voice Synthesis**: Generate high-quality speech using a variety of built-in voice styles.
- **Voice Cloning**: Provide or upload custom reference audio to clone and synthesise speech in that specific voice.
- **Custom API Key Support**: Toggle between server-managed keys or manual client-provided keys per session.
- **Modern Dark UI**: Clean, responsive interface with waveform preview, multi-segment audio merge, and audio export.
- **Lightweight Backend**: Fast Node.js / Express proxy handling audio streaming and API authentication securely.

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML5, Modern CSS, Vanilla JavaScript
- **API**: OpenRouter (`heygen/heygen-voice-1-turbo:free`)

---

## Getting Started (Local Setup)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- An [OpenRouter API Key](https://openrouter.ai/keys)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vedavyas1235/Voice-clone-text-to-speech-agent-Heygen.git
   cd Voice-clone-text-to-speech-agent-Heygen
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your OpenRouter API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   PORT=3000
   ```

4. **Start the application**:
   ```bash
   npm start
   ```
   Or for development mode with automatic reload:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
├── public/              # Client-side web interface
│   ├── favicon.ico      # Application favicon (ICO format)
│   ├── favicon.svg      # Cute themed vector favicon (SVG format)
│   └── index.html       # Single-page UI with audio controls & playback
├── .env.example         # Template for environment variables
├── .gitignore           # Ignored files (node_modules, .env, etc.)
├── package.json         # Project metadata and dependencies
├── server.js            # Express server & OpenRouter API integration
└── README.md            # Documentation
```

## License

ISC
