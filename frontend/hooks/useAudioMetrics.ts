"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface AudioMetricsState {
  transcript: string;
  volumeLevel: number; // 0.0 to 1.0 for visualizer
  pauseCount: number;
  speakingRateWpm: number;
  fillerWords: Record<string, number>;
  isListening: boolean;
}

const COMMON_FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "actually",
  "basically",
  "so",
  "right",
  "i mean",
];

export function useAudioMetrics() {
  const [transcript, setTranscript] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [speakingRateWpm, setSpeakingRateWpm] = useState(0);
  const [fillerWords, setFillerWords] = useState<Record<string, number>>({});
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const pauseCountRef = useRef(0);
  const fullTranscriptRef = useRef("");
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to tally filler words from transcript
  const analyzeFillerWords = (text: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    const lower = text.toLowerCase();

    for (const phrase of COMMON_FILLER_WORDS) {
      // Use boundary matching for words/phrases
      const regex = new RegExp(`\\b${phrase}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches && matches.length > 0) {
        counts[phrase] = matches.length;
      }
    }
    return counts;
  };

  // Helper to compute speaking rate
  const calculateWpm = (text: string, elapsedSec: number): number => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = elapsedSec / 60;
    if (minutes <= 0.05) return 0;
    return Math.round((words / minutes) * 10) / 10;
  };

  // Start microphone stream analysis and Web Speech recognition
  const startAudio = useCallback(async (mediaStream: MediaStream) => {
    // Reset state
    setTranscript("");
    fullTranscriptRef.current = "";
    pauseCountRef.current = 0;
    setPauseCount(0);
    setFillerWords({});
    setSpeakingRateWpm(0);
    startTimeRef.current = Date.now();
    lastSpeechTimeRef.current = Date.now();

    // 1. Web Audio API for real-time visualizer
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1.0, avg / 80); // Scale up for visual impact
        setVolumeLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      animFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (e) {
      console.warn("[AudioMetrics] Web Audio Analyser error:", e);
    }

    // 2. Web Speech API for Transcription & Pause Detection
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const now = Date.now();

          // Pause interval detection (> 1.5 seconds between speech bursts)
          if (lastSpeechTimeRef.current !== null) {
            const gapMs = now - lastSpeechTimeRef.current;
            if (gapMs > 1500) {
              pauseCountRef.current += 1;
              setPauseCount(pauseCountRef.current);
            }
          }
          lastSpeechTimeRef.current = now;

          // Assemble transcript
          let currentSessionText = "";
          for (let i = 0; i < event.results.length; i++) {
            currentSessionText += event.results[i][0].transcript + " ";
          }

          const trimmed = currentSessionText.trim();
          fullTranscriptRef.current = trimmed;
          setTranscript(trimmed);

          // Update fillers & WPM
          const fillers = analyzeFillerWords(trimmed);
          setFillerWords(fillers);

          if (startTimeRef.current) {
            const elapsedSec = (now - startTimeRef.current) / 1000;
            const wpm = calculateWpm(trimmed, elapsedSec);
            setSpeakingRateWpm(wpm);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("[AudioMetrics] Speech Recognition error:", err);
        };

        recognition.onend = () => {
          // Auto restart if still supposed to be listening
          if (isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
      } catch (err) {
        console.warn("[AudioMetrics] SpeechRecognition failed to start:", err);
      }
    } else {
      console.warn("[AudioMetrics] SpeechRecognition API is not supported in this browser.");
    }
  }, [isListening]);

  // Stop recording and return compiled metrics
  const stopAudio = useCallback(() => {
    setIsListening(false);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        // ignore
      }
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
    }

    setVolumeLevel(0);

    const now = Date.now();
    const elapsedSec = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 60;
    const finalTranscript = fullTranscriptRef.current;
    const finalWpm = calculateWpm(finalTranscript, elapsedSec);
    const finalFillers = analyzeFillerWords(finalTranscript);

    return {
      transcript: finalTranscript,
      speaking_rate_wpm: finalWpm,
      pause_count: pauseCountRef.current,
      filler_words: finalFillers,
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  return {
    transcript,
    volumeLevel,
    pauseCount,
    speakingRateWpm,
    fillerWords,
    isListening,
    startAudio,
    stopAudio,
  };
}
