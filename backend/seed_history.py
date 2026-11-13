import asyncio
import logging
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List

from database import connect_to_mongo, close_mongo_connection, get_collection
from models import ObservableMetrics, Scorecard, RecommendedDrill, UserSession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mirror.seed")


def generate_deterministic_embedding(seed_key: str, dimension: int = 768) -> List[float]:
    """
    Generate a deterministic, unit-normalized vector of specified dimension.
    Provides valid dense 768-dim vector embeddings compatible with MongoDB Atlas Vector Search.
    """
    rng = random.Random(seed_key)
    raw_vector = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    norm = math.sqrt(sum(x * x for x in raw_vector))
    return [round(x / norm, 6) for x in raw_vector]


async def seed_demo_history():
    """Seeds 2 realistic previous practice sessions for 'demo_speaker_1' into MongoDB Atlas."""
    logger.info("Connecting to MongoDB Atlas to seed episodic memory...")
    try:
        await connect_to_mongo()
    except Exception as exc:
        logger.error(
            "\n[!] Failed to connect to MongoDB Atlas: %s\n"
            "Please ensure your MONGO_URI in 'backend/.env' is configured with your Atlas credentials.",
            exc
        )
        return

    sessions_col = get_collection("sessions")
    demo_user = "demo_speaker_1"

    # Base reference timestamps
    now = datetime.now(timezone.utc)
    session_1_time = now - timedelta(days=3, hours=4)
    session_2_time = now - timedelta(days=1, hours=2)

    # Session 1: Earlier attempt with higher nerves, rapid pace, and filler words
    session_1 = UserSession(
        session_id="a1b2c3d4-e5f6-7a8b-9c0d-111111111111",
        user_id=demo_user,
        created_at=session_1_time,
        transcript=(
            "Hi, um, thank you for having me today. So, like, in my last role as a senior backend engineer, "
            "we faced a pretty major bottleneck when our database write queries started spiking during flash sales. "
            "Um, essentially what happened was our primary replica hit 98% CPU utilization, and like, transactions "
            "were getting queued up for over 4 seconds. So I proposed that we introduce Redis as a write-behind cache "
            "and partition the hot tenant tables. It was, you know, kind of challenging because we had to ensure "
            "zero data loss during failover, but we eventually reduced p99 latency from 4200 milliseconds down to "
            "around 85 milliseconds. Um, so yeah, that's basically how we solved it."
        ),
        observable_metrics=ObservableMetrics(
            speaking_rate_wpm=168.5,
            pause_count=7,
            filler_words={"um": 4, "like": 3, "you know": 1},
            gaze_on_camera_pct=0.64
        ),
        scorecard=Scorecard(
            strengths=[
                "Strong technical architecture depth and concrete latency metrics cited",
                "Clear problem statement detailing CPU bottleneck and write queue impact"
            ],
            improvements=[
                "Reduce reliance on filler words ('um', 'like') during technical transitions",
                "Lower speaking rate from 168 WPM to 135-145 WPM for improved executive presence",
                "Increase direct camera eye contact (currently 64%) to project confidence"
            ],
            overall_score=68
        ),
        recommended_drills=[
            RecommendedDrill(
                title="Silent Pause Replacement Drill",
                duration_sec=120,
                instructions="Answer a technical prompt. Whenever you feel the urge to speak a filler word ('um', 'like'), pause completely for 1 full second instead of vocalizing."
            ),
            RecommendedDrill(
                title="Webcam Lens Lock Drill",
                duration_sec=180,
                instructions="Place a small colored sticky dot right next to your webcam lens. Deliver your project overview while keeping your gaze pinned to the dot."
            )
        ],
        embedding=generate_deterministic_embedding("demo_speaker_1_session_1", 768)
    )

    # Session 2: Follow-up attempt showing tangible progression
    session_2 = UserSession(
        session_id="a1b2c3d4-e5f6-7a8b-9c0d-222222222222",
        user_id=demo_user,
        created_at=session_2_time,
        transcript=(
            "Good morning. I'd like to walk you through how our engineering team resolved a critical production "
            "outage caused by cascading timeouts across our microservices. When our payment gateway experienced "
            "an unexpected downstream latency spike, worker threads across our order processing cluster became exhausted. "
            "I immediately led the implementation of circuit breakers using Resilience4j and introduced graceful degradation "
            "with fallbacks. Furthermore, we decoupled asynchronous notifications through Kafka topics. "
            "This prevented cascading service failures and maintained 99.98% platform availability even during partial outages."
        ),
        observable_metrics=ObservableMetrics(
            speaking_rate_wpm=138.0,
            pause_count=3,
            filler_words={"um": 1},
            gaze_on_camera_pct=0.89
        ),
        scorecard=Scorecard(
            strengths=[
                "Superb pacing (138 WPM) providing authoritative cadence and clarity",
                "Significant reduction in filler words compared to previous session",
                "Maintained excellent eye contact with the camera (89%) throughout the response",
                "Structured answer using situation-action-result narrative flow"
            ],
            improvements=[
                "Quantify the specific business impact or revenue protected during the incident recovery"
            ],
            overall_score=88
        ),
        recommended_drills=[
            RecommendedDrill(
                title="Business Impact Punchline Drill",
                duration_sec=90,
                instructions="Deliver a concise 30-second concluding summary emphasizing revenue, cost, or customer satisfaction impact."
            )
        ],
        embedding=generate_deterministic_embedding("demo_speaker_1_session_2", 768)
    )

    # Upsert both demo sessions to prevent duplicate accumulation during repeated runs
    seed_sessions = [session_1, session_2]

    for session in seed_sessions:
        doc = session.model_dump(by_alias=True)
        # Ensure created_at is stored as datetime in MongoDB
        await sessions_col.update_one(
            {"session_id": session.session_id},
            {"$set": doc},
            upsert=True
        )
        logger.info(
            "✓ Upserted session: %s (Score: %d, Created: %s)",
            session.session_id,
            session.scorecard.overall_score,
            session.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )

    # Verify count in Atlas collection
    total_demo_docs = await sessions_col.count_documents({"user_id": demo_user})
    logger.info("=" * 60)
    logger.info("Episodic Memory Seeding Complete!")
    logger.info("User: %s", demo_user)
    logger.info("Total sessions in database for %s: %d", demo_user, total_demo_docs)
    logger.info("Vector embedding dimensions: 768 (Atlas Vector Search ready)")
    logger.info("=" * 60)

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed_demo_history())
