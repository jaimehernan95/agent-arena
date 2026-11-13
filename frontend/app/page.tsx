import Link from "next/link";
import { Video, ShieldCheck, Sparkles, ArrowRight, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-medium tracking-wide mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        MongoDB Hackathon &bull; Mirror AI Coach
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
        Master Your Presentations with <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-emerald">On-Device AI</span>
      </h1>

      <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
        Real-time computer vision gaze tracking via MediaPipe WebAssembly, episodic memory comparison, and tailored 30-second speaking drills.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent-blue hover:bg-sky-400 text-gray-950 font-semibold transition-all shadow-lg shadow-accent-blue/20"
        >
          <Video className="w-5 h-5" />
          Enter Practice Studio
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
        <div className="p-5 rounded-2xl bg-surface border border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-white font-medium mb-1">100% Private Vision</h3>
          <p className="text-gray-400 text-sm">
            MediaPipe FaceLandmarker runs in your browser via WASM. No video frames are ever recorded or streamed to a server.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-white font-medium mb-1">Atlas Episodic Memory</h3>
          <p className="text-gray-400 text-sm">
            Compares today&apos;s pacing, fillers, and gaze stability against your past practice sessions stored in MongoDB Atlas.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-white font-medium mb-1">30s Micro-Drills</h3>
          <p className="text-gray-400 text-sm">
            Receive 2 custom exercises targeting your specific weak spots for rapid reinforcement.
          </p>
        </div>
      </div>
    </main>
  );
}
