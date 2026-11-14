"use client";

import React from "react";
import {
  Clock,
  Eye,
  Radio,
  Target,
  Play,
  FastForward,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export type GauntletModeState = "SETUP" | "PREP" | "RECORDING" | "INTER_STAGE" | "COMPLETE";

interface HudTeleprompterProps {
  questionText: string;
  targetRubric: string;
  roleTitle: string;
  gauntletState: GauntletModeState;
  currentStage: number;
  totalStages: number;
  prepSecondsRemaining: number;
  recordingSecondsRemaining: number;
  transitionSecondsRemaining: number;
  onSkipPrep: () => void;
  onSkipTransition?: () => void;
  isLookingAtCamera?: boolean;
}

export function HudTeleprompter({
  questionText,
  targetRubric,
  roleTitle,
  gauntletState,
  currentStage,
  totalStages,
  prepSecondsRemaining,
  recordingSecondsRemaining,
  transitionSecondsRemaining,
  onSkipPrep,
  onSkipTransition,
  isLookingAtCamera = true,
}: HudTeleprompterProps) {
  // 1. STATE A: Prep Countdown Window (30s)
  if (gauntletState === "PREP") {
    const prepPct = Math.round((prepSecondsRemaining / 30) * 100);

    return (
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-30 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <div className="relative p-4 sm:p-5 rounded-2xl border-2 border-amber-500/50 bg-slate-950/90 backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.25)] text-center overflow-hidden">
          {/* Glowing amber scanline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

          {/* Top Bar: Stage & Prep Timer */}
          <div className="flex items-center justify-between text-xs font-mono mb-2 pb-1.5 border-b border-amber-500/20">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span>
                STAGE [{currentStage}/{totalStages}] // PREPARATION WINDOW
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">
                00:{prepSecondsRemaining < 10 ? `0${prepSecondsRemaining}` : prepSecondsRemaining}
              </span>
              <span className="text-[10px] text-gray-400 font-normal">prep left</span>
            </div>
          </div>

          {/* Prep Progress Bar */}
          <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden mb-3 border border-amber-500/20">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              style={{ width: `${prepPct}%` }}
            />
          </div>

          {/* Current Question - Prominent Readout */}
          <div className="my-2 px-2 sm:px-6">
            <span className="text-[10px] uppercase font-mono text-amber-400/90 tracking-wider block mb-1">
              Read &amp; Structure Answer (STAR Format)
            </span>
            <p className="text-sm sm:text-base font-bold text-white tracking-wide leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          {/* Target Rubric Tag & Ready Button */}
          <div className="mt-3 pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
              {targetRubric}
            </span>

            {/* Ready to Answer button (Skip remaining prep) */}
            <button
              onClick={onSkipPrep}
              className="pointer-events-auto flex items-center gap-1.5 py-1.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold text-xs transition-all shadow-md shadow-amber-500/30 font-mono tracking-wide"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>READY TO ANSWER (START RECORDING)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. STATE B: Live Recording (60s) - Eye-line aligned at top bezel
  if (gauntletState === "RECORDING") {
    return (
      <div className="absolute top-3 inset-x-3 sm:inset-x-8 z-30 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <div className="relative p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.25)] text-center overflow-hidden">
          {/* Neon cyan scanline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

          {/* Top Telemetry Header Bar */}
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 pb-1 border-b border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>
                STAGE [{currentStage}/{totalStages}] // LIVE RECORDING
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                  isLookingAtCamera
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                <Eye className="w-2.5 h-2.5" />
                <span>{isLookingAtCamera ? "EYE-CONTACT LOCKED" : "GAZE OFF-LENS"}</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                <Clock className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: "8s" }} />
                <span>TIME: {recordingSecondsRemaining}s</span>
              </div>
            </div>
          </div>

          {/* Center Prompter Text - Eye-line aligned with camera lens */}
          <div className="my-1">
            <p className="text-xs sm:text-sm font-semibold text-white tracking-wide leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          {/* Bottom Cue & Target Rubric */}
          <div className="mt-1 flex items-center justify-center gap-2 text-[9px] font-mono text-cyan-400/90">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
              {targetRubric}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. STATE C: Inter-Stage Transition (5s)
  if (gauntletState === "INTER_STAGE") {
    return (
      <div className="absolute top-4 inset-x-3 sm:inset-x-12 z-30 transition-all duration-300 animate-in fade-in">
        <div className="relative p-4 sm:p-5 rounded-2xl border border-purple-500/50 bg-slate-950/90 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.25)] text-center overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-purple-300 font-bold mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>STAGE [{currentStage - 1}/{totalStages}] RECORDED // SYNCHRONIZING OBSERVATIONS</span>
          </div>

          <p className="text-sm font-semibold text-white my-1">
            Stage {currentStage - 1} response captured. Transitioning to Stage {currentStage}...
          </p>

          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="text-xs font-mono text-purple-400">
              Next prep starts in: <strong>{transitionSecondsRemaining}s</strong>
            </span>

            {onSkipTransition && (
              <button
                onClick={onSkipTransition}
                className="pointer-events-auto flex items-center gap-1 py-1 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[11px] font-mono"
              >
                <FastForward className="w-3 h-3" />
                <span>Start Next Stage Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Default / Pre-Recording Setup State
  return (
    <div className="absolute top-4 inset-x-3 sm:inset-x-8 z-30 pointer-events-none transition-all duration-300">
      <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-950/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.2)] overflow-hidden">
        {/* Futuristic corner brackets */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

        {/* HUD Mission Header */}
        <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 text-cyan-300/80">
          <div className="flex items-center gap-1.5 font-bold tracking-wider">
            <Target className="w-3 h-3 text-cyan-400" />
            <span>GAUNTLET OBJECTIVE // STAGE [1/{totalStages}]</span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            {roleTitle}
          </span>
        </div>

        {/* Question Text */}
        <div className="my-1">
          <p className="text-xs sm:text-sm font-semibold text-white tracking-wide leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            &ldquo;{questionText}&rdquo;
          </p>
        </div>

        {/* Target rubric tag */}
        <div className="mt-1.5 pt-1.5 border-t border-cyan-500/20 flex items-center justify-between text-[9px] font-mono">
          <span className="text-gray-400">
            [ 30S PREP WINDOW &rarr; 60S RECORDING PER STAGE ]
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold">
            {targetRubric}
          </span>
        </div>
      </div>
    </div>
  );
}
