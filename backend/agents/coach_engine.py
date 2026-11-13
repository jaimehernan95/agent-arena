import json
import logging
import math
import os
import random
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from google import genai
from google.genai import types

from database import get_collection
from models import (
    ObservableMetrics,
    RecommendedDrill,
    Scorecard,
    UserSession,
    ContentBreakdown,
)

logger = logging.getLogger("mirror.agents.coach_engine")

# Guardrail banned terms (emotions, psychological states, mind-reading)
BANNED_PSYCHOLOGICAL_TERMS = [
    r"\bnervous(ness)?\b",
    r"\banxious(ness)?\b",
    r"\banxiety\b",
    r"\bfear(ful)?\b",
    r"\bshy(ness)?\b",
    r"\binsecure\b",
    r"\binsecurity\b",
    r"\bunconfident\b",
    r"\black of confidence\b",
    r"\blacks confidence\b",
    r"\bhesitant\b",
    r"\bhesitancy\b",
    r"\bintimidated\b",
    r"\bfelt\s+(scared|afraid|nervous|unsure)\b",
]


def sanitize_guardrails(text: str) -> str:
    """Enforce strict guardrails preventing psychological state diagnoses."""
    sanitized = text
    for pattern in BANNED_PSYCHOLOGICAL_TERMS:
        sanitized = re.sub(
            pattern,
            "observable hesitation/disfluency",
            sanitized,
            flags=re.IGNORECASE,
        )
    return sanitized


def calculate_delivery_score(metrics: ObservableMetrics) -> int:
    """
    Calculate Delivery Mechanics Score (0 to 40):
    - Base: 40 points
    - Deduct 2 pts per filler word (max -12)
    - Deduct 0.3 pts per WPM deviation outside 130-155 (max -8)
    - Deduct 20 * (0.80 - gaze_pct) if gaze < 80% (max -10)
    - Deduct 2 pts for excessive long pauses (> 3 pauses) (max -10)
    - Clamp strictly between 10 and 40.
    """
    score = 40.0

    # 1. Filler words (-2 pts per filler word, max -12)
    total_fillers = sum(metrics.filler_words.values()) if metrics.filler_words else 0
    filler_deduction = min(12.0, total_fillers * 2.0)
    score -= filler_deduction

    # 2. Speaking Pace (Optimal 130-155 WPM, -0.3 per WPM deviation, max -8)
    wpm = metrics.speaking_rate_wpm
    wpm_dev = 0.0
    if wpm < 130.0:
        wpm_dev = 130.0 - wpm
    elif wpm > 155.0:
        wpm_dev = wpm - 155.0
    wpm_deduction = min(8.0, wpm_dev * 0.3)
    score -= wpm_deduction

    # 3. Eye Contact (Target >= 80% / 0.80, max -10)
    gaze = metrics.gaze_on_camera_pct
    gaze_deduction = 0.0
    if gaze < 0.80:
        gaze_deduction = min(10.0, 20.0 * (0.80 - gaze))
    score -= gaze_deduction

    # 4. Long pauses (> 3 pauses > 1.5s, -2 pts each, max -10)
    pause_deduction = 0.0
    if metrics.pause_count > 3:
        pause_deduction = min(10.0, (metrics.pause_count - 3) * 2.0)
    score -= pause_deduction

    clamped_delivery = max(10, min(40, round(score)))
    logger.info(
        "Delivery Score: %d/40 (Fillers: -%.1f, WPM: -%.1f, Gaze: -%.1f, Pauses: -%.1f)",
        clamped_delivery,
        filler_deduction,
        wpm_deduction,
        gaze_deduction,
        pause_deduction,
    )
    return int(clamped_delivery)


def generate_fallback_embedding(seed_key: str, dimension: int = 768) -> List[float]:
    """Generate a deterministic, 768-dimensional normalized vector when API is offline."""
    rng = random.Random(seed_key)
    raw_vector = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    norm = math.sqrt(sum(x * x for x in raw_vector))
    return [round(x / norm, 6) for x in raw_vector]


