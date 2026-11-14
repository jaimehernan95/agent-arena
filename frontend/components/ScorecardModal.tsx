"use client";

import React, { useState } from "react";
import {
  X,
  Trophy,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle2,
  Play,
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  RotateCcw,
  Volume2,
  Briefcase,
  HelpCircle,
  Award,
  BookOpen,
  Layers,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

import {
  AnalyzeSessionResponse,
  AnalyzeGauntletResponse,
  RecommendedDrill,
  GauntletStageResult,
} from "@/types/session";

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: AnalyzeSessionResponse | null;
  gauntletData?: AnalyzeGauntletResponse | null;
  onStartDrill: (drill: RecommendedDrill) => void;
  onPracticeAgain: () => void;
}

export function ScorecardModal({
  isOpen,
  onClose,
  data,
  gauntletData,
  onStartDrill,
  onPracticeAgain,
}: ScorecardModalProps) {
  // Tab index: 0 = Cumulative, 1..N = Stage 1..N
  const [activeTab, setActiveTab] = useState<number>(0);

  if (!isOpen) return null;
  if (!data && !gauntletData) return null;

  const isGauntlet = !!gauntletData;
  const stages: GauntletStageResult[] = gauntletData?.stages || [];

  // Determine current active view data
  const currentStage: GauntletStageResult | null =
    isGauntlet && activeTab > 0 && activeTab <= stages.length
      ? stages[activeTab - 1]
      : null;

  // Extract metrics based on active tab
  const scorecard = currentStage
    ? {
        overall_score: currentStage.stage_score,
        delivery_subscore: currentStage.delivery_subscore,
        content_subscore: currentStage.content_subscore,
        content_breakdown: currentStage.content_breakdown,
        strengths: currentStage.strengths,
        improvements: currentStage.improvements,
      }
    : gauntletData
    ? gauntletData.cumulative_scorecard
    : data!.scorecard;

  const observableMetrics = currentStage
    ? currentStage.observable_metrics
    : gauntletData
    ? {
        speaking_rate_wpm: Math.round(
          stages.reduce((acc, s) => acc + s.observable_metrics.speaking_rate_wpm, 0) /
            Math.max(1, stages.length)
        ),
        pause_count: Math.round(
          stages.reduce((acc, s) => acc + s.observable_metrics.pause_count, 0) /
            Math.max(1, stages.length)
        ),
        filler_words: stages.reduce((acc, s) => {
          for (const [w, c] of Object.entries(s.observable_metrics.filler_words)) {
            acc[w] = (acc[w] || 0) + c;
          }
          return acc;
        }, {} as Record<string, number>),
        gaze_on_camera_pct:
          Math.round(
            (stages.reduce((acc, s) => acc + s.observable_metrics.gaze_on_camera_pct, 0) /
              Math.max(1, stages.length)) *
              100
          ) / 100,
      }
    : data!.observable_metrics;

  const jobTitle = gauntletData?.job_title || data?.job_title || "Professional Role";
  const questionPrompt = currentStage
    ? currentStage.question
    : isGauntlet
    ? `3-Question Gauntlet (${stages.length} Stages Completed)`
    : data?.interview_question || "Interview Prompt";

  const recommendedDrills = gauntletData?.recommended_drills || data?.recommended_drills || [];
  const episodicComparison = gauntletData?.episodic_comparison || data?.episodic_comparison;

  const { overall_score, strengths, improvements, content_breakdown } = scorecard;
  const { speaking_rate_wpm, filler_words, gaze_on_camera_pct } = observableMetrics;

  const deliveryScore =
    scorecard.delivery_subscore ?? Math.round(overall_score * 0.4);
  const contentScore =
    scorecard.content_subscore ?? Math.round(overall_score * 0.6);

  const totalFillers = Object.values(filler_words).reduce((a, b) => a + b, 0);

  // Score color grading
  const getScoreColor = (score: number) => {
    if (score >= 85)
      return {
        text: "text-emerald-400",
        stroke: "#10b981",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    if (score >= 70)
      return {
        text: "text-sky-400",
        stroke: "#38bdf8",
        badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      };
    return {
      text: "text-amber-400",
      stroke: "#f59e0b",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  };

  const scoreTheme = getScoreColor(overall_score);

  // SVG Gauge calculations (radius = 48, perimeter = 2 * PI * 48 = 301.6)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  // Pace status tag
  const getPaceStatus = (wpm: number) => {
    if (wpm >= 130 && wpm <= 155)
      return {
        label: "Optimal Pace",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    if (wpm > 155)
      return {
        label: "Fast Paced",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    return {
      label: "Deliberate / Slow",
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    };
  };

  const paceStatus = getPaceStatus(speaking_rate_wpm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-8 bg-surface rounded-2xl border border-surface-border shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {isGauntlet ? "Gauntlet Simulation Scorecard" : "Practice Scorecard"}
                {isGauntlet && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {stages.length} Stages
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Context-Aware Dual-Pillar Evaluation &bull; MongoDB Atlas Memory
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gauntlet Stage Tabs Strip */}
        {isGauntlet && stages.length > 0 && (
          <div className="flex items-center gap-1 px-6 pt-3 pb-1 border-b border-surface-border/60 bg-surface-card/30 overflow-x-auto">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                activeTab === 0
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-surface-card"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cumulative Overview</span>
            </button>

            {stages.map((stg, i) => {
              const tabIdx = i + 1;
              const isSelected = activeTab === tabIdx;

              return (
                <button
                  key={stg.stage_number}
                  onClick={() => setActiveTab(tabIdx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-surface-card"
                  }`}
                >
                  <span>Stage {stg.stage_number}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded ${
                      stg.stage_score >= 80
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-surface text-gray-300"
                    }`}
                  >
                    {stg.stage_score}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Target Role & Question Context Banner */}
          <div className="p-3.5 rounded-xl bg-surface-card/80 border border-surface-border flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-medium font-mono">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>
                Target Role: <strong className="text-white">{jobTitle}</strong>
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-300">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
              <span>
                Prompt: <strong className="text-gray-100 italic">&ldquo;{questionPrompt}&rdquo;</strong>
              </span>
            </div>

            {/* Candidate Transcript if viewing individual stage */}
            {currentStage && currentStage.transcript && (
              <div className="mt-2 pt-2 border-t border-surface-border/40">
                <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3 text-purple-400" />
                  CANDIDATE TRANSCRIBED RESPONSE ({currentStage.transcript.split(/\s+/).length} words):
                </span>
                <p className="text-xs text-gray-300 bg-surface/80 p-2.5 rounded-lg border border-surface-border/50 italic leading-relaxed">
                  &ldquo;{currentStage.transcript}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Top Section: Overall Score Gauge & Dual-Pillar Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Overall Score Gauge */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-card border border-surface-border/80">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-800"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    stroke={scoreTheme.stroke}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-extrabold font-mono ${scoreTheme.text}`}>
                    {overall_score}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                    {currentStage ? `Stage ${currentStage.stage_number}` : "Overall"}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${scoreTheme.badge}`}
                >
                  {overall_score >= 85
                    ? "Excellent Performance"
                    : overall_score >= 70
                    ? "Solid Delivery"
                    : overall_score <= 50
                    ? "Substance Gate Triggered"
                    : "Practice Recommended"}
                </span>
              </div>
            </div>

            {/* Dual Pillars: Delivery (40%) and Content & Structure (60%) */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delivery Score Card */}
              <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-cyan-400" />
                      Delivery Mechanics
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                      40% Weight
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
                    {deliveryScore} <span className="text-xs text-gray-400 font-normal">/ 40</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Pacing, Eye-Contact Gaze, Verbal Fillers &amp; Cadence
                  </p>
                </div>

                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((deliveryScore / 40) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Content & Structure Score Card */}
              <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      Content &amp; Structure
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                      60% Weight
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
                    {contentScore} <span className="text-xs text-gray-400 font-normal">/ 60</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Relevance, STAR Framework, Domain Depth
                  </p>
                </div>

                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-purple-400 h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((contentScore / 60) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Content Breakdown Progress Bars */}
              {content_breakdown && (
                <div className="sm:col-span-2 p-3 rounded-lg bg-surface/80 border border-surface-border/60 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-gray-400 font-mono">Relevance</div>
                    <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
                      {content_breakdown.relevance_score}
                      <span className="text-[10px] text-gray-400">/25</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-mono">STAR Structure</div>
                    <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
                      {content_breakdown.structure_score}
                      <span className="text-[10px] text-gray-400">/20</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-mono">Domain Depth</div>
                    <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
                      {content_breakdown.domain_depth_score}
                      <span className="text-[10px] text-gray-400">/15</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Speaking Pace Badge */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Speaking Pace
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${paceStatus.badge}`}
                >
                  {paceStatus.label}
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {speaking_rate_wpm} <span className="text-xs font-normal text-gray-400">WPM</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Benchmark: 130–155 WPM</p>
            </div>

            {/* Eye-Contact / Gaze Percentage Indicator Bar */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Camera Gaze
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {Math.round(gaze_on_camera_pct * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 my-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-400 to-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(gaze_on_camera_pct * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">Benchmark: &ge;80% camera lens lock</p>
            </div>

            {/* Filler Word Tally */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Filler Word Tally
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {totalFillers} total
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.keys(filler_words).length > 0 ? (
                  Object.entries(filler_words).map(([word, count]) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono"
                    >
                      <span>&ldquo;{word}&rdquo;:</span>
                      <strong className="text-white">{count}</strong>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Zero verbal fillers!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Episodic Growth Panel (Cross-Session MongoDB Atlas Context) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-surface-card to-surface border border-cyan-500/30 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Episodic Growth Comparison
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      MongoDB Atlas Memory
                    </span>
                  </h3>
                </div>
              </div>
            </div>

            {episodicComparison ? (
              <div className="p-3.5 rounded-xl bg-black/40 border border-surface-border/60 text-xs text-cyan-200 leading-relaxed font-mono">
                {episodicComparison}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-black/40 border border-surface-border/60 text-xs text-gray-400 font-mono">
                Baseline practice established. Future sessions will highlight your multi-stage progression.
              </div>
            )}

            {/* Strengths & Improvements List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Observed Strengths
                </span>
                <ul className="space-y-1">
                  {strengths.map((str, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-gray-300 bg-surface/60 p-2 rounded-lg border border-surface-border/40 leading-snug"
                    >
                      &bull; {str}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Actionable Improvements
                </span>
                <ul className="space-y-1">
                  {improvements.map((imp, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-gray-300 bg-surface/60 p-2 rounded-lg border border-surface-border/40 leading-snug"
                    >
                      &bull; {imp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recommended Micro-Drills (On Cumulative Overview) */}
          {activeTab === 0 && recommendedDrills.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Personalized 30-Second Micro-Drills
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">Targeting Weaknesses</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedDrills.map((drill, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-surface-card border border-surface-border hover:border-cyan-400/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                          {drill.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {drill.duration_sec}s
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        {drill.instructions}
                      </p>
                    </div>

                    <button
                      onClick={() => onStartDrill(drill)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-400 text-cyan-300 hover:text-gray-950 border border-cyan-500/20 text-xs font-semibold transition-all font-mono"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start 30s Drill
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responsible AI Guarantee Badge */}
          <div className="p-4 rounded-xl bg-surface-card/60 border border-surface-border/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide">
                Responsible AI Guarantee
              </h4>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Raw video is never transmitted or stored. Analysis is derived entirely on-device via WebAssembly
                and focuses exclusively on observable presentation signals and structured content quality—never
                diagnosing emotions, nervousness, or psychological states.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border bg-surface-card/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-colors font-mono"
          >
            Close
          </button>

          <button
            onClick={onPracticeAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-gray-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isGauntlet ? "Start New Gauntlet (3 Stages)" : "Practice Again (60s)"}
          </button>
        </div>
      </div>
    </div>
  );
}
