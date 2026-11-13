"use client";

import React from "react";
import {
  Cpu,
  Briefcase,
  ShieldAlert,
  Rocket,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Terminal,
  Target,
  PlusCircle,
} from "lucide-react";

import { MissionTrack, MissionQuestion, MISSION_TRACKS } from "@/types/mission";

interface MissionStageSelectProps {
  selectedTrack: MissionTrack;
  onSelectTrack: (track: MissionTrack) => void;
  selectedQuestion: MissionQuestion;
  onSelectQuestion: (question: MissionQuestion) => void;
  customRole: string;
  onChangeCustomRole: (val: string) => void;
  customQuestionText: string;
  onChangeCustomQuestionText: (val: string) => void;
  isCustomActive: boolean;
  onToggleCustom: (active: boolean) => void;
  isPracticing: boolean;
}

const TRACK_ICONS = {
  Cpu: Cpu,
  Briefcase: Briefcase,
  ShieldAlert: ShieldAlert,
  Rocket: Rocket,
  Sparkles: Sparkles,
};

export function MissionStageSelect({
  selectedTrack,
  onSelectTrack,
  selectedQuestion,
  onSelectQuestion,
  customRole,
  onChangeCustomRole,
  customQuestionText,
  onChangeCustomQuestionText,
  isCustomActive,
  onToggleCustom,
  isPracticing,
}: MissionStageSelectProps) {
  const isCustom = selectedTrack.id === "custom" || isCustomActive;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4 relative overflow-hidden">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
            Simulation Matrix <span className="text-cyan-400">// Stage Select</span>
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>DUAL-PILLAR RUBRIC: CONTENT 60% + DELIVERY 40%</span>
        </div>
      </div>

      {/* Holographic Track Cards Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {MISSION_TRACKS.map((track) => {
          const isSelected = selectedTrack.id === track.id;
          const IconComponent = TRACK_ICONS[track.iconName] || Sparkles;

          // Theme styling based on accent
          const themeClasses = {
            cyan: isSelected
              ? "border-cyan-400/80 bg-cyan-950/40 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]"
              : "border-surface-border hover:border-cyan-500/40 hover:bg-surface-card",
            indigo: isSelected
              ? "border-indigo-400/80 bg-indigo-950/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
              : "border-surface-border hover:border-indigo-500/40 hover:bg-surface-card",
            emerald: isSelected
              ? "border-emerald-400/80 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              : "border-surface-border hover:border-emerald-500/40 hover:bg-surface-card",
            amber: isSelected
              ? "border-amber-400/80 bg-amber-950/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              : "border-surface-border hover:border-amber-500/40 hover:bg-surface-card",
            rose: isSelected
              ? "border-rose-400/80 bg-rose-950/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
              : "border-surface-border hover:border-rose-500/40 hover:bg-surface-card",
          }[track.accentColor];

          return (
            <button
              key={track.id}
              onClick={() => {
                if (isPracticing) return;
                onSelectTrack(track);
                if (track.id === "custom") {
                  onToggleCustom(true);
                } else {
                  onToggleCustom(false);
                  if (track.questions.length > 0) {
                    onSelectQuestion(track.questions[0]);
                  }
                }
              }}
              disabled={isPracticing}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 group relative ${themeClasses} disabled:opacity-50`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isSelected
                        ? "bg-white/10 border border-white/20"
                        : "bg-surface-card border border-surface-border"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  )}
                </div>
                <div className="text-xs font-bold text-white tracking-tight line-clamp-1">
                  {track.shortTitle}
                </div>
                <div className="text-[10px] text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                  {track.subtitle}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-gray-400">
                  {track.id === "custom" ? "Custom" : `${track.questions.length} Drills`}
                </span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    isSelected ? "translate-x-0.5 text-white" : "text-gray-500"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Question Selector Stage for Active Track */}
      {!isCustom ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              AVAILABLE TARGET DRILLS ({selectedTrack.title})
            </span>
            <button
              onClick={() => onToggleCustom(true)}
              disabled={isPracticing}
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Custom Question...
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {selectedTrack.questions.map((q, idx) => {
              const isQSelected = selectedQuestion.id === q.id && !isCustomActive;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    if (isPracticing) return;
                    onSelectQuestion(q);
                    onToggleCustom(false);
                  }}
                  disabled={isPracticing}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isQSelected
                      ? "border-cyan-400/80 bg-cyan-950/30 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                      : "border-surface-border bg-surface-card/60 text-gray-300 hover:border-surface-border hover:bg-surface-card hover:text-white"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isQSelected
                          ? "bg-cyan-500/20 text-cyan-300 font-bold"
                          : "bg-surface text-gray-400"
                      }`}
                    >
                      0{idx + 1}
                    </span>
                    <p className="text-xs leading-relaxed line-clamp-3">
                      &ldquo;{q.text}&rdquo;
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-gray-400 truncate max-w-[90%]">
                      {q.targetRubric}
                    </span>
                    {isQSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Custom Mission Input Deck */
        <div className="p-4 rounded-xl bg-surface-card border border-rose-500/30 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-rose-300 flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              CUSTOM SIMULATION SPECIFICATION
            </span>
            <button
              onClick={() => onToggleCustom(false)}
              className="text-[11px] text-gray-400 hover:text-gray-200 underline"
            >
              Return to Preloaded Tracks
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                TARGET ROLE / MISSION TITLE
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => onChangeCustomRole(e.target.value)}
                disabled={isPracticing}
                placeholder="e.g. Chief Medical Officer, Quant Trader"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-white text-xs focus:outline-none focus:border-rose-400 disabled:opacity-60 transition-colors font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                TARGET INTERVIEW PROMPT QUESTION
              </label>
              <input
                type="text"
                value={customQuestionText}
                onChange={(e) => onChangeCustomQuestionText(e.target.value)}
                disabled={isPracticing}
                placeholder="Enter the targeted question for the Gemini evaluation rubric..."
                className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-white text-xs focus:outline-none focus:border-rose-400 disabled:opacity-60 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
