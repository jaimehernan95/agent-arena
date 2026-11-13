export interface ObservableMetrics {
  speaking_rate_wpm: number;
  pause_count: number;
  filler_words: Record<string, number>;
  gaze_on_camera_pct: number;
}

export interface ContentBreakdown {
  relevance_score: number;
  structure_score: number;
  domain_depth_score: number;
}

export interface Scorecard {
  strengths: string[];
  improvements: string[];
  overall_score: number;
  delivery_subscore?: number;
  content_subscore?: number;
  content_breakdown?: ContentBreakdown;
}

export interface RecommendedDrill {
  title: string;
  duration_sec: number;
  instructions: string;
}

export interface CompiledSessionPayload {
  user_id: string;
  session_id?: string;
  job_title?: string;
  interview_question?: string;
  transcript: string;
  observable_metrics: ObservableMetrics;
}

export interface AnalyzeSessionResponse {
  session_id: string;
  user_id: string;
  job_title?: string;
  interview_question?: string;
  created_at: string;
  transcript: string;
  observable_metrics: ObservableMetrics;
  delivery_subscore?: number;
  content_subscore?: number;
  scorecard: Scorecard;
  recommended_drills: RecommendedDrill[];
  episodic_comparison?: string;
}
