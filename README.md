# PitchPerfect — Real-Time AI Presentation Coach
**An AI-powered web app that listens as you present, analyses your speech in real time, and gives you specific coaching tips after every slide — all in your browser.**

## What is PitchPerfect?

PitchPerfect is a **full-stack AI SaaS web application** that acts as your personal presentation coach. You upload your slides as a PDF, click **Start Presenting**, and speak normally into your laptop mic.

After your presentation ends, you are automatically redirected to a **full analytics report** — overall score, pace charts, filler breakdown, and a slide-by-slide review of every tip the AI gave you.
No hardware. No wearables. No downloads. Just your browser, your slides, and an AI coach.

### ⚡ Real-time during presentation

| Feature | Description |
|---------|-------------|
| 🎙️ Live mic capture | Browser MediaRecorder API records in 4-second chunks |
| 📝 Live transcription | OpenAI Whisper converts speech to text in ~2 seconds |
| ⚡ WPM tracking | Rolling average across last 5 chunks, colour coded green/yellow/red |
| 🚫 Filler detection | Catches um, uh, basically, like, you know, sort of and 10+ more |
| 💪 Confidence scoring | Detects hedging phrases: I think, maybe, kind of, I guess |
| 📡 Sub-4s feedback | Socket.io WebSocket delivers metrics instantly |

### 🤖 AI coaching after each slide

| Feature | Description |
|---------|-------------|
| ReAct agent | LangChain agent reasons across 4 tools before writing tip |
| Specific tips | Mentions actual numbers: "You said um 3 times" not "avoid fillers" |
| Colour coded | Tip labelled by top issue: Pace / Fillers / Confidence / Clarity |
| Loading state | Spinner shows while agent is thinking so user knows it's working |

### 📊 Post-session report

| Feature | Description |
|---------|-------------|
| Overall score | Weighted score out of 100 combining WPM, fillers, confidence |
| Pace chart | Recharts line graph showing WPM across all slides |
| Filler chart | Bar chart showing filler count per slide |
| Confidence chart | Line graph showing confidence trend across slides |
| Slide breakdown | Click any slide to see transcript + AI tip |
| Best/worst slide | Highlighted automatically based on scores |
| MongoDB persistence | All sessions saved — view past presentations anytime |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| Vite | 5 | Build tool and dev server |
| PDF.js | 4 | Render PDF slides in browser |
| Socket.io-client | 4 | Real-time WebSocket connection |
| Recharts | 2 | Analytics charts on report page |
| React Router | 6 | Client-side page navigation |
| Axios | 1 | HTTP requests to Express API |

### Backend (Node.js)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Express.js | 4 | REST API server |
| Socket.io | 4 | WebSocket server for real-time events |
| Mongoose | 7 | MongoDB ODM |
| Multer | 1 | PDF file upload handling |
| fluent-ffmpeg | 2 | Convert webm → wav for Whisper |
| ffmpeg-static | 5 | Bundled ffmpeg binary (no PATH setup) |
| node-fetch | 2 | HTTP calls to Python service |
| form-data | 4 | Multipart form for audio upload |
| dotenv | 16 | Environment variable management |
| nodemon | 3 | Auto-restart on file changes |

### AI Layer (Python)
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.104 | Python HTTP server |
| Uvicorn | 0.24 | ASGI server for FastAPI |
| OpenAI Whisper | latest | Speech-to-text model |
| python-multipart | 0.0.6 | File upload parsing |

### LangChain (Node.js)
| Technology | Purpose |
|-----------|---------|
| @langchain/core | Tool base classes (DynamicTool) |
| @langchain/openai | ChatOpenAI LLM wrapper |
| langchain | AgentExecutor, createReactAgent |
| GPT-4o-mini | LLM for coaching tip generation |

### Database
| Technology | Purpose |
|-----------|---------|
| MongoDB | Session storage, slides, metrics, tips, reports |


## Project Structure

