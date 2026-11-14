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
  FileCheck,
  Zap,
  Plus,
  Trash2,
  Edit3,
  SlidersHorizontal,
} from "lucide-react";

import { MissionTrack, MissionQuestion, MISSION_TRACKS } from "@/types/mission";
import { extractTextFromFile } from "@/utils/extractDocumentText";

export interface CustomManualQuestion {
  id: string;
  text: string;
  targetRubric: string;
}

interface SimulationBuilderPanelProps {
  // Preset track selection
  selectedTrack: MissionTrack;
  onSelectTrack: (track: MissionTrack) => void;
  selectedQuestion: MissionQuestion;
  onSelectQuestion: (question: MissionQuestion) => void;
  // Gauntlet questions sequence
  gauntletQuestions: MissionQuestion[];
  onSetGauntletQuestions: (questions: MissionQuestion[]) => void;
  // Custom ingestion state
  customTitle: string;
  onChangeCustomTitle: (val: string) => void;
  ingestionText: string;
  onChangeIngestionText: (val: string) => void;
  onGenerateQuestions: (title: string, contextText: string) => Promise<void>;
  isGeneratingQuestions: boolean;
  generatedSummary: string | null;
  inferredRole: string | null;
  // Tab control: "presets" | "custom"
  activeTab: "presets" | "custom";
  onTabChange: (tab: "presets" | "custom") => void;
  isPracticing: boolean;
}

const TRACK_ICONS = {
  Cpu: Cpu,
  Briefcase: Briefcase,
  ShieldAlert: ShieldAlert,
  Rocket: Rocket,
  Sparkles: Sparkles,
};

