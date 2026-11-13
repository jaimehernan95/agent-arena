import logging
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from database import connect_to_mongo, close_mongo_connection, get_collection, get_database
from models import (
    UserSession,
    HistoryResponse,
    AnalyzeSessionRequest,
    AnalyzeSessionResponse,
)
from agents.coach_engine import coach_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mirror.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB Atlas connection pool
    logger.info("Starting Mirror API service...")
    try:
        await connect_to_mongo()
        logger.info("Connected to MongoDB Atlas successfully.")
    except Exception as exc:
        logger.warning(
            "Initial MongoDB Atlas connection attempt failed: %s. "
            "Endpoints will attempt connection on demand.",
            exc
        )
    yield
    # Shutdown: Close MongoDB Atlas connection pool
    logger.info("Shutting down Mirror API service...")
    await close_mongo_connection()


app = FastAPI(
    title="Mirror AI Coach - Backend API",
    description="AI presentation and interview coach with MongoDB Atlas Episodic Memory & Vector Search.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    """Verify service health and active MongoDB Atlas cluster connectivity."""
    try:
        db = get_database()
        await db.command("ping")
        return {
            "status": "healthy",
            "database": db.name,
            "mongo_connected": True,
            "message": "Mirror API is operational and connected to MongoDB Atlas."
        }
    except Exception as exc:
        logger.error("Health check MongoDB ping failed: %s", exc)
        return {
            "status": "degraded",
            "database": None,
            "mongo_connected": False,
            "error": str(exc),
            "message": "FastAPI is running, but MongoDB Atlas is unreachable. Verify MONGO_URI in .env."
        }


@app.get(
    "/sessions/{user_id}/history",
    response_model=HistoryResponse,
    tags=["Sessions"]
)
async def get_user_session_history(user_id: str):
    """Retrieve all historical practice sessions for a user, sorted by recency."""
    try:
        sessions_col = get_collection("sessions")
        cursor = sessions_col.find(
            {"user_id": user_id},
            {"_id": 0}  # Exclude MongoDB ObjectId for clean Pydantic parsing
        ).sort("created_at", -1)

        sessions_data = await cursor.to_list(length=100)
        sessions = [UserSession(**doc) for doc in sessions_data]

        return HistoryResponse(
            user_id=user_id,
            total_sessions=len(sessions),
            sessions=sessions
        )
    except Exception as exc:
        logger.error("Failed to retrieve session history for user '%s': %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying session history: {str(exc)}"
        )


@app.post(
    "/api/v1/sessions/analyze",
    response_model=AnalyzeSessionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Analysis"]
)
async def analyze_session_endpoint(payload: AnalyzeSessionRequest):
    """
    Run multi-agent critique, episodic memory comparison, and drill generation.
    Generates 768-dim vector embedding and persists completed session into MongoDB Atlas.
    """
    try:
        logger.info(
            "Received session analysis request for user: '%s' (Transcript len: %d)",
            payload.user_id,
            len(payload.transcript)
        )

        analysis_result = await coach_engine.analyze_session(
            user_id=payload.user_id,
            transcript=payload.transcript,
            metrics=payload.observable_metrics,
            job_title=payload.job_title or "Senior AI/Software Engineer",
            interview_question=payload.interview_question or "Tell me about a time you resolved a high-severity production incident.",
            session_id=payload.session_id,
        )

        session_doc: UserSession = analysis_result["session"]
        episodic_comparison = analysis_result.get("episodic_comparison")

        return AnalyzeSessionResponse(
            session_id=session_doc.session_id,
            user_id=session_doc.user_id,
            job_title=session_doc.job_title,
            interview_question=session_doc.interview_question,
            created_at=session_doc.created_at,
            transcript=session_doc.transcript,
            observable_metrics=session_doc.observable_metrics,
            delivery_subscore=session_doc.delivery_subscore,
            content_subscore=session_doc.content_subscore,
            scorecard=session_doc.scorecard,
            recommended_drills=session_doc.recommended_drills,
            episodic_comparison=episodic_comparison,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Analysis pipeline failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent analysis pipeline error: {str(exc)}"
        )


# Backward-compatible alias for Next.js frontend calls to /sessions/analyze
@app.post(
    "/sessions/analyze",
    response_model=AnalyzeSessionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
async def analyze_session_legacy_alias(payload: AnalyzeSessionRequest):
    return await analyze_session_endpoint(payload)


if __name__ == "__main__":
    import uvicorn
    import os

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
