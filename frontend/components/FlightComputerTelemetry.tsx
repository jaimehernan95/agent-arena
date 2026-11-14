"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Activity,
  Clock,
  Eye,
  AlertCircle,
  RotateCcw,
  Volume2,
  Sparkles,
  Zap,
  Layers,
  Terminal,
} from "lucide-react";

interface FlightComputerTelemetryProps {
  speakingRateWpm: number;
  fillerWords: Record<string, number>;
  gazeOnCameraPct: number;
  pauseCount: number;
  transcript: string;
  isPracticing: boolean;
  targetRole: string;
  targetRubric: string;
  headStabilityPct?: number;
}

export function FlightComputerTelemetry({
  speakingRateWpm,
  fillerWords,
  gazeOnCameraPct,
  pauseCount,
  transcript,
  isPracticing,
  targetRole,
  targetRubric,
  headStabilityPct = 0.95,
}: FlightComputerTelemetryProps) {
  // Total fillers tally
  const totalFillers = Object.values(fillerWords).reduce((a, b) => a + b, 0);

  // Flash detection when new filler word occurs
  const [recentFillerAlert, setRecentFillerAlert] = useState<string | null>(null);
  const prevFillerCountRef = useRef<number>(0);
  const prevFillerWordsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isPracticing) {
      setRecentFillerAlert(null);
      prevFillerCountRef.current = 0;
      prevFillerWordsRef.current = {};
      return;
    }

    if (totalFillers > prevFillerCountRef.current) {
      // Find which word increased
      let detectedWord = "filler";
      for (const [w, count] of Object.entries(fillerWords)) {
        const prevCount = prevFillerWordsRef.current[w] || 0;
        if (count > prevCount) {
          detectedWord = w.toUpperCase();
          break;
        }
      }

      setRecentFillerAlert(detectedWord);
      const timer = setTimeout(() => {
        setRecentFillerAlert(null);
      }, 2500);

      prevFillerCountRef.current = totalFillers;
      prevFillerWordsRef.current = { ...fillerWords };

      return () => clearTimeout(timer);
    }

    prevFillerCountRef.current = totalFillers;
    prevFillerWordsRef.current = { ...fillerWords };
  }, [totalFillers, fillerWords, isPracticing]);

  // Pace status calculation
  const getPaceStatus = (wpm: number) => {
    if (wpm === 0) return { label: "Awaiting Speech", badge: "text-gray-400 border-gray-700 bg-gray-900/40", zone: "idle" };
    if (wpm >= 130 && wpm <= 155) return { label: "Optimal Cadence", badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", zone: "optimal" };
    if (wpm > 155) return { label: "Accelerated Pace", badge: "text-amber-400 border-amber-500/30 bg-amber-500/10", zone: "fast" };
    return { label: "Deliberate / Slow", badge: "text-sky-400 border-sky-500/30 bg-sky-500/10", zone: "slow" };
  };

  const paceStatus = getPaceStatus(speakingRateWpm);
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-4 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Background cyber accent */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-36 h-36 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-1.5">
              Flight Computer <span className="text-cyan-400">// Telemetry</span>
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {isPracticing ? "ACTIVE INFERENCE" : "STANDBY"}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                headStabilityPct >= 0.7
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse"
              }`}
            >
              POSTURE: {Math.round(headStabilityPct * 100)}%
            </span>
          </div>
        </div>

        {/* Live Flash Alert when filler word is uttered */}
        {recentFillerAlert && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold flex items-center justify-between animate-bounce">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              VERBAL DISFLUENCY DETECTED: &ldquo;{recentFillerAlert}&rdquo;
            </span>
            <span className="text-[10px] text-amber-200">-2.0 PTS</span>
          </div>
        )}

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Speaking Rate (WPM) Gauge */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Speaking Pace
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${paceStatus.badge}`}>
                {paceStatus.label}
              </span>
            </div>

            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {speakingRateWpm}
              </span>
              <span className="text-xs text-gray-400 ml-1 font-mono">WPM</span>
            </div>

            {/* Visual Pace Gauge with 130-155 zone */}
            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden relative border border-gray-800">
              {/* Optimal zone marker */}
              <div className="absolute left-[65%] w-[12.5%] h-full bg-emerald-500/30 pointer-events-none" />
              <div
                className={`h-full transition-all duration-300 ${
                  speakingRateWpm >= 130 && speakingRateWpm <= 155
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : speakingRateWpm > 155
                    ? "bg-amber-400"
                    : "bg-sky-400"
                }`}
                style={{ width: `${Math.min(100, (speakingRateWpm / 200) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-gray-400 mt-1">Target: 130–150 WPM</span>
          </div>

          {/* Gaze Lock % */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Gaze on Lens
              </span>
              <span className="text-[9px] font-mono text-emerald-400">
                &ge;80% Goal
              </span>
            </div>

            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {Math.round(gazeOnCameraPct * 100)}%
              </span>
            </div>

            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden border border-gray-800">
              <div
                className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${Math.round(gazeOnCameraPct * 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-gray-400 mt-1">Optical iris alignment</span>
          </div>

          {/* Verbal Filler Word Counter */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Fillers Logged
              </span>
              <span className="text-[9px] font-mono text-amber-400">
                Max 0
              </span>
            </div>

            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-amber-300">
                {totalFillers}
              </span>
            </div>

            <div className="text-[10px] text-gray-400 truncate font-mono">
              {Object.keys(fillerWords).length > 0
                ? Object.entries(fillerWords)
                    .map(([w, c]) => `${w}: ${c}`)
                    .join(", ")
                : "zero detected"}
            </div>
          </div>

          {/* Pauses (> 1.5s) */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                Pauses (&gt;1.5s)
              </span>
              <span className="text-[9px] font-mono text-rose-400">
                Cadence
              </span>
            </div>

            <div className="my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pauseCount}
              </span>
            </div>

            <span className="text-[9px] font-mono text-gray-400">
              {pauseCount > 3 ? "Excessive hesitation" : "Natural phrasing"}
            </span>
          </div>
        </div>

        {/* Dual-Pillar Live Distribution Indicator */}
        <div className="mt-3 p-3 rounded-xl bg-surface-card border border-surface-border/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              DUAL-PILLAR EVALUATION SPLIT
            </span>
            <span className="text-cyan-400 font-bold">100 PTS</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 rounded-lg bg-surface/80 border border-cyan-500/20">
              <div className="text-cyan-400 font-bold">DELIVERY: 40%</div>
              <div className="text-gray-400 text-[9px] mt-0.5">Pacing, Eye Contact, Fillers</div>
            </div>
            <div className="p-2 rounded-lg bg-surface/80 border border-purple-500/20">
              <div className="text-purple-400 font-bold">CONTENT: 60%</div>
              <div className="text-gray-400 text-[9px] mt-0.5 truncate">{targetRole}</div>
            </div>
          </div>
        </div>

        {/* Real-Time Speech Transcript Dock */}
        <div className="mt-3 p-3.5 rounded-xl bg-surface-card border border-surface-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1.5 text-white">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Live Speech Transcript
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {wordCount} words {wordCount < 25 && isPracticing && "(Min 25 req.)"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-black/50 border border-surface-border/40 text-xs text-gray-300 min-h-[90px] max-h-[140px] overflow-y-auto leading-relaxed font-sans">
            {transcript ? (
              <span>
                {transcript}
                {isPracticing && <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse" />}
              </span>
            ) : (
              <span className="text-gray-500 italic">
                {isPracticing
                  ? "Awaiting speech input... speak toward the camera prompter."
                  : "Select a simulation track above, then click 'Start 60s Practice'."}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