export function SimulationBuilderPanel({
  selectedTrack,
  onSelectTrack,
  selectedQuestion,
  onSelectQuestion,
  gauntletQuestions,
  onSetGauntletQuestions,
  customTitle,
  onChangeCustomTitle,
  ingestionText,
  onChangeIngestionText,
  onGenerateQuestions,
  isGeneratingQuestions,
  generatedSummary,
  inferredRole,
  activeTab,
  onTabChange,
  isPracticing,
}: SimulationBuilderPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Question mode in Universal Custom tab: "ai" (Option A) vs "manual" (Option B)
  const [customQuestionMode, setCustomQuestionMode] = useState<"ai" | "manual">("ai");

  // Manual questions list
  const [manualQuestions, setManualQuestions] = useState<CustomManualQuestion[]>([
    {
      id: "manual-1",
      text: "Deliver the core thesis or key message of your presentation or position.",
      targetRubric: "TARGET: CLARITY OF THESIS | VALUE PROPOSITION",
    },
    {
      id: "manual-2",
      text: "How do you handle critical execution trade-offs and domain complexities?",
      targetRubric: "TARGET: METHODOLOGY & PROBLEM-SOLVING | RESILIENCE",
    },
    {
      id: "manual-3",
      text: "Describe how you resolve unexpected risk, conflict, or stakeholder pushback.",
      targetRubric: "TARGET: CONFLICT RESOLUTION | MEASURABLE IMPACT",
    },
  ]);

  // Handle file drop / upload
  const handleFileChange = async (file: File) => {
    setFileError(null);
    setIsReadingFile(true);
    try {
      const extracted = await extractTextFromFile(file);
      onChangeIngestionText(extracted.slice(0, 5000));
      setUploadedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    } catch (err: any) {
      console.error("[SimulationBuilder] File read error:", err);
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

  // Add a manual question (up to 3)
  const handleAddManualQuestion = () => {
    if (manualQuestions.length >= 3) return;
    const newIdx = manualQuestions.length + 1;
    const newQ: CustomManualQuestion = {
      id: `manual-${Date.now()}`,
      text: `Question ${newIdx}: What was your biggest accomplishment or challenge?`,
      targetRubric: `TARGET: STAGE ${newIdx} RUBRIC | IMPACT & RELEVANCE`,
    };
    const updated = [...manualQuestions, newQ];
    setManualQuestions(updated);
    onSetGauntletQuestions(updated);
  };

  // Remove a manual question (min 1)
  const handleRemoveManualQuestion = (idx: number) => {
    if (manualQuestions.length <= 1) return;
    const updated = manualQuestions.filter((_, i) => i !== idx);
    setManualQuestions(updated);
    onSetGauntletQuestions(updated);
    if (selectedQuestion.id === manualQuestions[idx].id) {
      onSelectQuestion(updated[0]);
    }
  };

  // Update a manual question
  const handleUpdateManualQuestion = (idx: number, field: "text" | "targetRubric", val: string) => {
    const updated = [...manualQuestions];
    updated[idx] = { ...updated[idx], [field]: val };
    setManualQuestions(updated);
    onSetGauntletQuestions(updated);
    if (selectedQuestion.id === updated[idx].id) {
      onSelectQuestion(updated[idx]);
    }
  };

  // Apply manual questions
  const handleApplyManualQuestions = () => {
    onSetGauntletQuestions(manualQuestions);
    if (manualQuestions.length > 0) {
      onSelectQuestion(manualQuestions[0]);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4 relative overflow-hidden">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Simulation Builder Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
            Simulation Builder <span className="text-cyan-400">// Mission Setup</span>
          </h3>
        </div>

        {/* Tab 1 vs Tab 2 Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-card border border-surface-border self-start sm:self-auto font-mono text-[11px]">
          <button
            onClick={() => {
              if (isPracticing) return;
              onTabChange("presets");
            }}
            disabled={isPracticing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "presets"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tab 1: Quick Presets</span>
          </button>

          <button
            onClick={() => {
              if (isPracticing) return;
              onTabChange("custom");
            }}
            disabled={isPracticing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "custom"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
            <span>Tab 2: Universal Custom Simulation</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUICK PRESETS (Engineering, Product, Insurance/Risk, Executive)    */}
      {/* ========================================================================= */}
      {activeTab === "presets" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Preset Track Cards Deck */}
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
                    key={q.id || idx}
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

      {/* ========================================================================= */}
      {/* TAB 2: UNIVERSAL CUSTOM SIMULATION (Any Role, Presentation, or Speech)     */}
      {/* ========================================================================= */}
      {activeTab === "custom" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 1. Target Title / Role Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-purple-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              TARGET TITLE / ROLE / PRESENTATION TOPIC
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => onChangeCustomTitle(e.target.value)}
              disabled={isPracticing || isGeneratingQuestions}
              placeholder="e.g., MBA Capstone Pitch, Healthcare Claims Specialist, Product Marketing Lead, TEDx Speaker"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-card border border-surface-border text-white text-xs font-mono focus:outline-none focus:border-purple-400 disabled:opacity-60 transition-colors"
            />
          </div>

          {/* 2. Context / Job Description Textarea + File Dropzone */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left 2 Cols: Textarea with 5,000 char counter */}
            <div className="lg:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
                <span className="flex items-center gap-1.5 font-bold text-purple-300">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  CONTEXT, JOB DESCRIPTION, OR PRESENTATION OUTLINE
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    ingestionText.length > 4500 ? "text-amber-400" : "text-gray-400"
                  }`}
                >
                  {ingestionText.length} / 5,000 characters
                </span>
              </div>

              <textarea
                value={ingestionText}
                onChange={(e) => onChangeIngestionText(e.target.value.slice(0, 5000))}
                disabled={isPracticing || isGeneratingQuestions}
                rows={5}
                placeholder="Paste the job description, presentation outline, slide deck transcript, or grading rubric here... Gemini will extract domain-specific terminology, key arguments, and evaluation criteria."
                className="w-full p-3 rounded-xl bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-purple-400 disabled:opacity-60 transition-colors leading-relaxed font-sans resize-none"
              />
            </div>

            {/* Right 1 Col: File Dropzone (.txt, .pdf) */}
            <div className="space-y-1.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-gray-300 font-bold flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                OR UPLOAD RESUME / SLIDES (.TXT, .PDF)
              </span>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isPracticing && !isGeneratingQuestions) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex-1 border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
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
                  <div className="flex flex-col items-center gap-1.5 text-purple-300">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-xs font-mono">Parsing document...</span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex flex-col items-center gap-1 text-emerald-300">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold font-mono truncate max-w-[160px]">
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
                    <UploadCloud className="w-5 h-5 text-purple-400/80 mb-0.5" />
                    <span className="text-xs font-bold text-gray-200">Click or drop file</span>
                    <span className="text-[10px] font-mono text-gray-500">.pdf or .txt</span>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-[10px] text-rose-400 font-mono">{fileError}</p>
              )}
            </div>
          </div>

          {/* 3. Question Generation Mode: Option A (AI) vs Option B (Manual) */}
          <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-2.5">
              <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                QUESTION GENERATION MODE
              </span>

              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setCustomQuestionMode("ai")}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    customQuestionMode === "ai"
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
                      : "bg-surface border-surface-border text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Option A: Auto-Generate 3 with AI
                </button>
                <button
                  onClick={() => {
                    setCustomQuestionMode("manual");
                    handleApplyManualQuestions();
                  }}
                  className={`px-3 py-1 rounded-lg border transition-all ${
                    customQuestionMode === "manual"
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold"
                      : "bg-surface border-surface-border text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Option B: Enter Questions Manually
                </button>
              </div>
            </div>

            {/* OPTION A: Auto-Generate 3 with AI */}
            {customQuestionMode === "ai" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="text-[11px] font-mono text-gray-400">
                    {inferredRole ? (
                      <span className="flex items-center gap-1.5 text-purple-300">
                        <strong>Role Inferred:</strong> {inferredRole}
                      </span>
                    ) : (
                      <span>Provide at least 30 characters of context or title for Gemini generation.</span>
                    )}
                  </div>

                  <button
                    onClick={() => onGenerateQuestions(customTitle, ingestionText)}
                    disabled={
                      isPracticing ||
                      isGeneratingQuestions ||
                      (ingestionText.trim().length < 30 && customTitle.trim().length < 5)
                    }
                    className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 font-mono tracking-wide"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Synthesizing Progressive Rubric...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-purple-200 fill-current" />
                        <span>Auto-Generate 3 Targeted Questions</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Generated Questions Display */}
                {generatedSummary && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
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
                              Stage {idx + 1}: {q.targetRubric?.split("|")[0]?.replace("TARGET:", "")?.trim() || "Simulation"}
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

            {/* OPTION B: Enter Questions Manually */}
            {customQuestionMode === "manual" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-300 font-bold">
                    Provide 1 to 3 Custom Interview or Presentation Questions:
                  </span>
                  {manualQuestions.length < 3 && (
                    <button
                      onClick={handleAddManualQuestion}
                      className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Question ({manualQuestions.length}/3)
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {manualQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-surface/90 border border-cyan-500/20 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-cyan-400 font-bold">
                          Stage {idx + 1} Prompt
                        </span>
                        {manualQuestions.length > 1 && (
                          <button
                            onClick={() => handleRemoveManualQuestion(idx)}
                            className="text-gray-400 hover:text-rose-400 transition-colors"
                            title="Remove question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => handleUpdateManualQuestion(idx, "text", e.target.value)}
                          placeholder={`Enter Question ${idx + 1}...`}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-white text-xs focus:outline-none focus:border-cyan-400"
                        />
                        <input
                          type="text"
                          value={q.targetRubric}
                          onChange={(e) => handleUpdateManualQuestion(idx, "targetRubric", e.target.value)}
                          placeholder="Target focus / rubric tags (e.g., TARGET: CORE VALUE | METRICS)"
                          className="w-full px-3 py-1 rounded-lg bg-surface-card/60 border border-surface-border text-gray-300 text-[10px] font-mono focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleApplyManualQuestions}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs font-mono transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Lock In Manual Simulation Rubric
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
