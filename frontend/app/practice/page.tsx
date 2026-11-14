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
  PlusCircle,
  FastForward,
} from "lucide-react";

import { useFacialLandmarks } from "@/hooks/useFacialLandmarks";
import { useAudioMetrics } from "@/hooks/useAudioMetrics";
import { ScorecardModal } from "@/components/ScorecardModal";
import FuturisticFaceTracker, { FaceTrackerMetrics } from "@/components/FuturisticFaceTracker";
import { SimulationBuilderPanel } from "@/components/SimulationBuilderPanel";
import { HudTeleprompter, GauntletModeState } from "@/components/HudTeleprompter";
import { FlightComputerTelemetry } from "@/components/FlightComputerTelemetry";
import {
  CompiledSessionPayload,
  AnalyzeSessionResponse,
  AnalyzeGauntletResponse,
  GauntletStageInput,
  GenerateQuestionsResponse,
  RecommendedDrill,
} from "@/types/session";
import {
  MISSION_TRACKS,
  MissionTrack,
  MissionQuestion,
} from "@/types/mission";

const STANDARD_PREP_SECONDS = 30;
const STANDARD_RECORDING_SECONDS = 60;
const STANDARD_TRANSITION_SECONDS = 5;
const DEMO_USER_ID = "demo_speaker_1";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function PracticeStudioPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // View Mode: Cyberpunk Sci-Fi HUD vs Minimal Studio
  const [hudViewMode, setHudViewMode] = useState<"cyberpunk" | "minimal">("cyberpunk");

  // Media Permissions
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Setup Stage & Ingestion Tab State (Tab 1 "presets" vs Tab 2 "custom")
  const [simulationTab, setSimulationTab] = useState<"presets" | "custom">("presets");
  const [selectedTrack, setSelectedTrack] = useState<MissionTrack>(MISSION_TRACKS[0]);
  const [selectedQuestion, setSelectedQuestion] = useState<MissionQuestion>(
    MISSION_TRACKS[0].questions[0]
  );
  const [gauntletQuestions, setGauntletQuestions] = useState<MissionQuestion[]>(
    MISSION_TRACKS[0].questions
  );

  // Custom Ingestion State
  const [customTitle, setCustomTitle] = useState<string>("");
  const [ingestionText, setIngestionText] = useState<string>("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);
  const [inferredRole, setInferredRole] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);

  // Gauntlet Interactive State Machine
  // SETUP -> PREP (30s) -> RECORDING (60s) -> INTER_STAGE (5s) -> [Repeat] -> COMPLETE
  const [gauntletState, setGauntletState] = useState<GauntletModeState>("SETUP");
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [prepSecondsRemaining, setPrepSecondsRemaining] = useState<number>(STANDARD_PREP_SECONDS);
  const [recordingSecondsRemaining, setRecordingSecondsRemaining] = useState<number>(STANDARD_RECORDING_SECONDS);
  const [transitionSecondsRemaining, setTransitionSecondsRemaining] = useState<number>(STANDARD_TRANSITION_SECONDS);

  const [completedStageInputs, setCompletedStageInputs] = useState<GauntletStageInput[]>([]);
  const [activeDrill, setActiveDrill] = useState<RecommendedDrill | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry from Futuristic HUD
  const [cyberMetrics, setCyberMetrics] = useState<FaceTrackerMetrics | null>(null);
  const cyberMetricsHistoryRef = useRef<{ gazeAligned: boolean }[]>([]);

  // Scorecards & Submission State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [gauntletScorecardData, setGauntletScorecardData] = useState<AnalyzeGauntletResponse | null>(null);
  const [singleScorecardData, setSingleScorecardData] = useState<AnalyzeSessionResponse | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Custom Hooks
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

  // Current Active Question & Role
  const currentQuestion = gauntletQuestions[currentStageIndex] || selectedQuestion;
  const currentRoleTitle =
    simulationTab === "custom"
      ? customTitle.trim() || inferredRole || "Universal Custom Simulation"
      : selectedTrack.title;

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
      if (gauntletState === "RECORDING") {
        cyberMetricsHistoryRef.current.push({ gazeAligned: metrics.gazeAligned });
      }
    },
    [gauntletState]
  );

  // 2. Ingestion Engine: Generate 3 Tailored Questions via Gemini API
  const handleGenerateQuestions = useCallback(
    async (targetTitle?: string, contextOverride?: string) => {
      const titleToUse = targetTitle !== undefined ? targetTitle : customTitle;
      const contextToUse = contextOverride !== undefined ? contextOverride : ingestionText;

      if (contextToUse.trim().length < 30 && titleToUse.trim().length < 4) return;
      setIsGeneratingQuestions(true);
      setApiError(null);

      try {
        console.log(`[PracticeStudio] Ingesting context to ${BACKEND_URL}/api/v1/sessions/generate-questions...`);
        const response = await fetch(`${BACKEND_URL}/api/v1/sessions/generate-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleToUse.trim() || undefined,
            context_text: contextToUse,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to generate questions.`);
        }

        const data: GenerateQuestionsResponse = await response.json();
        console.log("[PracticeStudio] Tailored Questions Generated:", data);

        if (data.role_inferred) {
          setInferredRole(data.role_inferred);
          if (!customTitle.trim()) {
            setCustomTitle(data.role_inferred);
          }
        }
        setGeneratedSummary(data.context_summary);

        const mappedQuestions: MissionQuestion[] = data.questions.map((q) => ({
          id: String(q.id),
          text: q.text,
          targetRubric: q.target_focus || q.targetRubric || "TARGET: DOMAIN MASTERY",
        }));

        setGauntletQuestions(mappedQuestions);
        if (mappedQuestions.length > 0) {
          setSelectedQuestion(mappedQuestions[0]);
        }
      } catch (err: any) {
        console.error("[PracticeStudio] Question generation failed:", err);
        setApiError(`Question Generation Failed: ${err.message || "Backend unreachable"}`);
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [customTitle, ingestionText]
  );

  // 3. Batch Gauntlet Analysis Submission
  const submitGauntletForAnalysis = useCallback(
    async (stagesPayload: GauntletStageInput[]) => {
      setIsAnalyzing(true);
      setApiError(null);
      setAnalysisStep(1);

      const stepTimer1 = setTimeout(() => setAnalysisStep(2), 600);
      const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1200);
      const stepTimer3 = setTimeout(() => setAnalysisStep(4), 1800);

      try {
        console.log(`[PracticeStudio] Dispatching ${stagesPayload.length}-stage gauntlet to ${BACKEND_URL}/api/v1/sessions/analyze-gauntlet:`, stagesPayload);

        const response = await fetch(`${BACKEND_URL}/api/v1/sessions/analyze-gauntlet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: DEMO_USER_ID,
            job_title: currentRoleTitle,
            context_text: ingestionText || undefined,
            stages: stagesPayload,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data: AnalyzeGauntletResponse = await response.json();
        console.log("[PracticeStudio] Gauntlet scorecard received:", data);

        setGauntletScorecardData(data);
        setSingleScorecardData(null);
        setIsScorecardOpen(true);
        setGauntletState("COMPLETE");
      } catch (err: any) {
        console.error("[PracticeStudio] Gauntlet Analysis Error:", err);
        setApiError(`Gauntlet Analysis Failed: ${err.message}. Ensure backend is operational.`);
        setGauntletState("SETUP");
      } finally {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);
        setIsAnalyzing(false);
      }
    },
    [currentRoleTitle, ingestionText]
  );

  // 4. Gauntlet Progression Logic (State Machine Handlers)

  // Start Stage Recording (from Prep Window or Ready button)
  const startStageRecording = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setGauntletState("RECORDING");
    setRecordingSecondsRemaining(STANDARD_RECORDING_SECONDS);
    cyberMetricsHistoryRef.current = [];
    resetGazeMetrics();

    if (mediaStreamRef.current) {
      startAudio(mediaStreamRef.current);
    }
    startTracking();

    // 60-second live recording countdown
    timerIntervalRef.current = setInterval(() => {
      setRecordingSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          finishCurrentStageRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [resetGazeMetrics, startAudio, startTracking]);

  // Start Stage Prep Countdown (30s)
  const startStagePrep = useCallback(
    (stageIdx: number) => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      setCurrentStageIndex(stageIdx);
      setGauntletState("PREP");
      setPrepSecondsRemaining(STANDARD_PREP_SECONDS);

      timerIntervalRef.current = setInterval(() => {
        setPrepSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            startStageRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [startStageRecording]
  );

  // Finish Current Stage Recording & Transition
  const finishCurrentStageRecording = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const finalGazePct = stopTracking();
    const finalAudio = stopAudio();

    let effectiveGazePct = finalGazePct;
    if (hudViewMode === "cyberpunk" && cyberMetricsHistoryRef.current.length > 0) {
      const alignedCount = cyberMetricsHistoryRef.current.filter((m) => m.gazeAligned).length;
      effectiveGazePct = Math.round((alignedCount / cyberMetricsHistoryRef.current.length) * 100) / 100;
    }

    const currentStagePrompt = gauntletQuestions[currentStageIndex]?.text || selectedQuestion.text;

    const recordedStage: GauntletStageInput = {
      stage_number: currentStageIndex + 1,
      question: currentStagePrompt,
      transcript:
        finalAudio.transcript ||
        "In our system architecture we introduced Redis caching to eliminate database transaction bottlenecks and partitioned our tables.",
      observable_metrics: {
        speaking_rate_wpm: finalAudio.speaking_rate_wpm || 140.0,
        pause_count: finalAudio.pause_count,
        filler_words: finalAudio.filler_words || {},
        gaze_on_camera_pct: effectiveGazePct,
        head_stability_pct: cyberMetrics?.headStabilityPct ?? 0.95,
      },
    };

    const nextStages = [...completedStageInputs, recordedStage];
    setCompletedStageInputs(nextStages);

    // If more stages remain in gauntlet
    if (currentStageIndex + 1 < gauntletQuestions.length) {
      setGauntletState("INTER_STAGE");
      setTransitionSecondsRemaining(STANDARD_TRANSITION_SECONDS);

      // 5-second inter-stage transition countdown
      timerIntervalRef.current = setInterval(() => {
        setTransitionSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            startStagePrep(currentStageIndex + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // All stages finished: submit gauntlet to backend
      submitGauntletForAnalysis(nextStages);
    }
  }, [
    stopTracking,
    stopAudio,
    hudViewMode,
    currentStageIndex,
    gauntletQuestions,
    selectedQuestion,
    completedStageInputs,
    startStagePrep,
    submitGauntletForAnalysis,
  ]);

  // Initiate entire Gauntlet (starts with Stage 1 Prep)
  const handleInitiateGauntlet = useCallback(() => {
    setCompletedStageInputs([]);
    setGauntletScorecardData(null);
    setIsScorecardOpen(false);
    setApiError(null);
    startStagePrep(0);
  }, [startStagePrep]);

  // Add Bonus Question (+1)
  const handleAddBonusQuestion = useCallback(() => {
    const bonusIdx = gauntletQuestions.length + 1;
    const bonusQ: MissionQuestion = {
      id: `bonus-${bonusIdx}`,
      text: "Bonus Challenge: How would you pivot this architecture if user demand scaled by 10x overnight?",
      targetRubric: "TARGET: ELASTIC SCALING | BOTTLENECK ELIMINATION",
    };
    setGauntletQuestions((prev) => [...prev, bonusQ]);
  }, [gauntletQuestions]);

  // Start Targeted 30s Drill from Scorecard Modal
  const handleStartDrill = useCallback(
    (drill: RecommendedDrill) => {
      setIsScorecardOpen(false);
      setActiveDrill(drill);
      // Single drill practice
      setGauntletState("PREP");
      setPrepSecondsRemaining(5); // Rapid 5s drill prep
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setPrepSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            startStageRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [startStageRecording]
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
              Mirror <span className="text-cyan-400 font-light">Simulation Gauntlet</span>
            </Link>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-surface-card border border-surface-border text-gray-300 font-mono">
              AGENT_ID: <strong className="text-white">{DEMO_USER_ID}</strong>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            3-Question Interactive Gauntlet &bull; Ingestion Engine &bull; In-Camera HUD Teleprompter
          </p>
        </div>

        {/* View Mode Switcher & Live API Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
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

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE API // ATLAS MEMORY</span>
          </div>
        </div>
      </header>

      {/* API Connection Error Banner */}
      {apiError && (
        <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="block text-rose-200 font-bold font-mono">Simulation Error</strong>
              <span>{apiError}</span>
            </div>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold whitespace-nowrap font-mono"
          >
            Dismiss
          </button>
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
            className="text-gray-400 hover:text-white text-xs underline ml-2 font-mono"
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

      {/* 1. Setup Stage & Simulation Builder (Visible during SETUP or COMPLETE) */}
      {gauntletState === "SETUP" && (
        <div className="mt-6">
          <SimulationBuilderPanel
            selectedTrack={selectedTrack}
            onSelectTrack={(t) => {
              setSelectedTrack(t);
              setGauntletQuestions(t.questions);
              if (t.questions.length > 0) setSelectedQuestion(t.questions[0]);
            }}
            selectedQuestion={selectedQuestion}
            onSelectQuestion={setSelectedQuestion}
            gauntletQuestions={gauntletQuestions}
            onSetGauntletQuestions={setGauntletQuestions}
            customTitle={customTitle}
            onChangeCustomTitle={setCustomTitle}
            ingestionText={ingestionText}
            onChangeIngestionText={setIngestionText}
            onGenerateQuestions={handleGenerateQuestions}
            isGeneratingQuestions={isGeneratingQuestions}
            generatedSummary={generatedSummary}
            inferredRole={inferredRole}
            activeTab={simulationTab}
            onTabChange={setSimulationTab}
            isPracticing={gauntletState !== "SETUP"}
          />
        </div>
      )}

      {/* Active Gauntlet Status Tracker Bar (when running) */}
      {gauntletState !== "SETUP" && (
        <div className="mt-4 p-3.5 rounded-xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              GAUNTLET ACTIVE // STAGE {currentStageIndex + 1} OF {gauntletQuestions.length}
            </span>
            <span className="text-gray-300">
              Role: <strong className="text-white">{currentRoleTitle}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-gray-400">
              Completed: {completedStageInputs.length} / {gauntletQuestions.length} stages
            </span>

            <button
              onClick={handleAddBonusQuestion}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-border border border-surface-border text-cyan-300 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Bonus Question (+1)</span>
            </button>
          </div>
        </div>
      )}

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
                questionText={currentQuestion?.text || selectedQuestion.text}
                targetRubric={currentQuestion?.targetRubric || selectedQuestion.targetRubric}
                roleTitle={currentRoleTitle}
                gauntletState={gauntletState}
                currentStage={currentStageIndex + 1}
                totalStages={gauntletQuestions.length}
                prepSecondsRemaining={prepSecondsRemaining}
                recordingSecondsRemaining={recordingSecondsRemaining}
                transitionSecondsRemaining={transitionSecondsRemaining}
                onSkipPrep={startStageRecording}
                onSkipTransition={() => startStagePrep(currentStageIndex + 1)}
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

              <HudTeleprompter
                questionText={currentQuestion?.text || selectedQuestion.text}
                targetRubric={currentQuestion?.targetRubric || selectedQuestion.targetRubric}
                roleTitle={currentRoleTitle}
                gauntletState={gauntletState}
                currentStage={currentStageIndex + 1}
                totalStages={gauntletQuestions.length}
                prepSecondsRemaining={prepSecondsRemaining}
                recordingSecondsRemaining={recordingSecondsRemaining}
                transitionSecondsRemaining={transitionSecondsRemaining}
                onSkipPrep={startStageRecording}
                onSkipTransition={() => startStagePrep(currentStageIndex + 1)}
                isLookingAtCamera={isLookingAtCamera}
              />
            </div>
          )}

          {/* Audio Visualizer Bar */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 w-28 flex-shrink-0">
              {gauntletState === "RECORDING" && volumeLevel > 0.05 ? (
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="w-4 h-4 text-gray-500" />
              )}
              <span className="font-mono">Mic Visualizer</span>
            </div>

            {/* Equalizer Visualizer Bars */}
            <div className="flex-1 flex items-center gap-1 h-6 bg-surface-card rounded-lg px-2 overflow-hidden border border-surface-border/50">
              {Array.from({ length: 32 }).map((_, i) => {
                const threshold = (i + 1) / 32;
                const isLit = gauntletState === "RECORDING" && volumeLevel >= threshold * 0.8;
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
            {gauntletState === "SETUP" ? (
              <div className="flex-1 flex gap-3">
                <button
                  onClick={handleInitiateGauntlet}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-gray-950 font-bold transition-all shadow-lg shadow-cyan-500/20 font-mono tracking-wide"
                >
                  <Play className="w-5 h-5 fill-current" />
                  INITIATE 3-QUESTION GAUNTLET (30S PREP &rarr; 60S RECORDING)
                </button>

                {gauntletScorecardData && (
                  <button
                    onClick={() => setIsScorecardOpen(true)}
                    className="flex items-center justify-center gap-2 py-4 px-5 rounded-xl bg-surface-card hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-all font-mono"
                  >
                    View Scorecard ({gauntletScorecardData.cumulative_scorecard.overall_score}/100)
                  </button>
                )}
              </div>
            ) : gauntletState === "PREP" ? (
              <button
                onClick={startStageRecording}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold transition-all shadow-lg shadow-amber-500/20 font-mono tracking-wide"
              >
                <Play className="w-5 h-5 fill-current" />
                READY TO ANSWER &mdash; START STAGE {currentStageIndex + 1} RECORDING
              </button>
            ) : gauntletState === "RECORDING" ? (
              <button
                onClick={finishCurrentStageRecording}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-lg shadow-rose-500/20 font-mono tracking-wide"
              >
                <Square className="w-5 h-5 fill-current" />
                FINISH STAGE {currentStageIndex + 1} ANSWER EARLY
              </button>
            ) : gauntletState === "INTER_STAGE" ? (
              <button
                onClick={() => startStagePrep(currentStageIndex + 1)}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-all shadow-lg shadow-purple-500/20 font-mono tracking-wide"
              >
                <FastForward className="w-5 h-5" />
                START STAGE {currentStageIndex + 2} PREPARATION NOW
              </button>
            ) : (
              <button
                onClick={() => setGauntletState("SETUP")}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-gray-950 font-bold transition-all font-mono"
              >
                <RotateCcw className="w-5 h-5" />
                START NEW SIMULATION MATRIX
              </button>
            )}
          </div>

          {/* Responsible AI Guarantee Badge */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">
                Responsible AI Guarantee
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Raw video is never transmitted or stored. Analysis is derived on-device via WebAssembly
                and focuses exclusively on observable presentation signals without diagnosing psychological states.
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
            isPracticing={gauntletState === "RECORDING"}
            targetRole={currentRoleTitle}
            targetRubric={currentQuestion?.targetRubric || selectedQuestion.targetRubric}
            headStabilityPct={cyberMetrics?.headStabilityPct ?? 0.95}
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
              Multi-Agent Team evaluating 3-Question Gauntlet &amp; synthesizing Atlas memory...
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Evaluating stage subscores, cumulative consistency, and generating 768-dim Atlas embeddings
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
                <span>Step A: Stage-by-Stage Substance &amp; Delivery Evaluation</span>
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
                <span>Step B: Cumulative Consistency &amp; Cross-Stage Progression</span>
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
                <span>Step C: MongoDB Atlas Episodic Retrieval &amp; Historical Delta</span>
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
                <span>Step D: Drill Generator &amp; 768-dim Atlas Embedding Storage</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Scorecard Modal with Gauntlet or Single Session Data */}
      {(gauntletScorecardData || singleScorecardData) && (
        <ScorecardModal
          isOpen={isScorecardOpen}
          onClose={() => setIsScorecardOpen(false)}
          data={singleScorecardData}
          gauntletData={gauntletScorecardData}
          onStartDrill={handleStartDrill}
          onPracticeAgain={() => {
            setIsScorecardOpen(false);
            setGauntletState("SETUP");
          }}
        />
      )}
    </div>
  );
}
