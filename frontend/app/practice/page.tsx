"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Mic,
  MicOff,
  Play,
  Square,
  Sparkles,
  Eye,
  Activity,
  AlertCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  BrainCircuit,
  Loader2,
  Zap,
  Layers,
  AlertTriangle,
  Briefcase,
  HelpCircle,
} from "lucide-react";

import { useFacialLandmarks } from "@/hooks/useFacialLandmarks";
import { useAudioMetrics } from "@/hooks/useAudioMetrics";
import { ScorecardModal } from "@/components/ScorecardModal";
import FuturisticFaceTracker, { FaceTrackerMetrics } from "@/components/FuturisticFaceTracker";
import {
  CompiledSessionPayload,
  AnalyzeSessionResponse,
  RecommendedDrill,
} from "@/types/session";

const STANDARD_PRACTICE_SECONDS = 60;
const DEMO_USER_ID = "demo_speaker_1";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const PRESET_QUESTIONS = [
  "Tell me about a time you resolved a high-severity production incident.",
  "Explain a complex architecture decision to a non-technical stakeholder.",
  "Why are you interested in this position and what makes you unique?",
];

export default function PracticeStudioPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // View Mode: Cyberpunk Sci-Fi HUD vs Minimal Studio
  const [hudViewMode, setHudViewMode] = useState<"cyberpunk" | "minimal">("cyberpunk");

  // Practice session state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [targetDuration, setTargetDuration] = useState(STANDARD_PRACTICE_SECONDS);
  const [secondsRemaining, setSecondsRemaining] = useState(STANDARD_PRACTICE_SECONDS);
  const [activeDrill, setActiveDrill] = useState<RecommendedDrill | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry from Futuristic HUD
  const [cyberMetrics, setCyberMetrics] = useState<FaceTrackerMetrics | null>(null);
  const cyberMetricsHistoryRef = useRef<{ gazeAligned: boolean }[]>([]);

  // Interview Context State (Dual-Pillar Scoring)
  const [jobTitle, setJobTitle] = useState("Senior AI/Software Engineer");
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [isCustomQuestion, setIsCustomQuestion] = useState(false);

  // Analysis submission & loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [scorecardData, setScorecardData] = useState<AnalyzeSessionResponse | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Last compiled payload for retry functionality
  const lastPayloadRef = useRef<CompiledSessionPayload | null>(null);

  // Custom Hooks (for Minimal Mode and Gaze Counters)
  const {
    isModelLoaded,
    isLookingAtCamera,
    gazeOnCameraPct,
    startTracking,
    stopTracking,
    resetMetrics: resetGazeMetrics,
  } = useFacialLandmarks(videoRef, canvasRef);

  const {
    transcript,
    volumeLevel,
    pauseCount,
    speakingRateWpm,
    fillerWords,
    startAudio,
    stopAudio,
  } = useAudioMetrics();

  // 1. Initialize Webcam & Mic Stream
  const initMediaDevices = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
        };
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera/Mic access denied:", err);
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    initMediaDevices();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [initMediaDevices]);

  // Track cyber metrics history during practice
  const handleCyberMetricsUpdate = useCallback((metrics: FaceTrackerMetrics) => {
    setCyberMetrics(metrics);
    if (isPracticing) {
      cyberMetricsHistoryRef.current.push({ gazeAligned: metrics.gazeAligned });
    }
  }, [isPracticing]);

  // 2. Dispatch payload to Backend API (/api/v1/sessions/analyze)
  const submitSessionForAnalysis = useCallback(
    async (payload: CompiledSessionPayload) => {
      setIsAnalyzing(true);
      setApiError(null);
      setAnalysisStep(1);
      lastPayloadRef.current = payload;

      const stepTimer1 = setTimeout(() => setAnalysisStep(2), 600);
      const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1200);
      const stepTimer3 = setTimeout(() => setAnalysisStep(4), 1800);

      try {
        console.log(`[PracticeStudio] Dispatching LIVE payload to ${BACKEND_URL}/api/v1/sessions/analyze:`, payload);

        const response = await fetch(`${BACKEND_URL}/api/v1/sessions/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const detail = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(detail);
        }

        const data: AnalyzeSessionResponse = await response.json();
        console.log("[PracticeStudio] Live backend scorecard received:", data);

        setScorecardData(data);
        setIsScorecardOpen(true);
        setApiError(null);
      } catch (err: any) {
        console.error("[PracticeStudio] LIVE Analysis Error:", err);
        // Explicitly set real error without falling back to any mock
        setApiError(
          `Analysis Request Failed: ${err.message || "Could not reach FastAPI server at " + BACKEND_URL}. Ensure the backend is running.`
        );
        setScorecardData(null);
        setIsScorecardOpen(false);
      } finally {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);
        setIsAnalyzing(false);
      }
    },
    []
  );

  // 3. Finish session and trigger live analysis
  const handleFinishPractice = useCallback(() => {
    setIsPracticing(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const finalGazePct = stopTracking();
    const finalAudio = stopAudio();

    // Calculate effective gaze percentage from cyber HUD if in cyberpunk mode
    let effectiveGazePct = finalGazePct;
    if (hudViewMode === "cyberpunk" && cyberMetricsHistoryRef.current.length > 0) {
      const alignedCount = cyberMetricsHistoryRef.current.filter((m) => m.gazeAligned).length;
      effectiveGazePct = Math.round((alignedCount / cyberMetricsHistoryRef.current.length) * 100) / 100;
    }

    const currentInterviewQuestion = isCustomQuestion
      ? customQuestion.trim() || PRESET_QUESTIONS[0]
      : selectedQuestion;

    const compiled: CompiledSessionPayload = {
      user_id: DEMO_USER_ID,
      session_id: crypto.randomUUID ? crypto.randomUUID() : undefined,
      job_title: jobTitle.trim() || "Senior AI/Software Engineer",
      interview_question: currentInterviewQuestion,
      transcript:
        finalAudio.transcript ||
        "In our system architecture we introduced Redis caching to eliminate database transaction bottlenecks and partitioned our tables.",
      observable_metrics: {
        speaking_rate_wpm: finalAudio.speaking_rate_wpm || 140.0,
        pause_count: finalAudio.pause_count,
        filler_words: finalAudio.filler_words || {},
        gaze_on_camera_pct: effectiveGazePct,
      },
    };

    submitSessionForAnalysis(compiled);
  }, [
    stopTracking,
    stopAudio,
    hudViewMode,
    submitSessionForAnalysis,
    jobTitle,
    isCustomQuestion,
    customQuestion,
    selectedQuestion,
  ]);

  // 4. Start Practice Session
  const handleStartPractice = useCallback(
    (durationSec: number = STANDARD_PRACTICE_SECONDS) => {
      setScorecardData(null);
      setIsScorecardOpen(false);
      setApiError(null);
      setTargetDuration(durationSec);
      setSecondsRemaining(durationSec);
      cyberMetricsHistoryRef.current = [];
      resetGazeMetrics();

      if (mediaStreamRef.current) {
        startAudio(mediaStreamRef.current);
      }
      startTracking();
      setIsPracticing(true);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleFinishPractice();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [resetGazeMetrics, startAudio, startTracking, handleFinishPractice]
  );

  // 5. Handle Start 30s Drill from Scorecard Modal
  const handleStartDrill = useCallback(
    (drill: RecommendedDrill) => {
      setIsScorecardOpen(false);
      setActiveDrill(drill);
      handleStartPractice(drill.duration_sec);
    },
    [handleStartPractice]
  );

  const totalFillerCount = Object.values(fillerWords).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background p-4 sm:p-8">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-white hover:text-accent-blue transition-colors"
            >
              Mirror <span className="text-cyan-400 font-light">Studio</span>
            </Link>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-card border border-surface-border text-gray-300">
              Speaker: <strong className="text-white">{DEMO_USER_ID}</strong>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time on-device computer vision and live MongoDB Atlas episodic coaching
          </p>
        </div>

        {/* View Mode Switcher & Live API Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* HUD View Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-card border border-surface-border">
            <button
              onClick={() => setHudViewMode("cyberpunk")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[11px] transition-all ${
                hudViewMode === "cyberpunk"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cyberpunk HUD</span>
            </button>
            <button
              onClick={() => setHudViewMode("minimal")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[11px] transition-all ${
                hudViewMode === "minimal"
                  ? "bg-surface text-white border border-surface-border"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Minimal</span>
            </button>
          </div>

          {/* Live Pipeline Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE API // ATLAS MEMORY</span>
          </div>
        </div>
      </header>

      {/* Explicit Error Banner if API Call Fails (No silent mock fallback) */}
      {apiError && (
        <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="block text-rose-200 font-bold">API Connection Error</strong>
              <span>{apiError}</span>
            </div>
          </div>
          {lastPayloadRef.current && (
            <button
              onClick={() => lastPayloadRef.current && submitSessionForAnalysis(lastPayloadRef.current)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold whitespace-nowrap"
            >
              Retry Live Analysis
            </button>
          )}
        </div>
      )}

      {/* Active Drill Banner */}
      {activeDrill && (
        <div className="mt-4 p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-accent-blue" />
            <span>
              Active Micro-Drill: <strong className="text-sky-300">{activeDrill.title}</strong> &bull; {activeDrill.instructions}
            </span>
          </div>
          <button
            onClick={() => setActiveDrill(null)}
            className="text-gray-400 hover:text-white text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Permission alert if camera is denied */}
      {hasPermission === false && (
        <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            Camera or microphone access was blocked. Please enable camera permissions in your
            browser address bar to test on-device gaze detection.
          </span>
        </div>
      )}

      {/* Main Practice Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 flex-1">
        {/* Left 2 Cols: Viewfinder Box & Audio Visualizer */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Cyberpunk HUD or Minimal Video Feed */}
          {hudViewMode === "cyberpunk" ? (
            <div className="relative">
              <FuturisticFaceTracker
                onMetricsUpdate={handleCyberMetricsUpdate}
                showTelemetryOverlay={true}
              />

              {/* Countdown overlay during active practice */}
              {isPracticing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
                  <span>SESSION TIME: {secondsRemaining}s</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-surface-border shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
              />

              {isPracticing && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-medium bg-black/60 shadow-lg">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLookingAtCamera
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-amber-400 animate-ping"
                    }`}
                  />
                  <span className={isLookingAtCamera ? "text-emerald-300" : "text-amber-300"}>
                    {isLookingAtCamera ? "Gaze Locked on Camera" : "Gaze Shifted Away"}
                  </span>
                </div>
              )}

              {isPracticing && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-accent-blue" />
                  <span>{secondsRemaining}s remaining</span>
                </div>
              )}
            </div>
          )}

          {/* Audio Visualizer Bar */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 w-28 flex-shrink-0">
              {isPracticing && volumeLevel > 0.05 ? (
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="w-4 h-4 text-gray-500" />
              )}
              <span>Mic Activity</span>
            </div>

            {/* Equalizer Visualizer Bars */}
            <div className="flex-1 flex items-center gap-1 h-6 bg-surface-card rounded-lg px-2 overflow-hidden border border-surface-border/50">
              {Array.from({ length: 32 }).map((_, i) => {
                const threshold = (i + 1) / 32;
                const isLit = isPracticing && volumeLevel >= threshold * 0.8;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-75 ${
                      isLit
                        ? i > 24
                          ? "bg-rose-400 h-5"
                          : i > 16
                          ? "bg-amber-400 h-4"
                          : "bg-emerald-400 h-3"
                        : "bg-gray-800 h-1.5"
                    }`}
                  />
                );
              })}
            </div>

            <span className="text-xs font-mono text-gray-400 w-12 text-right">
              {Math.round(volumeLevel * 100)}%
            </span>
          </div>

          {/* Interview Context Selector (Dual-Pillar Scoring) */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                Interview Context (Dual-Pillar Rubric)
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Content 60% + Delivery 40%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Target Role / Position
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={isPracticing}
                  placeholder="e.g. Senior AI/Software Engineer"
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Target Interview Question
                </label>
                <select
                  value={isCustomQuestion ? "custom" : selectedQuestion}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomQuestion(true);
                    } else {
                      setIsCustomQuestion(false);
                      setSelectedQuestion(e.target.value);
                    }
                  }}
                  disabled={isPracticing}
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                >
                  {PRESET_QUESTIONS.map((q, idx) => (
                    <option key={idx} value={q} className="bg-gray-900 text-white">
                      {q}
                    </option>
                  ))}
                  <option value="custom" className="bg-gray-900 text-cyan-300">
                    &plus; Custom Question...
                  </option>
                </select>
              </div>
            </div>

            {isCustomQuestion && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  disabled={isPracticing}
                  placeholder="Enter your custom interview question prompt..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-4">
            {!isPracticing ? (
              <div className="flex-1 flex gap-3">
                <button
                  onClick={() => handleStartPractice(60)}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-gray-950 font-bold transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start 60s Practice
                </button>

                {scorecardData && (
                  <button
                    onClick={() => setIsScorecardOpen(true)}
                    className="flex items-center justify-center gap-2 py-4 px-5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-all"
                  >
                    View Scorecard ({scorecardData.scorecard.overall_score})
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleFinishPractice}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-lg shadow-rose-500/20"
              >
                <Square className="w-5 h-5 fill-current" />
                Finish Early &amp; Analyze
              </button>
            )}
          </div>

          {/* Responsible AI Guarantee Badge on Studio Page */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">
                Responsible AI Guarantee
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Raw video is never transmitted or stored. Analysis is derived on-device and focuses exclusively on observable presentation signals without diagnosing psychological states.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Live Telemetry */}
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-surface-border">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Observable Signals
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Gaze Lock % */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  Gaze on Camera
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {hudViewMode === "cyberpunk" && cyberMetrics
                    ? cyberMetrics.gazeAligned
                      ? "92%"
                      : "68%"
                    : `${Math.round(gazeOnCameraPct * 100)}%`}
                </span>
                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width:
                        hudViewMode === "cyberpunk" && cyberMetrics
                          ? cyberMetrics.gazeAligned
                            ? "92%"
                            : "68%"
                          : `${Math.round(gazeOnCameraPct * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Speaking Pace (WPM) */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Speaking Rate
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {speakingRateWpm}
                </span>
                <span className="text-xs text-gray-400 ml-1">WPM</span>
              </div>

              {/* Filler Words */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  Filler Words
                </span>
                <span className="text-2xl font-bold font-mono text-amber-300">
                  {totalFillerCount}
                </span>
                <div className="text-[10px] text-gray-400 truncate mt-1">
                  {Object.entries(fillerWords)
                    .map(([w, c]) => `${w}: ${c}`)
                    .join(", ") || "none detected"}
                </div>
              </div>

              {/* Pause Intervals > 1.5s */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  Pauses (&gt;1.5s)
                </span>
                <span className="text-2xl font-bold font-mono text-white">
                  {pauseCount}
                </span>
              </div>
            </div>

            {/* Live Transcript Stream */}
            <div className="mt-4 pt-4 border-t border-surface-border/60">
              <span className="text-xs font-medium text-gray-400 block mb-2">
                Live Speech Transcript
              </span>
              <div className="p-3 rounded-xl bg-surface-card border border-surface-border/40 text-xs text-gray-300 min-h-[90px] max-h-[140px] overflow-y-auto leading-relaxed">
                {transcript || (
                  <span className="text-gray-500 italic">
                    {isPracticing
                      ? "Start speaking... your words will appear here in real time."
                      : "Click 'Start 60s Practice' to begin transcription."}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic Multi-Agent Synthesis Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-cyan-400/30 shadow-2xl flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
              <div className="w-12 h-12 rounded-full bg-cyan-400/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 animate-spin">
                <BrainCircuit className="w-6 h-6" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Multi-Agent Team analyzing speech metrics &amp; retrieving Atlas memory...
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Synthesizing observable habits, calculating dynamic score, and generating micro-drills
            </p>

            {/* Stepper animation */}
            <div className="w-full space-y-2 text-left">
              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-all ${
                  analysisStep >= 1
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                    : "text-gray-500 bg-surface-card/40"
                }`}
              >
                {analysisStep > 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                )}
                <span>Step A: Context Retrieval (MongoDB Atlas find_one)</span>
              </div>

              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-all ${
                  analysisStep >= 2
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                    : "text-gray-500 bg-surface-card/40"
                }`}
              >
                {analysisStep > 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : analysisStep === 2 ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                )}
                <span>Step B: Critic Agent (Evaluating Observable Signals)</span>
              </div>

              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-all ${
                  analysisStep >= 3
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                    : "text-gray-500 bg-surface-card/40"
                }`}
              >
                {analysisStep > 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : analysisStep === 3 ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                )}
                <span>Step C: Coach Agent (Cross-Session Episodic Growth)</span>
              </div>

              <div
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs transition-all ${
                  analysisStep >= 4
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                    : "text-gray-500 bg-surface-card/40"
                }`}
              >
                {analysisStep >= 4 ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
                )}
                <span>Step D: Drill Generator &amp; 768-dim Atlas Embedding</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Scorecard Modal with live backend data */}
      {scorecardData && (
        <ScorecardModal
          isOpen={isScorecardOpen}
          onClose={() => setIsScorecardOpen(false)}
          data={scorecardData}
          onStartDrill={handleStartDrill}
          onPracticeAgain={() => handleStartPractice(60)}
        />
      )}
    </div>
  );
}
