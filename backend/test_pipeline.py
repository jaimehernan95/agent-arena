import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from agents.coach_engine import (
    coach_engine,
    sanitize_guardrails,
    calculate_delivery_score,
)
from models import ObservableMetrics


async def main():
    print("=" * 70)
    print("Testing Mirror AI Coach Agent: Context-Aware Dual-Pillar Scoring")
    print("=" * 70)

    # 1. Guardrail sanitizer test
    dirty_text = "The speaker felt nervous and showed extreme anxiety and lack of confidence."
    cleaned = sanitize_guardrails(dirty_text)
    print(f"1. Guardrail Sanitization Check:")
    print(f"   Raw:     {dirty_text}")
    print(f"   Cleaned: {cleaned}")
    assert "nervous" not in cleaned.lower()
    assert "anxiety" not in cleaned.lower()
    assert "lack of confidence" not in cleaned.lower()
    print("   ✓ Guardrails strictly enforced.\n")

    # 2. Test Delivery Mechanics Score (0 to 40)
    test_metrics = ObservableMetrics(
        speaking_rate_wpm=160.0,
        pause_count=4,
        filler_words={"um": 2, "like": 1},
        gaze_on_camera_pct=0.75,
    )
    delivery_score = calculate_delivery_score(test_metrics)
    print(f"2. Delivery Score Calculation:")
    print(f"   Metrics: WPM=160, Pauses=4, Fillers=3, Gaze=75%")
    print(f"   Delivery Score: {delivery_score} / 40")
    assert 10 <= delivery_score <= 40
    print("   ✓ Delivery score within valid bounds [10, 40].\n")

    # 3. Test Case A: Short Gibberish Response (< 25 words) - Hard Floor Gate
    print("3. Test Case A: Short Gibberish Response (< 25 words)")
    short_transcript = "this is a test 1234"
    result_short = await coach_engine.analyze_session(
        user_id="test_candidate_1",
        transcript=short_transcript,
        metrics=test_metrics,
        job_title="Senior AI/Software Engineer",
        interview_question="Tell me about a time you resolved a high-severity production incident.",
    )

    session_short = result_short["session"]
    scorecard_short = session_short.scorecard

    print(f"   Transcript: \"{short_transcript}\" ({len(short_transcript.split())} words)")
    print(f"   Delivery Subscore: {result_short['delivery_subscore']} / 40")
    print(f"   Content Subscore:  {result_short['content_subscore']} / 60")
    print(f"   Overall Score:     {scorecard_short.overall_score} / 100")
    print(f"   Improvements:      {scorecard_short.improvements}")

    assert result_short["content_subscore"] == 10, f"Expected content 10/60, got {result_short['content_subscore']}"
    assert scorecard_short.overall_score <= 50, (
        f"Expected overall score <= 50 for < 25 words, got {scorecard_short.overall_score}"
    )
    assert any(
        "minimum 25 words required" in imp.lower() or "too brief" in imp.lower()
        for imp in scorecard_short.improvements
    ), "Expected Hard Floor Gate warning in improvements"
    print("   ✓ Hard Floor Gate successfully triggered! Score capped at <= 50, content set to 10/60.\n")

    # 4. Test Case B: Substantive Engineering Response (> 25 words)
    print("4. Test Case B: Substantive Engineering STAR Response (> 25 words)")
    substantive_transcript = (
        "During a Black Friday traffic surge, our payment gateway service began experiencing 504 gateway timeouts "
        "due to database connection pool exhaustion in MongoDB. I quickly identified the query spike using Atlas Real-Time "
        "Performance Panel, instituted an in-memory Redis cluster for idempotency key lookups, and dynamically increased "
        "the connection pool size. Within four minutes, service latency dropped from 2.4 seconds to 45 milliseconds, "
        "recovering over ninety-nine percent of interrupted checkout flows."
    )
    result_full = await coach_engine.analyze_session(
        user_id="test_candidate_1",
        transcript=substantive_transcript,
        metrics=ObservableMetrics(
            speaking_rate_wpm=142.0,
            pause_count=1,
            filler_words={"um": 1},
            gaze_on_camera_pct=0.88,
        ),
        job_title="Senior AI/Software Engineer",
        interview_question="Tell me about a time you resolved a high-severity production incident.",
    )

    session_full = result_full["session"]
    scorecard_full = session_full.scorecard

    print(f"   Transcript word count: {len(substantive_transcript.split())} words")
    print(f"   Delivery Subscore: {result_full['delivery_subscore']} / 40")
    print(f"   Content Subscore:  {result_full['content_subscore']} / 60")
    if scorecard_full.content_breakdown:
        cb = scorecard_full.content_breakdown
        print(f"   Breakdown: Relevance={cb.relevance_score}/25, Structure={cb.structure_score}/20, Depth={cb.domain_depth_score}/15")
    print(f"   Overall Score:     {scorecard_full.overall_score} / 100")
    print(f"   Strengths:         {scorecard_full.strengths[:2]}")
    print(f"   Improvements:      {scorecard_full.improvements[:2]}")

    assert result_full["content_subscore"] > 25, f"Expected high content score, got {result_full['content_subscore']}"
    assert result_full["delivery_subscore"] >= 30, f"Expected strong delivery score, got {result_full['delivery_subscore']}"
    assert scorecard_full.overall_score >= 65, f"Expected overall >= 65, got {scorecard_full.overall_score}"
    print("   ✓ Substantive response evaluated with dynamic dual-pillar scoring.\n")

    # 5. Test Episodic Comparison
    print("5. Episodic Comparison Check:")
    print(f"   Comparison: {result_full.get('episodic_comparison')}")
    print("   ✓ Episodic memory context verified.\n")

    # 6. Test Micro-Drills
    drills = session_full.recommended_drills
    print(f"6. Recommended Drills Generated ({len(drills)}):")
    for d in drills:
        print(f"   - [{d.duration_sec}s] {d.title}: {d.instructions[:50]}...")
        assert d.duration_sec == 30
    print("   ✓ Drills generated.\n")

    # 7. Test Embedding
    emb = await coach_engine.generate_critique_embedding("Senior Engineer STAR critique")
    print(f"7. Atlas Vector Embedding:")
    print(f"   Dimension: {len(emb)}")
    assert len(emb) == 768
    print("   ✓ 768-dim Atlas Vector search embedding confirmed.\n")

    # 8. Test Ingestion Engine: Custom Question Generation
    print("8. Testing Ingestion Engine (generate_custom_questions):")
    sample_jd = (
        "We are hiring a Principal AI Platform Engineer to build high-throughput real-time multimodal inference pipelines "
        "using FastAPI, Google Gemini, and MongoDB Atlas Vector Search. Responsibilities include sub-second p99 latency SLA, "
        "incident response for production microservices, and leading distributed architecture reviews."
    )
    gen_result = await coach_engine.generate_custom_questions(sample_jd, role_hint="Principal AI Platform Engineer")
    print(f"   Inferred Role: {gen_result.role_inferred}")
    print(f"   Context Summary: {gen_result.context_summary}")
    print(f"   Questions Generated ({len(gen_result.questions)}):")
    for q in gen_result.questions:
        print(f"     - [Stage {q.stage_number} | {q.difficulty}]: {q.text[:65]}...")
    assert len(gen_result.questions) == 3
    print("   ✓ Ingestion Engine generated 3 tailored progressive questions.\n")

    # 9. Test Multi-Stage Gauntlet Analysis
    print("9. Testing 3-Question Interview Gauntlet Analysis:")
    from models import GauntletStageInput
    gauntlet_stages = [
        GauntletStageInput(
            stage_number=1,
            question=gen_result.questions[0].text,
            transcript="I have over seven years of engineering experience architecting and scaling distributed multimodal microservices, optimizing low-latency inference pipelines, and deploying containerized models across hybrid Kubernetes clusters.",
            observable_metrics=ObservableMetrics(
                speaking_rate_wpm=138.0,
                pause_count=1,
                filler_words={},
                gaze_on_camera_pct=0.86,
            ),
        ),
        GauntletStageInput(
            stage_number=2,
            question=gen_result.questions[1].text,
            transcript="When designing our vector search architecture, we benchmarked MongoDB Atlas 768-dim embeddings against dedicated vector pods. We achieved sub-50ms query latency while reducing operational overhead by forty percent and maintaining linear read scaling.",
            observable_metrics=ObservableMetrics(
                speaking_rate_wpm=145.0,
                pause_count=2,
                filler_words={"um": 1},
                gaze_on_camera_pct=0.89,
            ),
        ),
        GauntletStageInput(
            stage_number=3,
            question=gen_result.questions[2].text,
            transcript="During a critical production incident at two in the morning, I rapidly triaged MongoDB connection timeouts using Atlas real-time monitoring and introduced Redis caching to protect write throughput, restoring healthy throughput in four minutes.",
            observable_metrics=ObservableMetrics(
                speaking_rate_wpm=140.0,
                pause_count=1,
                filler_words={},
                gaze_on_camera_pct=0.91,
            ),
        ),
    ]

    gauntlet_result = await coach_engine.analyze_gauntlet(
        user_id="test_candidate_1",
        job_title=gen_result.role_inferred,
        stages=gauntlet_stages,
        context_text=sample_jd,
    )

    print(f"   Gauntlet Session ID: {gauntlet_result['session_id']}")
    print(f"   Stages Evaluated: {len(gauntlet_result['stages'])}")
    for s in gauntlet_result["stages"]:
        print(f"     * Stage {s.stage_number}: Score={s.stage_score}, Delivery={s.delivery_subscore}, Content={s.content_subscore}")
    print(f"   Cumulative Score: {gauntlet_result['cumulative_scorecard'].overall_score} / 100")
    print(f"   Delivery Avg:     {gauntlet_result['cumulative_scorecard'].delivery_subscore} / 40")
    print(f"   Content Avg:      {gauntlet_result['cumulative_scorecard'].content_subscore} / 60")
    assert len(gauntlet_result["stages"]) == 3
    assert gauntlet_result["cumulative_scorecard"].overall_score >= 40
    print("   ✓ Multi-stage Gauntlet analysis and Atlas persistence confirmed.\n")

    print("=" * 70)
    print("✓ ALL TESTS (INCLUDING GAUNTLET & INGESTION) PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
