"use client";

import React, { useState, useRef } from "react";
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
  FileText,
  UploadCloud,
  Loader2,
  X,
  FileCheck,
  Zap,
} from "lucide-react";

import { MissionTrack, MissionQuestion, MISSION_TRACKS } from "@/types/mission";
import { extractTextFromFile } from "@/utils/extractDocumentText";

interface MissionStageSelectProps {
  selectedTrack: MissionTrack;
  onSelectTrack: (track: MissionTrack) => void;
  selectedQuestion: MissionQuestion;
  onSelectQuestion: (question: MissionQuestion) => void;
  // Gauntlet questions (3-question sequence)
  gauntletQuestions: MissionQuestion[];
  onSetGauntletQuestions: (questions: MissionQuestion[]) => void;
  // Custom ingestion state
  ingestionText: string;
  onChangeIngestionText: (val: string) => void;
  onGenerateQuestions: () => Promise<void>;
  isGeneratingQuestions: boolean;
  generatedSummary: string | null;
  inferredRole: string | null;
  activeModeTab: "preloaded" | "ingestion";
  onTabChange: (tab: "preloaded" | "ingestion") => void;
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
  gauntletQuestions,
  onSetGauntletQuestions,
  ingestionText,
  onChangeIngestionText,
  onGenerateQuestions,
  isGeneratingQuestions,
  generatedSummary,
  inferredRole,
  activeModeTab,
  onTabChange,
  isPracticing,
}: MissionStageSelectProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Handle file drop / upload
  const handleFileChange = async (file: File) => {
    setFileError(null);
    setIsReadingFile(true);
    try {
      const extracted = await extractTextFromFile(file);
      onChangeIngestionText(extracted.slice(0, 5000));
      setUploadedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    } catch (err: any) {
      console.error("[MissionStageSelect] File read error:", err);
      setFileError(err.message || "Failed to parse document text.");
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isPracticing) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileChange(file);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4 relative overflow-hidden">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Mode Toggle Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
            Simulation Matrix <span className="text-cyan-400">// Gauntlet Setup</span>
          </h3>
        </div>

        {/* Tab A vs Tab B Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-card border border-surface-border self-start sm:self-auto font-mono text-[11px]">
          <button
            onClick={() => {
              if (isPracticing) return;
              onTabChange("preloaded");
            }}
            disabled={isPracticing}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeModeTab === "preloaded"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tab A: Preloaded Tracks</span>
          </button>

          <button
            onClick={() => {
              if (isPracticing) return;
              onTabChange("ingestion");
            }}
            disabled={isPracticing}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeModeTab === "ingestion"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Tab B: Ingest JD / Deck</span>
          </button>
        </div>
      </div>

      {/* TAB A: Preloaded Tracks */}
      {activeModeTab === "preloaded" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Holographic Track Cards Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MISSION_TRACKS.filter((t) => t.id !== "custom").map((track) => {
              const isSelected = selectedTrack.id === track.id;
              const IconComponent = TRACK_ICONS[track.iconName] || Sparkles;

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
                    onSetGauntletQuestions(track.questions);
                    if (track.questions.length > 0) {
                      onSelectQuestion(track.questions[0]);
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
                    <span className="text-gray-400">3-Stage Gauntlet</span>
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

          {/* Gauntlet Sequence Preview */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                3-QUESTION GAUNTLET SEQUENCE ({selectedTrack.title})
              </span>
              <span className="text-[10px] text-gray-400">
                Auto-progresses through Stages 1 &rarr; 2 &rarr; 3
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {gauntletQuestions.map((q, idx) => {
                const isCurrentFirst = selectedQuestion.id === q.id;
                const difficultyLabels = ["Stage 1: Warm-up", "Stage 2: Deep-Dive", "Stage 3: Execution"];

                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isCurrentFirst
                        ? "border-cyan-400/80 bg-cyan-950/30 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]"
                        : "border-surface-border bg-surface-card/60 text-gray-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-surface-border text-cyan-300 font-bold">
                          {difficultyLabels[idx] || `Stage ${idx + 1}`}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">60s Limit</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-3 my-1">
                        &ldquo;{q.text}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-gray-400 truncate max-w-[90%]">
                        {q.targetRubric}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: Custom Ingestion (JD / Presentation Deck) */}
      {activeModeTab === "ingestion" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Textarea for pasting JD */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
                <span className="flex items-center gap-1.5 font-bold text-purple-300">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  PASTE JOB DESCRIPTION, PITCH DECK, OR SYLLABUS
                </span>
                <span className="text-gray-400">
                  {ingestionText.length} / 5,000 characters
                </span>
              </div>

              <textarea
                value={ingestionText}
                onChange={(e) => onChangeIngestionText(e.target.value.slice(0, 5000))}
                disabled={isPracticing || isGeneratingQuestions}
                rows={5}
                placeholder="Paste the target Job Description, technical requirements, or investor deck outline here... The AI Multi-Agent engine will extract core competencies and generate 3 tailored interview gauntlet questions."
                className="w-full p-3 rounded-xl bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-purple-400 disabled:opacity-60 transition-colors leading-relaxed font-sans resize-none"
              />
            </div>

            {/* Right 1 Col: File Dropzone (.txt, .pdf) */}
            <div className="space-y-2 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-gray-300 font-bold flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                OR DROP RESUME / JD FILE (.TXT, .PDF)
              </span>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isPracticing && !isGeneratingQuestions) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  uploadedFileName
                    ? "border-emerald-500/50 bg-emerald-950/20"
                    : "border-surface-border hover:border-purple-400/60 bg-surface-card/40 hover:bg-surface-card"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,application/pdf,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {isReadingFile ? (
                  <div className="flex flex-col items-center gap-2 text-purple-300">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="text-xs font-mono">Parsing document text...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex flex-col items-center gap-1.5 text-emerald-300">
                    <FileCheck className="w-6 h-6 text-emerald-400" />
                    <span className="text-xs font-bold font-mono truncate max-w-[180px]">
                      {uploadedFileName}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFileName(null);
                        onChangeIngestionText("");
                      }}
                      className="text-[10px] text-gray-400 hover:text-white underline mt-1"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <UploadCloud className="w-6 h-6 text-purple-400/80 mb-1" />
                    <span className="text-xs font-bold text-gray-200">
                      Click or drag file here
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      Supports .pdf and .txt
                    </span>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-[10px] text-rose-400 font-mono">{fileError}</p>
              )}
            </div>
          </div>

          {/* Action Row: Glowing Generate Questions Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-surface-border/60">
            {inferredRole ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">
                  ROLE INFERRED:
                </span>
                <span className="text-white font-bold">{inferredRole}</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-gray-400">
                Minimum 40 characters required for Gemini question generation
              </span>
            )}

            <button
              onClick={onGenerateQuestions}
              disabled={
                isPracticing ||
                isGeneratingQuestions ||
                ingestionText.trim().length < 40
              }
              className="flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30 font-mono tracking-wide"
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing Progressive Rubric...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-purple-200 fill-current" />
                  <span>Generate 3 Tailored Simulation Questions</span>
                </>
              )}
            </button>
          </div>

          {/* Display Generated Questions Preview */}
          {generatedSummary && (
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  CUSTOM 3-STAGE GAUNTLET READY
                </span>
                <span className="text-[10px] text-gray-400 italic">
                  &ldquo;{generatedSummary}&rdquo;
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                {gauntletQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 rounded-xl bg-surface/80 border border-purple-500/20 text-left flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold block w-fit mb-1.5">
                        Stage {idx + 1}: {q.targetRubric.split("|")[0].replace("TARGET:", "").trim() || "Simulation"}
                      </span>
                      <p className="text-xs text-white leading-relaxed line-clamp-3">
                        &ldquo;{q.text}&rdquo;
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-purple-300/80 truncate mt-2">
                      {q.targetRubric}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
