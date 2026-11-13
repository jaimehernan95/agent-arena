"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Terminal } from "lucide-react";
import FuturisticFaceTracker, { FaceTrackerMetrics } from "@/components/FuturisticFaceTracker";

export default function HudDemoPage() {
  const [latestMetrics, setLatestMetrics] = useState<FaceTrackerMetrics | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 sm:p-8 text-white">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO PRACTICE STUDIO
        </Link>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CYBERPUNK NEURAL HUD SHOWCASE</span>
        </div>
      </div>

      {/* Main Futuristic HUD Component */}
      <div className="w-full max-w-4xl">
        <FuturisticFaceTracker
          onMetricsUpdate={(metrics) => setLatestMetrics(metrics)}
          className="h-[520px]"
        />
      </div>

      {/* Real-time Parent Console Telemetry Stream */}
      {latestMetrics && (
        <div className="w-full max-w-4xl mt-4 p-4 rounded-xl bg-black/80 border border-cyan-500/30 text-xs font-mono flex items-center justify-between text-cyan-300/80 shadow-lg">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">PARENT_EVENT_STREAM:</span>
            <span>
              Mouth Aperture: <strong className="text-pink-400">{latestMetrics.mouthAperture.toFixed(2)}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Gaze Alignment:{" "}
              <strong className={latestMetrics.gazeAligned ? "text-emerald-400" : "text-amber-400"}>
                {latestMetrics.gazeAligned ? "CENTERED" : "OFF_AXIS"}
              </strong>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              Vector: [{latestMetrics.gazeVector.dx}, {latestMetrics.gazeVector.dy}]
            </span>
          </div>

          <span className="text-[10px] text-gray-500">100% LOCAL ON-DEVICE TELEMETRY</span>
        </div>
      )}
    </main>
  );
}
