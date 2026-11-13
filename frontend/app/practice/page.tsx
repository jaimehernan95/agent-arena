"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Square,
  Sparkles,
  Layers,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  BrainCircuit,
  Loader2,
  Mic,
  MicOff,
  AlertCircle,
} from "lucide-react";

import { useFacialLandmarks } from "@/hooks/useFacialLandmarks";
import { useAudioMetrics } from "@/hooks/useAudioMetrics";
import { ScorecardModal } from "@/components/ScorecardModal";
import FuturisticFaceTracker, { FaceTrackerMetrics } from "@/components/FuturisticFaceTracker";
import { MissionStageSelect } from "@/components/MissionStageSelect";
import { HudTeleprompter } from "@/components/HudTeleprompter";
import { FlightComputerTelemetry } from "@/components/FlightComputerTelemetry";
import {
  CompiledSessionPayload,
  AnalyzeSessionResponse,
  RecommendedDrill,
} from "@/types/session";
import {
  MISSION_TRACKS,
  MissionTrack,
  MissionQuestion,
} from "@/types/mission";

const STANDARD_PRACTICE_SECONDS = 60;
const DEMO_USER_ID = "demo_speaker_1";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PracticeStudioPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // View Mode: Cyberpunk Sci-Fi HUD vs Minimal Studio
  const [hudViewMode, setHudViewMode] = useState<"cyberpunk" | "minimal">("cyberpunk");

  // Practice session state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(STANDARD_PRACTICE_SECONDS);
  const [activeDrill, setActiveDrill] = useState<RecommendedDrill | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry from Futuristic HUD
  const [cyberMetrics, setCyberMetrics] = useState<FaceTrackerMetrics | null>(null);
  const cyberMetricsHistoryRef = useRef<{ gazeAligned: boolean }[]>([]);

  // Professional Mission Tracks State (Multi-Track Stage Select)
  const [selectedTrack, setSelectedTrack] = useState<MissionTrack>(MISSION_TRACKS[0]);
  const [selectedQuestion, setSelectedQuestion] = useState<MissionQuestion>(
    MISSION_TRACKS[0].questions[0]
  );
  const [customRole, setCustomRole] = useState("Senior AI/Software Engineer");
  const [customQuestionText, setCustomQuestionText] = useState(
    "Explain why your approach uniquely solves the organization's core challenge."
  );
  const [isCustomActive, setIsCustomActive] = useState(false);

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

  // Compute effective role & prompt question
  const effectiveRole =
    isCustomActive || selectedTrack.id === "custom"
      ? customRole.trim() || "Senior Professional Leader"
      : selectedTrack.title;

  const effectiveQuestion =
    isCustomActive || selectedTrack.id === "custom"
      ? customQuestionText.trim() || selectedQuestion.text
      : selectedQuestion.text;

  const effectiveRubric =
    isCustomActive || selectedTrack.id === "custom"
      ? "TARGET: CUSTOM EVALUATION | DOMAIN RELEVANCE"
      : selectedQuestion.targetRubric || selectedTrack.rubricHint;

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
  const handleCyberMetricsUpdate = useCallback(
    (metrics: FaceTrackerMetrics) => {
      setCyberMetrics(metrics);
      if (isPracticing) {
        cyberMetricsHistoryRef.current.push({ gazeAligned: metrics.gazeAligned });
      }
    },
    [isPracticing]
  );

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
        console.log(
          `[PracticeStudio] Dispatching LIVE payload to ${BACKEND_URL}/api/v1/sessions/analyze:`,
          payload
        );

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
        setApiError(
          `Analysis Request Failed: ${
            err.message || "Could not reach FastAPI server at " + BACKEND_URL
          }. Ensure the backend is running.`
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
      effectiveGazePct =
        Math.round((alignedCount / cyberMetricsHistoryRef.current.length) * 100) / 100;
    }

    const compiled: CompiledSessionPayload = {
      user_id: DEMO_USER_ID,
      session_id: crypto.randomUUID ? crypto.randomUUID() : undefined,
      job_title: effectiveRole,
      interview_question: effectiveQuestion,
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
    effectiveRole,
    effectiveQuestion,
  ]);

  // 4. Start Practice Session
  const handleStartPractice = useCallback(
    (durationSec: number = STANDARD_PRACTICE_SECONDS) => {
      setScorecardData(null);
      setIsScorecardOpen(false);
      setApiError(null);
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background p-4 sm:p-8">
      {/* Top Studio Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
            >
              Mirror <span className="text-cyan-400 font-light">Simulation Studio</span>
            </Link>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-card border border-surface-border text-gray-300 font-mono">
              AGENT_ID: <strong className="text-white">{DEMO_USER_ID}</strong>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time on-device computer vision &bull; In-Camera HUD Teleprompter &bull; MongoDB Atlas Memory
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE API // ATLAS MEMORY</span>
          </div>
        </div>
      </header>

      {/* Explicit Error Banner if API Call Fails */}
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
        <div className="mt-4 p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>
              Active Micro-Drill: <strong className="text-cyan-300">{activeDrill.title}</strong> &bull;{" "}
              {activeDrill.instructions}
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

      {/* Camera Permission Alert */}
      {hasPermission === false && (
        <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>
            Camera or microphone access was blocked. Please enable camera permissions in your browser
            address bar to test on-device gaze detection.
          </span>
        </div>
      )}

      {/* 1. Stage Select / Mission Selection Matrix Deck */}
      <div className="mt-6">
        <MissionStageSelect
          selectedTrack={selectedTrack}
          onSelectTrack={setSelectedTrack}
          selectedQuestion={selectedQuestion}
          onSelectQuestion={setSelectedQuestion}
          customRole={customRole}
          onChangeCustomRole={setCustomRole}
          customQuestionText={customQuestionText}
          onChangeCustomQuestionText={setCustomQuestionText}
          isCustomActive={isCustomActive}
          onToggleCustom={setIsCustomActive}
          isPracticing={isPracticing}
        />
      </div>

      {/* 2. Main Practice Workspace (2 cols Camera Feed + 1 col Flight Computer Telemetry) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 flex-1">
        {/* Left 2 Cols: Viewfinder Box & Controls */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Cyberpunk HUD or Minimal Video Feed with In-Camera Teleprompter */}
          {hudViewMode === "cyberpunk" ? (
            <div className="relative">
              <FuturisticFaceTracker
                onMetricsUpdate={handleCyberMetricsUpdate}
                showTelemetryOverlay={true}
              />

              {/* In-Camera HUD Teleprompter Overlay */}
              <HudTeleprompter
                questionText={effectiveQuestion}
                targetRubric={effectiveRubric}
                roleTitle={effectiveRole}
                isPracticing={isPracticing}
                secondsRemaining={secondsRemaining}
                isLookingAtCamera={
                  cyberMetrics ? cyberMetrics.gazeAligned : true
                }
              />
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

              {/* In-Camera HUD Teleprompter Overlay in Minimal Mode */}
              <HudTeleprompter
                questionText={effectiveQuestion}
                targetRubric={effectiveRubric}
                roleTitle={effectiveRole}
                isPracticing={isPracticing}
                secondsRemaining={secondsRemaining}
                isLookingAtCamera={isLookingAtCamera}
              />
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
              <span>Mic Visualizer</span>
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

          {/* Action Control Buttons */}
          <div className="flex items-center gap-4">
            {!isPracticing ? (
              <div className="flex-1 flex gap-3">
                <button
                  onClick={() => handleStartPractice(60)}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-gray-950 font-bold transition-all shadow-lg shadow-cyan-500/20 font-mono tracking-wide"
                >
                  <Play className="w-5 h-5 fill-current" />
                  INITIATE 60s SIMULATION
                </button>

                {scorecardData && (
                  <button
                    onClick={() => setIsScorecardOpen(true)}
                    className="flex items-center justify-center gap-2 py-4 px-5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-all font-mono"
                  >
                    View Scorecard ({scorecardData.scorecard.overall_score}/100)
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleFinishPractice}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-lg shadow-rose-500/20 font-mono tracking-wide"
              >
                <Square className="w-5 h-5 fill-current" />
                TERMINATE &amp; ANALYZE SIMULATION
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
                Raw video is never transmitted or stored. Analysis is derived on-device and focuses exclusively
                on observable presentation signals without diagnosing psychological states.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: High-Tech Flight Computer Telemetry Strip */}
        <div className="flex flex-col gap-4">
          <FlightComputerTelemetry
            speakingRateWpm={speakingRateWpm}
            fillerWords={fillerWords}
            gazeOnCameraPct={
              hudViewMode === "cyberpunk" && cyberMetrics
                ? cyberMetrics.gazeAligned
                  ? 0.92
                  : 0.68
                : gazeOnCameraPct
            }
            pauseCount={pauseCount}
            transcript={transcript}
            isPracticing={isPracticing}
            targetRole={effectiveRole}
            targetRubric={effectiveRubric}
          />
        </div>
      </div>

      {/* Multi-Agent Synthesis Loading Overlay */}
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
              Synthesizing observable habits, evaluating &ldquo;{effectiveRole}&rdquo; rubric, and generating micro-drills
            </p>

            {/* Stepper animation */}
            <div className="w-full space-y-2 text-left font-mono">
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