```
pitchperfect/
│
├── server/                          # Node.js + Express backend
│   ├── index.js                     # Entry point: Express + Socket.io setup
│   ├── .env                         # Environment variables (never commit this)
│   │
│   ├── models/
│   │   └── Session.js               # Mongoose schema: sessions + slides + report
│   │
│   ├── routes/
│   │   └── sessions.js              # REST routes: create, get, report
│   │
│   ├── socket/
│   │   └── handlers.js              # ALL real-time logic: audio → transcribe → tools → agent
│   │
│   ├── langchain/
│   │   ├── tools.js                 # 4 DynamicTool objects (WPM, fillers, confidence, clarity)
│   │   └── agent.js                 # ReAct agent: createReactAgent + AgentExecutor
│   │
│   ├── utils/
│   │   └── transcribe.js            # ffmpeg webm→wav conversion + Python HTTP call
│   │
│   └── uploads/                     # PDF files saved here by Multer
│
├── client/                          # React frontend (Vite)
│   └── src/
│       ├── App.jsx                  # BrowserRouter with 3 routes
│       ├── index.css                # Global reset + dark theme + animations
│       │
│       ├── api/
│       │   └── sessions.js          # All Axios calls in one place
│       │
│       ├── hooks/
│       │   └── useSocket.js         # Socket.io connection, all real-time state
│       │
│       ├── components/
│       │   ├── SlideViewer.jsx      # PDF.js: load PDF → render page on canvas
│       │   ├── MetricsPanel.jsx     # WPM + filler + confidence display with bars
│       │   ├── CoachPanel.jsx       # AI tip display with loading spinner
│       │   └── AudioCapture.jsx     # MediaRecorder mic capture, 4-sec chunks
│       │
│       └── pages/
│           ├── UploadPage.jsx       # Title input + PDF upload + session create
│           ├── PresenterPage.jsx    # 3-panel layout: slides + metrics + coach
│           └── ReportPage.jsx       # Full analytics: score + charts + breakdown
│
└── ai-service/                      # Python FastAPI + Whisper
    └── main.py                      # /health + /transcribe endpoints + hallucination filter


## Running the Project

You need **4 terminal windows** running simultaneously. Always start in this order:

### Terminal 1 — MongoDB

### Terminal 2 — Express + Socket.io server

```bash
cd pitchperfect/server
npm run dev
```

✅ Success:
```
✅ MongoDB connected
✅ Server + Socket.io running on port 5000
✅ Python Whisper service running on port 8001
```

### Terminal 3 — Python Whisper service

```bash
cd pitchperfect/ai-service
uvicorn main:app --reload --port 8001
```

✅ Success:
```
🔄 Loading Whisper model...
✅ Whisper model loaded and ready
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Terminal 4 — React frontend

```bash
cd pitchperfect/client
npm run dev
```

✅ Success:
```
VITE v5.x.x  ready in 300ms
➜  Local:   http://localhost:5173/
```



## API Reference

### REST Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/sessions` | `form-data: { title, totalSlides, file }` | `{ session }` |
| `GET` | `/api/sessions` | — | `[sessions]` |
| `GET` | `/api/sessions/:id` | — | `{ session }` |
| `GET` | `/api/sessions/:id/report` | — | `{ session with slides + finalReport }` |
| `GET` | `/api/health` | — | `{ status: "ok" }` |

### Socket.io Events

#### Client → Server

| Event | Payload | When |
|-------|---------|------|
| `join_session` | `{ sessionId }` | On page load |
| `audio_chunk` | `{ audioData, slideIndex, sessionId }` | Every 4 seconds |
| `slide_change` | `{ sessionId, completedSlide, newSlide }` | On Next click |
| `end_session` | `{ sessionId }` | On Stop click |

#### Server → Client

| Event | Payload | When |
|-------|---------|------|
| `session_joined` | `{ sessionId, message }` | After join confirmed |
| `transcript_update` | `{ text, slideIndex }` | After Whisper transcribes |
| `metrics_update` | `{ wpm, fillers, confidence, ... }` | After tools run |
| `coaching_tip` | `{ tip, slideIndex, loading, topIssue }` | After agent runs |
| `session_ended` | `{ sessionId }` | After MongoDB save |

### Python Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `GET` | `/health` | — | `{ status: "ok", model: "whisper-base" }` |
| `POST` | `/transcribe` | `multipart: { file: wav/webm }` | `{ success, text }` |

---


🌟 Your Full-Stack Architecture is Complete:
Service	Host	Live Production URL	Status
Frontend Client (React/Vite)	Vercel	https://pitchperfect-client-sand.vercel.app	🟢 Live
Backend Server (Express/Sockets)	Render	https://pitchperfect-server.onrender.com	🟢 Live
AI Service (Whisper/FastAPI)	Render	https://pitchperfect-ai-service.onrender.com	🟢 Live
Database	MongoDB Atlas	cluster0.sawcooj.mongodb.net	🟢 Connected


## What Each Terminal Shows

### Terminal 1 — MongoDB


### Terminal 2 — Express server (most activity)

### Terminal 4 — React (Vite)



## Tech Keywords (for recruiters)

```
React · Node.js · Express.js · MongoDB · Mongoose · Socket.io · Python · FastAPI
LangChain · ReAct agent · Tool calling · RAG · OpenAI Whisper · GPT-4o-mini
PDF.js · Recharts · Vite · JWT · ffmpeg · Docker · REST API · WebSocket
MediaRecorder API · Real-time systems · Microservices · Polyglot architecture
```

---



## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Built By

**Nitya** — Final Year B.Tech Project, 2026

> *"Built to solve a problem every student faces — presenting with confidence."*
