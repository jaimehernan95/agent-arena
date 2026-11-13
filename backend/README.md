# Mirror Backend - AI Presentation/Interview Coach

Backend service for **Mirror**, built with FastAPI, Motor (Async MongoDB driver), Pydantic v2, and Google Gemini GenAI SDK. Designed for MongoDB Atlas Episodic Memory & Vector Search.

---

## Batch 1 & Batch 2 Architecture

### Agent Team Pipeline (`backend/agents/coach_engine.py`)
1. **Step A (Context Retrieval)**: Fetches the user's last 2 completed practice sessions from MongoDB Atlas `sessions` collection.
2. **Step B (Critic Agent)**: Evaluates performance strictly on observable signals (WPM, filler word breakdown, pause counts, camera gaze %).
   - **System Guardrail**: Strict filter prohibiting psychological/emotion diagnoses (`nervous`, `anxious`, `scared`, `unconfident`).
3. **Step C (Coach Agent with Episodic Memory)**: Performs longitudinal comparison against past practice sessions (e.g., filler word reductions, gaze stabilization, pace modulation).
4. **Step D (Drill Generator)**: Produces exactly 2 personalized 30-second exercises targeting specific weak points (`duration_sec: 30`).
5. **Step E (Embedding Generation)**: Computes a 768-dimensional dense vector representation using `text-embedding-004` via Google GenAI SDK.
6. **Step F (MongoDB Persistence)**: Writes the completed `UserSession` document into MongoDB Atlas.

---

## 🛠️ Configuration (`backend/.env`)

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
DB_NAME=mirror_db

# Google Gemini API Key for LLM Agents & Embeddings (text-embedding-004)
GEMINI_API_KEY=your_gemini_api_key_here

HOST=0.0.0.0
PORT=8000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Cluster connectivity ping & service health |
| `GET` | `/sessions/{user_id}/history` | Retrieve historical practice sessions |
| `POST` | `/api/v1/sessions/analyze` | Orchestrate Agent team, generate 768-dim vector, persist session, return scorecard & drills |
| `POST` | `/sessions/analyze` | Backward-compatible alias for frontend integration |

---

## 🧪 Testing

Run the agent pipeline test suite:
```bash
python backend/test_pipeline.py
```
Start the FastAPI API server:
```bash
uvicorn main:app --reload --port 8000
```
Interactive API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
