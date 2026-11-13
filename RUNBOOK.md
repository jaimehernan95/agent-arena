# Mirror - AI Presentation & Interview Coach
## Hackathon Demo Day Runbook & Judge Pitch Guide

---

## ⚡ 1. Rapid Pre-Flight Checklist

Ensure your environment variables are configured:
- **`backend/.env`**:
  ```env
  MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
  DB_NAME=mirror_db
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
- **`frontend/.env.local`**:
  ```env
  NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
  NEXT_PUBLIC_DEMO_MODE=true
  ```

---

## 🚀 2. Startup Terminal Commands

Open two terminal windows:

### Terminal 1: FastAPI Backend
```bash
cd backend
python seed_history.py
uvicorn main:app --reload --port 8000
```
- **Health Verification**: [http://localhost:8000/health](http://localhost:8000/health) (returns `status: "healthy"` and verifies Atlas cluster ping)
- **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Next.js Frontend
```bash
cd frontend
npm run dev
```
- **Live Practice Studio**: [http://localhost:3000/practice](http://localhost:3000/practice)

---

## 🛡️ 3. Demo Day Safety & Fail-Safe Mode

Hackathon Wi-Fi is notoriously unreliable. Mirror includes an instant fail-safe:
- **Header Toggle**: Click the **"Demo Mode: ARMED (Wi-Fi Safe)"** button in the studio header to toggle between **LIVE API** and **OFFLINE DEMO**.
- **Instant Response**: When armed, Mirror loads `demo_mode.json` immediately with full stepper animation and realistic metrics, guaranteeing zero lag and zero downtime in front of judges.

---

## ⏱️ 4. The 60-Second Live Judge Pitch Script

> **Setting the Stage**: Open [http://localhost:3000/practice](http://localhost:3000/practice) in Chrome/Brave. Position yourself in front of the webcam.

---

### [00:00 - 00:15] The Problem & The Privacy Guarantee
> *"Good morning, judges. Public speaking and technical interviews cause immense anxiety, but existing AI coaches violate user privacy by streaming and storing raw webcam video in the cloud.*
> 
> *Meet **Mirror**—the AI presentation coach built on a strict **Responsible AI Guarantee**: zero raw video frames ever leave your device. Using **MediaPipe running on WebAssembly in the browser**, we track eye-gaze lock and speech patterns 100% locally."*
> 
> **Action**: Click **"Start 60s Practice"**. Point out the green **"WASM Ready"** pill and the live **"Gaze on Camera"** reticle tracking your pupils in real time.

---

### [00:15 - 00:35] Live Speech & Observable Telemetry
> *"Watch our live telemetry. As I speak at a measured 140 words per minute, the audio visualizer reflects my pitch and our on-device speech engine tracks pauses, cadence, and filler words without making psychological guesses. Our system guardrail strictly analyzes observable signals."*
> 
> **Action**: Speak for 10-15 seconds answering an engineering question:
> *"In our architecture, we introduced Redis as an asynchronous write-behind cache, reducing p99 latency from 4.2 seconds down to 85 milliseconds."*
> 
> **Action**: Glance down away from the camera for 2 seconds to show the status pill turn yellow (*"Gaze Shifted Away"*), then look back to camera (*"Gaze Locked on Camera"*).
> 
> **Action**: Click **"Finish Early & Analyze"**.

---

### [00:35 - 00:50] The Agent Team & MongoDB Atlas Episodic Memory
> *"Now, our Agent Team activates: Step A retrieves our historical practice sessions from **MongoDB Atlas**; Step B runs our Critic Agent; Step C runs our Coach Agent with **Episodic Memory**; and Step D embeds the critique with 768-dimensional vectors for Atlas Vector Search.*
> 
> *Here is the breakthrough: **Episodic Growth**. Unlike ChatGPT which has amnesia between sessions, MongoDB Atlas provides longitudinal memory. Notice this insight: **'Compared to your session yesterday with 8 filler words, you dropped to 1 today. Camera gaze improved by 27%.'**"*
> 
> **Action**: Point to the **Episodic Growth Panel (MongoDB Atlas Memory)** on the Scorecard.

---

### [00:50 - 01:00] Closing the Loop: 30-Second Micro-Drills
> *"Finally, Mirror doesn't just critique—it builds muscle memory. The agent generated two personalized 30-second drills targeting my exact weaknesses.*
> 
> *With one click on **'Start 30s Drill'**, the studio immediately recalibrates the timer and launches targeted practice. That is Mirror: Private, Episodic, and Actionable AI on MongoDB Atlas."*
> 
> **Action**: Click **"Start 30s Drill"** on the modal to show the studio timer reset to 30s with the active drill banner displayed.

---

## 🗄️ 5. MongoDB Atlas Indexing Script

To index the `sessions` collection for 768-dimensional Vector Search:
```bash
mongosh "<YOUR_ATLAS_CONNECTION_STRING>" mongodb_atlas_setup.js
```
The script creates:
- Standard compound index: `{ user_id: 1, created_at: -1 }`
- Unique index: `{ session_id: 1 }`
- Atlas Vector Search definition: `vector_index` (Cosine similarity, 768 dimensions)
