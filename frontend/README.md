# Mirror Frontend - Practice Studio & Analysis Scorecard

Client application for **Mirror**, built with Next.js (App Router), Tailwind CSS, TypeScript, and MediaPipe Vision running via WebAssembly.

---

## 🚀 Batch 3 & 4 Architecture

- **Practice Studio (`/practice`)**:
  - Live webcam preview with high-performance overlay `<canvas>`.
  - On-device eye gaze tracking via `@mediapipe/tasks-vision` (FaceLandmarker) running directly in the browser via WebAssembly.
  - Multi-bar audio visualizer reflecting live microphone volume.
  - 60-second countdown timer with **Start Practice** and **Finish Early** controls.
  - Real-time observable signal telemetry:
    - Camera Gaze Lock percentage (`gaze_on_camera_pct`)
    - Speaking Rate words per minute (`speaking_rate_wpm`)
    - Verbal filler frequency tally (`filler_words`)
    - Awkward pause intervals &gt; 1.5 seconds (`pause_count`)
    - Live transcribed speech stream

- **Submission Flow & Agent Synthesis Loading Screen**:
  - Polished multi-step loading overlay simulating live multi-agent execution:
    - *Step A: Context Retrieval (Atlas Episodic Memory)*
    - *Step B: Critic Agent (Evaluating Observable Signals)*
    - *Step C: Coach Agent (Cross-Session Comparison)*
    - *Step D: Drill Generator (30s Practice Assembly)*
  - Submits observable metrics payload to `POST /api/v1/sessions/analyze`.

- **Scorecard Modal (`components/ScorecardModal.tsx`)**:
  - Circular SVG score gauge (0–100) with dynamic gradient styling.
  - Speaking pace badge with target benchmarks (130–150 WPM).
  - Verbal filler word tag cloud with counts.
  - Eye-contact &amp; camera gaze stability bar.
  - **Episodic Growth Panel**: Displays longitudinal progression vs previous practice sessions retrieved from MongoDB Atlas.
  - **Interactive 30-Second Micro-Drills**: Interactive cards with **"Start 30s Drill"** actions that automatically reset the Practice Studio timer to 30 seconds and activate targeted drill mode.
  - **Responsible AI Guarantee Badge**: Highlights that raw video is never transmitted or stored, and analysis focuses strictly on observable presentation signals without diagnosing psychological states.

---

## 🏃‍♂️ How to Run

1. Start the FastAPI backend:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. Start the Next.js frontend:
   ```bash
   cd frontend
   pnpm dev
   ```

3. Open [http://localhost:3000/practice](http://localhost:3000/practice).