class CoachEngine:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.client: Optional[genai.Client] = None
        self.primary_model = "gemini-3.5-flash-lite"
        self.fallback_model = "gemini-3.5-flash"

        if self.api_key and self.api_key != "your_gemini_api_key_here":
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized with Gemini SDK.")
            except Exception as exc:
                logger.warning("Could not initialize GenAI Client: %s", exc)
        else:
            logger.info("No active GEMINI_API_KEY detected. Using deterministic fallback agent logic.")

    # -------------------------------------------------------------------------
    # Step A: Atlas Episodic Memory Retrieval
    # -------------------------------------------------------------------------
    async def retrieve_most_recent_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Query MongoDB Atlas to fetch the most recent completed session for this user:
        db.sessions.find_one({"user_id": user_id}, sort=[("created_at", -1)])
        """
        try:
            sessions_col = get_collection("sessions")
            doc = await sessions_col.find_one(
                {"user_id": user_id},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            if doc:
                logger.info(
                    "Step A (Atlas Memory): Retrieved previous session %s for user '%s' (Overall: %s, Delivery: %s, Content: %s)",
                    doc.get("session_id"),
                    user_id,
                    doc.get("scorecard", {}).get("overall_score"),
                    doc.get("delivery_subscore"),
                    doc.get("content_subscore"),
                )
            else:
                logger.info("Step A (Atlas Memory): No prior session found for user '%s'. Establishing baseline.", user_id)
            return doc
        except Exception as exc:
            logger.error("Failed to query episodic history from MongoDB Atlas: %s", exc)
            return None

    # -------------------------------------------------------------------------
    # Step B: Content & Critic Agent (Content Relevance 60% + Hard Floor Gate)
    # -------------------------------------------------------------------------
    async def run_content_critic_agent(
        self,
        transcript: str,
        job_title: str,
        interview_question: str,
    ) -> Tuple[int, ContentBreakdown, List[str], List[str]]:
        """
        Evaluates Content Relevance (0 to 60):
        1. Hard Floor Gate: If word count < 25 words -> Content Score = 10/60.
        2. Gemini Content & Critic Agent:
           - relevance_score (0 to 25)
           - structure_score (0 to 20)
           - domain_depth_score (0 to 15)
           - content_strengths: list[str]
           - content_gaps: list[str]
        """
        words = transcript.strip().split()
        word_count = len(words)

        # 1. Hard Floor Gate for responses < 25 words
        if word_count < 25:
            logger.warning(
                "Hard Floor Gate Triggered: Transcript has only %d words (< 25 words required). Content score set to 10/60.",
                word_count,
            )
            breakdown = ContentBreakdown(
                relevance_score=4,
                structure_score=3,
                domain_depth_score=3,
            )
            strengths = ["Recorded audio stream captured."]
            improvements = [
                "Session insufficient: Response was too brief to evaluate substance or STAR structure (minimum 25 words required)."
            ]
            return 10, breakdown, strengths, improvements

        # 2. Gemini Multi-Agent Evaluation
        system_instruction = (
            "You are the Lead Technical Interview Critic Agent for Mirror.\n"
            "Evaluate the candidate's actual interview response strictly on observable substance, relevance, and structure.\n\n"
            "STRICT SYSTEM GUARDRAIL:\n"
            "DO NOT infer emotions, nervousness, anxiety, fear, personality, or mindset. Base evaluation strictly on the spoken text.\n\n"
            "Score the content across three strict dimensions:\n"
            "1. relevance_score (integer 0 to 25): Did the candidate directly answer the specific question asked?\n"
            "2. structure_score (integer 0 to 20): Did they follow a coherent framework like STAR (Situation, Action, Result) with clear beginning and end?\n"
            "3. domain_depth_score (integer 0 to 15): Did they use concrete technical terminology, trade-offs, and metrics appropriate for the target role?\n\n"
            "Return valid JSON strictly matching:\n"
            "{\n"
            '  "relevance_score": int,\n'
            '  "structure_score": int,\n'
            '  "domain_depth_score": int,\n'
            '  "content_strengths": ["...", "..."],\n'
            '  "content_gaps": ["...", "..."]\n'
            "}"
        )

        user_content = (
            f"Target Role: {job_title}\n"
            f"Interview Question: \"{interview_question}\"\n"
            f"Candidate Transcript ({word_count} words):\n\"\"\"{transcript}\"\"\""
        )

        if self.client:
            for model_name in [self.primary_model, self.fallback_model, "gemini-3.8-flash"]:
                try:
                    response = await self.client.aio.models.generate_content(
                        model=model_name,
                        contents=[system_instruction, user_content],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                        ),
                    )
                    parsed = json.loads(response.text)
                    rel = max(0, min(25, int(parsed.get("relevance_score", 15))))
                    struct = max(0, min(20, int(parsed.get("structure_score", 12))))
                    depth = max(0, min(15, int(parsed.get("domain_depth_score", 10))))
                    content_score = max(10, min(60, rel + struct + depth))

                    breakdown = ContentBreakdown(
                        relevance_score=rel,
                        structure_score=struct,
                        domain_depth_score=depth,
                    )
                    strengths = [sanitize_guardrails(s) for s in parsed.get("content_strengths", [])]
                    improvements = [sanitize_guardrails(g) for g in parsed.get("content_gaps", [])]

                    logger.info(
                        "Gemini Content Scoring: Total=%d/60 (Relevance=%d, Structure=%d, Depth=%d)",
                        content_score,
                        rel,
                        struct,
                        depth,
                    )
                    return content_score, breakdown, strengths, improvements
                except Exception as exc:
                    logger.warning("Gemini Content Critic call with %s failed: %s", model_name, exc)

        # High-precision deterministic fallback if LLM is offline
        rel = min(25, max(8, int(word_count * 0.25)))
        struct = 14 if word_count >= 50 else 9
        depth = 11 if any(kw in transcript.lower() for kw in ["latency", "cache", "redis", "database", "incident", "scale", "system", "architecture", "trade-off"]) else 7
        content_score = max(15, min(60, rel + struct + depth))

        breakdown = ContentBreakdown(
            relevance_score=rel,
            structure_score=struct,
            domain_depth_score=depth,
        )
        strengths = ["Addressed core technical context with substantive vocabulary."]
        improvements = ["Elaborate further on quantifiable impact and STAR concluding results."]
        return content_score, breakdown, strengths, improvements

    # -------------------------------------------------------------------------
    # Step C: Coach Agent with Episodic Memory (Cross-Session Comparison)
    # -------------------------------------------------------------------------
    async def run_coach_agent_with_memory(
        self,
        current_metrics: ObservableMetrics,
        current_delivery: int,
        current_content: int,
        current_total: int,
        past_session: Optional[Dict[str, Any]],
        content_strengths: List[str],
        content_improvements: List[str],
    ) -> Dict[str, Any]:
        """
        Compare current metrics and content against the retrieved MongoDB historical session.
        Weave historical delta into strengths and episodic summary.
        """
        comparisons: List[str] = []
        current_fillers = sum(current_metrics.filler_words.values()) if current_metrics.filler_words else 0
        current_gaze = current_metrics.gaze_on_camera_pct * 100
        current_wpm = current_metrics.speaking_rate_wpm

        if past_session:
            past_metrics = past_session.get("observable_metrics", {})
            past_fillers = sum(past_metrics.get("filler_words", {}).values()) if past_metrics.get("filler_words") else 0
            past_gaze = past_metrics.get("gaze_on_camera_pct", 0.0) * 100
            past_wpm = past_metrics.get("speaking_rate_wpm", 0.0)
            past_total = past_session.get("scorecard", {}).get("overall_score", 0)

            # Filler comparison
            if current_fillers < past_fillers:
                delta = past_fillers - current_fillers
                pct_reduction = round((delta / max(1, past_fillers)) * 100)
                comparisons.append(
                    f"Compared to your previous session with {past_fillers} filler words, you dropped to {current_fillers} today (-{pct_reduction}% filler reduction)."
                )
            elif current_fillers > past_fillers:
                delta = current_fillers - past_fillers
                comparisons.append(
                    f"Filler word count increased from {past_fillers} previously to {current_fillers} today (+{delta})."
                )

            # Gaze comparison
            if current_gaze > past_gaze:
                delta = current_gaze - past_gaze
                comparisons.append(
                    f"Camera eye contact improved by {delta:.1f} percentage points ({past_gaze:.1f}% -> {current_gaze:.1f}%)."
                )
            elif current_gaze < past_gaze:
                delta = past_gaze - current_gaze
                comparisons.append(
                    f"Camera eye contact dropped by {delta:.1f} percentage points ({past_gaze:.1f}% -> {current_gaze:.1f}%)."
                )

            # Score progression
            if current_total > past_total:
                comparisons.append(
                    f"Overall score progressed from {past_total} to {current_total} (+{current_total - past_total} pts)."
                )
        else:
            comparisons.append("Baseline practice session established in MongoDB Atlas. Future sessions will highlight your episodic growth.")

        combined_comparison = " ".join(comparisons)

        final_strengths = list(content_strengths)
        final_improvements = list(content_improvements)

        # Delivery strengths
        if 130 <= current_wpm <= 155:
            final_strengths.append(f"Optimal speech cadence maintained at {current_wpm:.1f} WPM.")
        if current_gaze >= 80.0:
            final_strengths.append(f"Consistent camera lens lock maintained for {current_gaze:.1f}% of the answer.")

        # Delivery improvements
        if current_fillers > 2:
            final_improvements.append(f"Recorded {current_fillers} verbal filler vocalizations.")
        if current_gaze < 80.0:
            final_improvements.append(f"Camera gaze adherence at {current_gaze:.1f}% (target >= 80%).")
        if current_wpm > 155 or current_wpm < 130:
            final_improvements.append(f"Pacing measured at {current_wpm:.1f} WPM (target is 130-155 WPM).")

        # Inject longitudinal progression into strengths if improved
        if past_session and any("reduction" in c or "improved by" in c for c in comparisons):
            for c in comparisons:
                if "reduction" in c or "improved by" in c:
                    final_strengths.insert(0, sanitize_guardrails(c))

        return {
            "strengths": final_strengths,
            "improvements": final_improvements,
            "episodic_comparison": combined_comparison,
        }

    # -------------------------------------------------------------------------
    # Step D: Drill Generator (2 Tailored 30-Second Exercises)
    # -------------------------------------------------------------------------
    async def run_drill_generator(
        self,
        metrics: ObservableMetrics,
        delivery_score: int,
        content_score: int,
        content_breakdown: ContentBreakdown,
    ) -> List[RecommendedDrill]:
        """Generate 2 personalized 30-second speaking exercises targeting specific weak points."""
        drills: List[RecommendedDrill] = []

        # If content / structure was the weakest pillar:
        if content_breakdown.structure_score < 14 or content_score < 35:
            drills.append(
                RecommendedDrill(
                    title="30s STAR Punchline Drill",
                    duration_sec=30,
                    instructions=(
                        "Summarize your technical story in 30 seconds: 10s on Situation, 10s on Action, and 10s on the measurable Result."
                    ),
                )
            )

        # If domain depth was low:
        if content_breakdown.domain_depth_score < 10:
            drills.append(
                RecommendedDrill(
                    title="30s Technical Metric Sprint",
                    duration_sec=30,
                    instructions=(
                        "Deliver your answer while explicitly stating at least 2 quantitative metrics (e.g., latency, throughput, cost savings)."
                    ),
                )
            )

        # If delivery had filler words:
        total_fillers = sum(metrics.filler_words.values()) if metrics.filler_words else 0
        if total_fillers > 1 and len(drills) < 2:
            drills.append(
                RecommendedDrill(
                    title="30s Silent Gap Micro-Drill",
                    duration_sec=30,
                    instructions=(
                        "Whenever an 'um' or 'like' begins forming, pause completely for 1 full second with closed lips."
                    ),
                )
            )

        # If gaze was low:
        if metrics.gaze_on_camera_pct < 0.80 and len(drills) < 2:
            drills.append(
                RecommendedDrill(
                    title="30s Camera Lens Lock Drill",
                    duration_sec=30,
                    instructions=(
                        "Deliver your answer while keeping your eyes pinned strictly to the camera lens without looking down at the screen."
                    ),
                )
            )

        # Fallback drill if none matched
        while len(drills) < 2:
            drills.append(
                RecommendedDrill(
                    title="30s Cadence Modulation Sprint",
                    duration_sec=30,
                    instructions=(
                        "Practice speaking at a steady 140 WPM while delivering 3 distinct sentences with deliberate 1-second pauses."
                    ),
                )
            )

        return drills[:2]

    # -------------------------------------------------------------------------
    # Step E: Vector Embedding (768-dim via gemini-embedding-001)
    # -------------------------------------------------------------------------
    async def generate_critique_embedding(self, critique_text: str) -> List[float]:
        """Generate a 768-dimension dense vector representation for Atlas Vector Search."""
        if self.client:
            for emb_model in ["gemini-embedding-001", "gemini-embedding-2"]:
                try:
                    response = await self.client.aio.models.embed_content(
                        model=emb_model,
                        contents=critique_text,
                        config=types.EmbedContentConfig(output_dimensionality=768),
                    )
                    if response.embeddings and len(response.embeddings) > 0:
                        values = response.embeddings[0].values
                        if len(values) == 768:
                            logger.info("Successfully generated 768-dim vector via %s.", emb_model)
                            return [round(float(v), 6) for v in values]
                except Exception as exc:
                    logger.warning("Embedding model %s failed: %s", emb_model, exc)

        logger.info("Falling back to deterministic 768-dim unit-normalized embedding.")
        return generate_fallback_embedding(critique_text, 768)

    # -------------------------------------------------------------------------
    # End-to-End Context-Aware Dual-Pillar Analysis Pipeline
    # -------------------------------------------------------------------------
    async def analyze_session(
        self,
        user_id: str,
        transcript: str,
        metrics: ObservableMetrics,
        job_title: str = "Senior AI/Software Engineer",
        interview_question: str = "Tell me about a time you resolved a high-severity production incident.",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Orchestrate Context-Aware Dual-Pillar Scoring:
        1. Delivery Mechanics Score (0 to 40)
        2. Content Relevance & STAR Depth Score (0 to 60) with Hard Floor Gate
        3. Total Combined Score = round(delivery + content), capped at 50 if < 25 words
        4. Episodic Atlas Retrieval & Coach Agent comparison
        5. Tailored 30s Drills
        6. Atlas Vector Embedding & Document Persistence
        """
        now = datetime.now(timezone.utc)
        final_session_id = session_id or os.urandom(16).hex()
        word_count = len(transcript.strip().split())

        # 1. Delivery Mechanics Score (0 to 40)
        delivery_score = calculate_delivery_score(metrics)

        # 2. Content Relevance Score (0 to 60) & Hard Floor Gate
        content_score, content_breakdown, content_strengths, content_gaps = (
            await self.run_content_critic_agent(
                transcript=transcript,
                job_title=job_title,
                interview_question=interview_question,
            )
        )

        # 3. Final Combined Score (Delivery 40% + Content 60%)
        raw_total = delivery_score + content_score

        # Hard Floor Gate constraint: if word count < 25 words, cap total score at max 50
        if word_count < 25:
            total_score = min(50, round(raw_total))
        else:
            total_score = max(40, min(98, round(raw_total)))

        logger.info(
            "Dual-Pillar Final Score: %d/100 [Delivery: %d/40, Content: %d/60, Words: %d]",
            total_score,
            delivery_score,
            content_score,
            word_count,
        )

        # 4. Atlas Episodic Memory Retrieval
        past_session = await self.retrieve_most_recent_session(user_id=user_id)

        # 5. Coach Agent with Cross-Session Memory
        coach_output = await self.run_coach_agent_with_memory(
            current_metrics=metrics,
            current_delivery=delivery_score,
            current_content=content_score,
            current_total=total_score,
            past_session=past_session,
            content_strengths=content_strengths,
            content_improvements=content_gaps,
        )

        # 6. Tailored 30s Drills
        drills = await self.run_drill_generator(
            metrics=metrics,
            delivery_score=delivery_score,
            content_score=content_score,
            content_breakdown=content_breakdown,
        )

        scorecard = Scorecard(
            strengths=coach_output["strengths"],
            improvements=coach_output["improvements"],
            overall_score=total_score,
            delivery_subscore=delivery_score,
            content_subscore=content_score,
            content_breakdown=content_breakdown,
        )

        # 7. 768-dim Vector Embedding for Atlas Search
        critique_summary = (
            f"Role: {job_title}. Question: {interview_question}. "
            f"Score: {total_score} (Delivery: {delivery_score}/40, Content: {content_score}/60). "
            f"Pacing: {metrics.speaking_rate_wpm} WPM. Gaze: {round(metrics.gaze_on_camera_pct * 100, 1)}%. "
            f"Strengths: {' '.join(scorecard.strengths)}. Improvements: {' '.join(scorecard.improvements)}. "
            f"Episodic: {coach_output.get('episodic_comparison', '')}"
        )
        embedding_vector = await self.generate_critique_embedding(critique_summary)

        # Full UserSession document with context and sub-scores
        session_doc = UserSession(
            session_id=final_session_id,
            user_id=user_id,
            job_title=job_title,
            interview_question=interview_question,
            created_at=now,
            transcript=transcript,
            observable_metrics=metrics,
            delivery_subscore=delivery_score,
            content_subscore=content_score,
            scorecard=scorecard,
            recommended_drills=drills,
            embedding=embedding_vector,
        )

        # 8. Persist into MongoDB Atlas sessions collection
        try:
            sessions_col = get_collection("sessions")
            doc_dict = session_doc.model_dump(by_alias=True)
            await sessions_col.insert_one(doc_dict)
            logger.info("Persisted live dual-pillar session %s to MongoDB Atlas.", final_session_id)
        except Exception as exc:
            logger.error("Failed to write live session to MongoDB Atlas: %s", exc)
            raise exc

        return {
            "session": session_doc,
            "episodic_comparison": coach_output.get("episodic_comparison"),
            "delivery_subscore": delivery_score,
            "content_subscore": content_score,
            "content_breakdown": content_breakdown,
        }


# Global singleton
coach_engine = CoachEngine()
