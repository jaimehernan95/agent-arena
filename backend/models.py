import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ObservableMetrics(BaseModel):
    speaking_rate_wpm: float = Field(..., description="Estimated words per minute spoken")
    pause_count: int = Field(..., ge=0, description="Number of awkward or significant pauses detected")
    filler_words: Dict[str, int] = Field(
        default_factory=dict,
        description="Occurrence counts of filler words (e.g. {'um': 3, 'like': 2})"
    )
    gaze_on_camera_pct: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Percentage of session with gaze locked on camera (0.0 to 1.0)"
    )

    model_config = ConfigDict(extra="ignore")


class ContentBreakdown(BaseModel):
    relevance_score: int = Field(..., ge=0, le=25, description="Prompt relevance score out of 25")
    structure_score: int = Field(..., ge=0, le=20, description="STAR framework structure score out of 20")
    domain_depth_score: int = Field(..., ge=0, le=15, description="Technical and domain depth score out of 15")

    model_config = ConfigDict(extra="ignore")


class Scorecard(BaseModel):
    strengths: List[str] = Field(..., description="Key observed strengths during presentation")
    improvements: List[str] = Field(..., description="Actionable areas for speech and delivery improvement")
    overall_score: int = Field(..., ge=0, le=100, description="Overall performance score out of 100")
    delivery_subscore: Optional[int] = Field(None, ge=0, le=40, description="Delivery mechanics score out of 40")
    content_subscore: Optional[int] = Field(None, ge=0, le=60, description="Content relevance and depth score out of 60")
    content_breakdown: Optional[ContentBreakdown] = Field(None, description="Detailed breakdown of content metrics")

    model_config = ConfigDict(extra="ignore")


class RecommendedDrill(BaseModel):
    title: str = Field(..., description="Name of the targeted drill")
    duration_sec: int = Field(..., gt=0, description="Recommended practice duration in seconds")
    instructions: str = Field(..., description="Step-by-step instructions for the speaker")

    model_config = ConfigDict(extra="ignore")


class UserSession(BaseModel):
    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique UUID string identifying this session"
    )
    user_id: str = Field(..., description="Identifier for the user")
    job_title: Optional[str] = Field("Senior AI/Software Engineer", description="Target job title / role")
    interview_question: Optional[str] = Field(None, description="Target interview question")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when practice session was recorded"
    )
    transcript: str = Field(..., description="Transcribed audio text from presentation")
    observable_metrics: ObservableMetrics = Field(
        ...,
        description="Quantifiable metrics measured across visual and audio streams"
    )
    delivery_subscore: Optional[int] = Field(None, description="Delivery mechanics score out of 40")
    content_subscore: Optional[int] = Field(None, description="Content relevance and depth score out of 60")
    scorecard: Scorecard = Field(
        ...,
        description="AI evaluation containing strengths, improvements, and overall score"
    )
    recommended_drills: List[RecommendedDrill] = Field(
        default_factory=list,
        description="Targeted exercises to address identified weaknesses"
    )
    embedding: List[float] = Field(
        ...,
        description="768-dimensional dense vector representation for Atlas Vector Search"
    )

    @field_validator("embedding")
    @classmethod
    def validate_embedding_dimension(cls, v: List[float]) -> List[float]:
        if len(v) != 768:
            raise ValueError(f"Embedding must be a 768-dimensional vector, received {len(v)} dimensions.")
        return v

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )


class HistoryResponse(BaseModel):
    user_id: str
    total_sessions: int
    sessions: List[UserSession]


class AnalyzeSessionRequest(BaseModel):
    user_id: str = Field(..., description="User ID for which to record and analyze the session")
    transcript: str = Field(..., description="Transcript of the spoken speech")
    observable_metrics: ObservableMetrics = Field(
        ...,
        description="Client-side observable metrics (wpm, pause count, filler words, gaze percentage)"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional pre-generated session UUID"
    )
    job_title: Optional[str] = Field(
        default="Senior AI/Software Engineer",
        description="Target interview job title/role"
    )
    interview_question: Optional[str] = Field(
        default="Tell me about a time you resolved a high-severity production incident.",
        description="Target interview question prompt"
    )


class AnalyzeSessionResponse(BaseModel):
    session_id: str
    user_id: str
    job_title: Optional[str] = None
    interview_question: Optional[str] = None
    created_at: datetime
    transcript: str
    observable_metrics: ObservableMetrics
    delivery_subscore: Optional[int] = None
    content_subscore: Optional[int] = None
    scorecard: Scorecard
    recommended_drills: List[RecommendedDrill]
    episodic_comparison: Optional[str] = Field(
        default=None,
        description="Episodic memory insights comparing current session with previous practice sessions"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )
