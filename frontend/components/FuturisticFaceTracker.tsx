"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Cpu, ShieldCheck, VideoOff, Crosshair, Sparkles } from "lucide-react";

export interface FaceTrackerMetrics {
  mouthAperture: number;
  gazeAligned: boolean;
  gazeVector: { dx: number; dy: number };
  isHeadStable: boolean;
  headStabilityPct: number;
  head: {
    pitch: number;
    yaw: number;
    roll: number;
    stabilized: {
      pitch: number;
      yaw: number;
      roll: number;
    };
  };
}

interface FuturisticFaceTrackerProps {
  onMetricsUpdate?: (metrics: FaceTrackerMetrics) => void;
  className?: string;
  showTelemetryOverlay?: boolean;
}

// MediaPipe landmark indices
const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61];
const LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78];
const LIP_ANCHORS = [61, 291, 0, 17];

const LEFT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7, 33];
const RIGHT_EYE_CONTOUR = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249, 263];

const LEFT_IRIS = 468;
const RIGHT_IRIS = 473;

const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 10,
];

const NOSE_RIDGE = [168, 6, 197, 195, 5, 4, 1, 19, 94];
const LEFT_EYEBROW = [70, 63, 105, 66, 107];
const RIGHT_EYEBROW = [336, 296, 334, 293, 300];

/**
 * Decomposes a 4x4 column-major transformation matrix into Euler angles (pitch, yaw, roll).
 * @param m - The 16-element Float32Array representing the matrix.
 * @returns An object with pitch, yaw, and roll in degrees.
 */
function decomposeMatrix(m: Float32Array) {
  const pitch = Math.atan2(m[6], m[10]); // Rotation around X-axis
  const yaw = Math.atan2(-m[2], Math.sqrt(m[6] * m[6] + m[10] * m[10])); // Rotation around Y-axis
  const roll = Math.atan2(m[1], m[0]); // Rotation around Z-axis

  // Convert radians to degrees
  return {
    pitch: pitch * (180 / Math.PI),
    yaw: yaw * (180 / Math.PI),
    roll: roll * (180 / Math.PI),
  };
}


export default function FuturisticFaceTracker({
  onMetricsUpdate,
  className = "",
  showTelemetryOverlay = true,
}: FuturisticFaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Real-time telemetry state
  const [fps, setFps] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [gazeVector, setGazeVector] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [mouthAperture, setMouthAperture] = useState<number>(0);
  const [isHeadStable, setIsHeadStable] = useState<boolean>(true);
  const [headStabilityPct, setHeadStabilityPct] = useState<number>(0.95);
  const [head, setHead] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Performance & stability tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdateTimeRef = useRef(performance.now());
  const lastVideoTimeRef = useRef(-1);
  const prevNoseTipRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const stabilityHistoryRef = useRef<boolean[]>([]);
  const smoothedHeadPoseRef = useRef({ pitch: 0, yaw: 0, roll: 0 });
  const lastHeadPoseRef = useRef({ pitch: 0, yaw: 0, roll: 0 });

  // Pulsing animation phase
  const pulsePhaseRef = useRef(0);

  // 1. Initialize MediaPipe FaceLandmarker via WebAssembly
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        console.log("[FuturisticHUD] Loading MediaPipe Vision WASM...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (isCancelled) return;

        console.log("[FuturisticHUD] Instantiating FaceLandmarker neural model...");
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });

        if (isCancelled) return;
        landmarkerRef.current = faceLandmarker;
        setModelReady(true);
        console.log("[FuturisticHUD] MediaPipe FaceLandmarker online.");
      } catch (err: any) {
        console.error("[FuturisticHUD] Model initialization failed:", err);
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // 2. Initialize Camera Feed
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!videoRef.current) return;
            videoRef.current.play();
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
            setCameraReady(true);
          };
        }
      } catch (err: any) {
        console.error("[FuturisticHUD] Camera access error:", err);
        if (isMounted) {
          setCameraError("Camera access required for facial telemetry.");
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // 3. Cyberpunk Render Loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (video && canvas && landmarker && video.readyState >= 2) {
      // Calculate live FPS
      frameCountRef.current += 1;
      const now = performance.now();
      if (now - lastFpsUpdateTimeRef.current >= 500) {
        const deltaSec = (now - lastFpsUpdateTimeRef.current) / 1000;
        setFps(Math.round(frameCountRef.current / deltaSec));
        frameCountRef.current = 0;
        lastFpsUpdateTimeRef.current = now;
      }

      pulsePhaseRef.current += 0.08;

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        // Perform face landmark detection
        const results = landmarker.detectForVideo(video, now);
        const ctx = canvas.getContext("2d");

        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear previous frame
          ctx.clearRect(0, 0, width, height);

          if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
            setIsLocked(true);
            const lm = results.faceLandmarks[0];

            // Helper to get canvas pixel point
            const pt = (idx: number) => ({
              x: lm[idx].x * width,
              y: lm[idx].y * height,
            });

            // -----------------------------------------------------------
            // A. Faint Holographic Tessellation (Face Oval, Nose, Brows)
            // -----------------------------------------------------------
            ctx.save();
            ctx.strokeStyle = "rgba(0, 240, 255, 0.16)";
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;

            // Face Oval Contour
            ctx.beginPath();
            FACE_OVAL.forEach((idx, i) => {
              const p = pt(idx);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Nose Ridge
            ctx.beginPath();
            NOSE_RIDGE.forEach((idx, i) => {
              const p = pt(idx);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();

            // Eyebrows
            const drawPath = (indices: number[]) => {
              ctx.beginPath();
              indices.forEach((idx, i) => {
                const p = pt(idx);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              });
              ctx.stroke();
            };
            drawPath(LEFT_EYEBROW);
            drawPath(RIGHT_EYEBROW);

            // Subtle triangulated tech lines (Cheeks to nose tip)
            const noseTip = pt(1);
            const leftCheek = pt(234);
            const rightCheek = pt(454);
            const chin = pt(152);

            ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
            ctx.beginPath();
            ctx.moveTo(leftCheek.x, leftCheek.y);
            ctx.lineTo(noseTip.x, noseTip.y);
            ctx.lineTo(rightCheek.x, rightCheek.y);
            ctx.lineTo(chin.x, chin.y);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // -----------------------------------------------------------
            // B. Lips & Mouth Motion (Neon Cyan & Electric Magenta Glow)
            // -----------------------------------------------------------
            ctx.save();

            // Outer Lip Contour (Electric Neon Cyan)
            ctx.strokeStyle = "#00F0FF";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#00F0FF";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            LIPS_OUTER.forEach((idx, i) => {
              const p = pt(idx);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Inner Lip Contour (Electric Magenta Glow)
            ctx.strokeStyle = "#FF007F";
            ctx.lineWidth = 1.8;
            ctx.shadowColor = "#FF007F";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            LIPS_INNER.forEach((idx, i) => {
              const p = pt(idx);
              if (i === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.stroke();

            // Pulsating Anchor Nodes on Lip Corners & Centers (61, 291, 0, 17)
            const pulseRadius = 3.5 + Math.sin(pulsePhaseRef.current) * 1.5;
            LIP_ANCHORS.forEach((idx) => {
              const p = pt(idx);
              ctx.beginPath();
              ctx.arc(p.x, p.y, pulseRadius, 0, 2 * Math.PI);
              ctx.fillStyle = "#00F0FF";
              ctx.shadowColor = "#00F0FF";
              ctx.shadowBlur = 14;
              ctx.fill();

              // Outer faint ping ring
              ctx.beginPath();
              ctx.arc(p.x, p.y, pulseRadius + 3, 0, 2 * Math.PI);
              ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
              ctx.lineWidth = 1;
              ctx.stroke();
            });
            ctx.restore();

            // -----------------------------------------------------------
            // C. Eyes & Iris Gaze Vectors (from Blendshapes for stability)
            // -----------------------------------------------------------
            ctx.save();

            // Draw Eye Contours
            ctx.strokeStyle = "rgba(0, 255, 136, 0.45)";
            ctx.lineWidth = 1.2;
            ctx.shadowColor = "#00FF88";
            ctx.shadowBlur = 6;
            drawPath(LEFT_EYE_CONTOUR);
            drawPath(RIGHT_EYE_CONTOUR);

            const blendshapes = results.faceBlendshapes[0].categories;
            const eyeLookOutLeft = blendshapes.find((c) => c.categoryName === "eyeLookOutLeft")?.score || 0;
            const eyeLookInLeft = blendshapes.find((c) => c.categoryName === "eyeLookInLeft")?.score || 0;
            const eyeLookUpLeft = blendshapes.find((c) => c.categoryName === "eyeLookUpLeft")?.score || 0;
            const eyeLookDownLeft = blendshapes.find((c) => c.categoryName === "eyeLookDownLeft")?.score || 0;
            const eyeLookOutRight = blendshapes.find((c) => c.categoryName === "eyeLookOutRight")?.score || 0;
            const eyeLookInRight = blendshapes.find((c) => c.categoryName === "eyeLookInRight")?.score || 0;
            const eyeLookUpRight = blendshapes.find((c) => c.categoryName === "eyeLookUpRight")?.score || 0;
            const eyeLookDownRight = blendshapes.find((c) => c.categoryName === "eyeLookDownRight")?.score || 0;

            // Combine the scores for a normalized gaze vector
            const normDx = (eyeLookOutLeft - eyeLookInLeft + eyeLookInRight - eyeLookOutRight) / 2;
            const normDy = (eyeLookUpLeft - eyeLookDownLeft + eyeLookUpRight - eyeLookDownRight) / 2;

            setGazeVector({ dx: normDx, dy: normDy });

            // A simple threshold on the blendshape scores to determine if gaze is aligned
            const isGazeAligned = Math.abs(normDx) < 0.3 && Math.abs(normDy) < 0.3;

            // Draw Iris Reticles & Gaze Projection Vectors
            const leftIrisPt = pt(LEFT_IRIS);
            const rightIrisPt = pt(RIGHT_IRIS);

            const drawIrisReticle = (center: { x: number; y: number }, dx: number, dy: number) => {
              const reticleColor = isGazeAligned ? "#00FF88" : "#FFB800";

              // Circular Reticle
              ctx.beginPath();
              ctx.arc(center.x, center.y, 7, 0, 2 * Math.PI);
              ctx.strokeStyle = reticleColor;
              ctx.lineWidth = 1.5;
              ctx.shadowColor = reticleColor;
              ctx.shadowBlur = 10;
              ctx.stroke();

              // Crosshair ticks
              ctx.beginPath();
              ctx.moveTo(center.x - 10, center.y);
              ctx.lineTo(center.x - 5, center.y);
              ctx.moveTo(center.x + 5, center.y);
              ctx.lineTo(center.x + 10, center.y);
              ctx.moveTo(center.x, center.y - 10);
              ctx.lineTo(center.x, center.y - 5);
              ctx.moveTo(center.x, center.y + 5);
              ctx.lineTo(center.x, center.y + 10);
              ctx.strokeStyle = reticleColor;
              ctx.lineWidth = 1;
              ctx.stroke();

              // Projected Gaze Vector Line (use blendshape-derived dx/dy for direction)
              const vectorLength = 40;
              const angle = Math.atan2(dy, dx);
              const targetX = center.x + Math.cos(angle) * vectorLength;
              const targetY = center.y + Math.sin(angle) * vectorLength;

              ctx.beginPath();
              ctx.moveTo(center.x, center.y);
              ctx.lineTo(targetX, targetY);
              ctx.strokeStyle = reticleColor;
              ctx.lineWidth = 1.5;
              ctx.shadowBlur = 8;
              ctx.stroke();

              // Vector tip dot
              ctx.beginPath();
              ctx.arc(targetX, targetY, 2, 0, 2 * Math.PI);
              ctx.fillStyle = reticleColor;
              ctx.fill();
            };

            drawIrisReticle(leftIrisPt, normDx, normDy);
            drawIrisReticle(rightIrisPt, normDx, normDy);
            ctx.restore();

            // -----------------------------------------------------------
            // D. Real-Time Numerical Signals Calculation
            // -----------------------------------------------------------
            // Mouth aperture: vertical gap (13 & 14) relative to mouth corner width (61 & 291)
            const upperLipCenter = pt(13);
            const lowerLipCenter = pt(14);
            const mouthWidth = Math.hypot(pt(291).x - pt(61).x, pt(291).y - pt(61).y) || 50;
            const mouthHeight = Math.hypot(
              lowerLipCenter.x - upperLipCenter.x,
              lowerLipCenter.y - upperLipCenter.y
            );

            // Normalized aperture [0.00 - 1.00]
            const rawAperture = mouthHeight / (mouthWidth * 0.65);
            const normalizedAperture = Math.min(1.0, Math.max(0.0, Math.round(rawAperture * 100) / 100));
            setMouthAperture(normalizedAperture);

            // -----------------------------------------------------------
            // E. Head Posture & Stability Telemetry (3D Matrix)
            // -----------------------------------------------------------
            let rawHeadPose = { pitch: 0, yaw: 0, roll: 0 };
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              rawHeadPose = decomposeMatrix(matrix);

              // Apply exponential moving average for smoothing
              const smoothing = 0.1;
              const smoothed = {
                pitch: smoothedHeadPoseRef.current.pitch * (1 - smoothing) + rawHeadPose.pitch * smoothing,
                yaw: smoothedHeadPoseRef.current.yaw * (1 - smoothing) + rawHeadPose.yaw * smoothing,
                roll: smoothedHeadPoseRef.current.roll * (1 - smoothing) + rawHeadPose.roll * smoothing,
              };
              smoothedHeadPoseRef.current = smoothed;
              setHead(smoothed);

              // Calculate angular velocity for stability check
              const deltaPitch = Math.abs(smoothed.pitch - lastHeadPoseRef.current.pitch);
              const deltaYaw = Math.abs(smoothed.yaw - lastHeadPoseRef.current.yaw);
              const deltaRoll = Math.abs(smoothed.roll - lastHeadPoseRef.current.roll);
              lastHeadPoseRef.current = smoothed;

              // Threshold for movement; considered stable if change is minor
              const totalAngularChange = deltaPitch + deltaYaw + deltaRoll;
              const currentFrameStable = totalAngularChange < 1.2;

              // Rolling window over last 40 frames (~1.3s)
              stabilityHistoryRef.current.push(currentFrameStable);
              if (stabilityHistoryRef.current.length > 40) {
                stabilityHistoryRef.current.shift();
              }

              const stableCount = stabilityHistoryRef.current.filter(Boolean).length;
              const currentStabilityRatio = stableCount / Math.max(1, stabilityHistoryRef.current.length);
              const stableStatus = currentStabilityRatio >= 0.65;
              const computedStabilityPct = Math.round(currentStabilityRatio * 100) / 100;

              setIsHeadStable(stableStatus);
              setHeadStabilityPct(computedStabilityPct);
            }

            // Push metrics to parent component if callback provided
            if (onMetricsUpdate) {
              onMetricsUpdate({
                mouthAperture: normalizedAperture,
                gazeAligned: isGazeAligned,
                gazeVector: { dx: normDx, dy: normDy },
                isHeadStable: isHeadStable,
                headStabilityPct: headStabilityPct,
                head: {
                  pitch: rawHeadPose.pitch,
                  yaw: rawHeadPose.yaw,
                  roll: rawHeadPose.roll,
                  stabilized: smoothedHeadPoseRef.current,
                },
              });
            }
          } else {
            setIsLocked(false);
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(renderFrame);
  }, [onMetricsUpdate]);

  useEffect(() => {
    animFrameIdRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [renderFrame]);

  return (
    <div
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex items-center justify-center select-none ${className}`}
    >
      {/* 1. Underlying Webcam Feed (Mirrored) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />

      {/* 2. Seamless HUD Overlay Canvas (Mirrored with video) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 z-10"
      />

      {/* 3. Subtle Cyberpunk Scanline */}
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00F0FF] opacity-75 pointer-events-none z-20 animate-hud-scanline" />

      {/* 4. Tech Grid Background Overlay (Subtle) */}
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none z-15" />

      {/* 5. Sci-Fi Corner Brackets framing the viewport */}
      <div className="absolute inset-3 pointer-events-none z-25 flex flex-col justify-between">
        {/* Top Corners */}
        <div className="flex justify-between items-start">
          <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400/80 shadow-[0_0_8px_#00F0FF] relative">
            <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-cyan-400" />
          </div>
          <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400/80 shadow-[0_0_8px_#00F0FF] relative">
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-cyan-400" />
          </div>
        </div>

        {/* Bottom Corners */}
        <div className="flex justify-between items-end">
          <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400/80 shadow-[0_0_8px_#00F0FF] relative">
            <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-cyan-400" />
          </div>
          <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400/80 shadow-[0_0_8px_#00F0FF] relative">
            <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-cyan-400" />
          </div>
        </div>
      </div>

      {/* 6. Top-Left System Diagnostics */}
      <div className="absolute top-5 left-5 z-30 pointer-events-none flex flex-col gap-1 text-[11px] font-mono tracking-wider">
        <div className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_6px_rgba(0,240,255,0.7)] font-bold">
          <Crosshair className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
          <span>MIRROR // NEURAL_HUD_v2.4</span>
        </div>
        <div className="text-[10px] text-cyan-500/70 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>WASM TENSOR ENGINE: ACTIVE</span>
        </div>
      </div>

      {/* 7. Top-Right Live Telemetry Readout */}
      {showTelemetryOverlay && (
        <div className="absolute top-5 right-5 z-30 pointer-events-none flex flex-col items-end gap-1.5 text-[11px] font-mono">
          {/* Tracking Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wider backdrop-blur-md shadow-lg transition-all ${
              isLocked
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-amber-950/70 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLocked ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span>TRACKING: {isLocked ? "LOCKED" : "SEARCHING"}</span>
          </div>

          {/* Head Stability Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wider backdrop-blur-md shadow-lg transition-all ${
              isHeadStable
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-amber-950/70 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHeadStable ? "bg-emerald-400" : "bg-amber-400 animate-ping"
              }`}
            />
            <span>HEAD STABILITY: {isHeadStable ? "STABLE" : "EXCESSIVE MOTION"}</span>
          </div>

          {/* Telemetry Data Block */}
          <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/30 backdrop-blur-md text-cyan-300/90 flex flex-col gap-1 min-w-[150px] shadow-[0_0_15px_rgba(0,0,0,0.6)]">
            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">FRAME_RATE:</span>
              <span className="font-bold text-white font-mono">{fps} FPS</span>
            </div>

            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">GAZE_VECTOR:</span>
              <span className="font-bold font-mono text-emerald-300">
                [{gazeVector.dx >= 0 ? `+${gazeVector.dx}` : gazeVector.dx},{" "}
                {gazeVector.dy >= 0 ? `+${gazeVector.dy}` : gazeVector.dy}]
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">HEAD_STABILITY:</span>
              <span
                className={`font-bold font-mono ${
                  isHeadStable ? "text-emerald-300" : "text-amber-400"
                }`}
              >
                {Math.round(headStabilityPct * 100)}%
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">HEAD_PITCH:</span>
              <span className="font-bold font-mono text-emerald-300">
                {head.pitch.toFixed(1)}°
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">HEAD_YAW:</span>
              <span className="font-bold font-mono text-emerald-300">
                {head.yaw.toFixed(1)}°
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px] border-b border-cyan-500/20 pb-1">
              <span className="text-gray-400">HEAD_ROLL:</span>
              <span className="font-bold font-mono text-emerald-300">
                {head.roll.toFixed(1)}°
              </span>
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-400">MOUTH_APERTURE:</span>
              <span
                className={`font-bold font-mono ${
                  mouthAperture > 0.15 ? "text-pink-400" : "text-cyan-400"
                }`}
              >
                {mouthAperture.toFixed(2)}
              </span>
            </div>

            {/* Aperture mini-gauge */}
            <div className="w-full bg-gray-900 rounded-full h-1 overflow-hidden mt-0.5 border border-cyan-500/20">
              <div
                className="bg-gradient-to-r from-cyan-400 via-pink-500 to-rose-500 h-full transition-all duration-75"
                style={{ width: `${Math.round(mouthAperture * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. Bottom Center Privacy Status */}
      <div className="absolute bottom-5 inset-x-0 z-30 pointer-events-none flex justify-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-cyan-500/30 backdrop-blur-md text-[10px] font-mono text-cyan-300/80 shadow-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ZERO_CLOUD_FRAMES // ON-DEVICE LOCAL WASM INFERENCE</span>
        </div>
      </div>

      {/* 9. Loading / Error States */}
      {cameraError && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-400 gap-3">
          <VideoOff className="w-10 h-10 animate-bounce text-rose-500" />
          <p className="text-sm font-mono">{cameraError}</p>
        </div>
      )}

      {!cameraReady && !cameraError && (
        <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-3">
          <Cpu className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs font-mono tracking-wider animate-pulse">
            INITIALIZING OPTICAL NEURAL SENSOR...
          </p>
        </div>
      )}
    </div>
  );
}
