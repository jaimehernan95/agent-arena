"use client";

import React from "react";
import { Clock, Eye, Sparkles, Target, Radio } from "lucide-react";

interface HudTeleprompterProps {
  questionText: string;
  targetRubric: string;
  roleTitle: string;
  isPracticing: boolean;
  secondsRemaining: number;
  isLookingAtCamera?: boolean;
}

export function HudTeleprompter({
  questionText,
  targetRubric,
  roleTitle,
  isPracticing,
  secondsRemaining,
  isLookingAtCamera = true,
}: HudTeleprompterProps) {
  if (isPracticing) {
    // Active Recording State: Pinned right at top bezel directly below webcam lens
    return (
      <div className="absolute top-3 inset-x-3 sm:inset-x-8 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <div className="relative p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.25)] text-center overflow-hidden">
          {/* Subtle neon glowing horizontal scanline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

          {/* Top Telemetry Header Bar */}
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 pb-1 border-b border-cyan-500/20">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>REC // 60s SIMULATION</span>
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
                <span>TIME: {secondsRemaining}s</span>
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

  // Pre-Recording State: Upper-third translucent HUD visor banner over camera
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
            <span>MISSION OBJECTIVE // 60s DRILL</span>
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
            [ KEEP EYE CONTACT ON PROMPTER // GAZE TARGET: &ge;80% ]
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold">
            {targetRubric}
          </span>
        </div>
      </div>
    </div>
  );
}
