"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface GazeMetrics {
  isModelLoaded: boolean;
  isFaceDetected: boolean;
  isLookingAtCamera: boolean;
  gazeOnCameraPct: number;
}

// MediaPipe Landmark Index Constants
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_UPPER = 159;
const LEFT_EYE_LOWER = 145;
const LEFT_IRIS_CENTER = 468;

const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_UPPER = 386;
const RIGHT_EYE_LOWER = 374;
const RIGHT_IRIS_CENTER = 473;

export function useFacialLandmarks(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>
) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isLookingAtCamera, setIsLookingAtCamera] = useState(true);
  const [gazeOnCameraPct, setGazeOnCameraPct] = useState(1.0);

  const landmarkerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);

  // Cumulative gaze tracking counters
  const totalFramesRef = useRef(0);
  const gazeCenteredFramesRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);

  // Initialize MediaPipe FaceLandmarker via browser WebAssembly
  useEffect(() => {
    let isCancelled = false;

    async function initFaceLandmarker() {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        console.log("[MediaPipe] Loading WASM binaries from CDN...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (isCancelled) return;

        console.log("[MediaPipe] Loading FaceLandmarker model task...");
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
        setIsModelLoaded(true);
        console.log("[MediaPipe] FaceLandmarker successfully initialized!");
      } catch (err) {
        console.error("[MediaPipe] Initialization error:", err);
      }
    }

    initFaceLandmarker();

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Frame processing loop
  const processFrame = useCallback(() => {
    if (!isTrackingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (video && canvas && landmarker && video.readyState >= 2) {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const results = landmarker.detectForVideo(video, performance.now());
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          setIsFaceDetected(true);
          const landmarks = results.faceLandmarks[0];

          // Compute horizontal & vertical iris ratios
          const leftOuter = landmarks[LEFT_EYE_OUTER];
          const leftInner = landmarks[LEFT_EYE_INNER];
          const leftUpper = landmarks[LEFT_EYE_UPPER];
          const leftLower = landmarks[LEFT_EYE_LOWER];
          const leftIris = landmarks[LEFT_IRIS_CENTER] || landmarks[468];

          const rightInner = landmarks[RIGHT_EYE_INNER];
          const rightOuter = landmarks[RIGHT_EYE_OUTER];
          const rightUpper = landmarks[RIGHT_EYE_UPPER];
          const rightLower = landmarks[RIGHT_EYE_LOWER];
          const rightIris = landmarks[RIGHT_IRIS_CENTER] || landmarks[473];

          let lookingCentered = true;

          if (leftIris && rightIris && leftOuter && leftInner && rightInner && rightOuter) {
            // Horizontal iris ratios (normalized position between corners)
            const leftEyeWidth = Math.abs(leftInner.x - leftOuter.x);
            const leftIrisOffset = Math.abs(leftIris.x - leftOuter.x);
            const leftH = leftEyeWidth > 0 ? leftIrisOffset / leftEyeWidth : 0.5;

            const rightEyeWidth = Math.abs(rightOuter.x - rightInner.x);
            const rightIrisOffset = Math.abs(rightIris.x - rightInner.x);
            const rightH = rightEyeWidth > 0 ? rightIrisOffset / rightEyeWidth : 0.5;

            // Vertical iris ratios (checks if looking down at monitor vs up at camera)
            const leftEyeHeight = Math.abs(leftLower.y - leftUpper.y);
            const leftVOffset = Math.abs(leftIris.y - leftUpper.y);
            const leftV = leftEyeHeight > 0 ? leftVOffset / leftEyeHeight : 0.5;

            // Centered thresholds for camera gaze proxy
            const isLeftCentered = leftH >= 0.38 && leftH <= 0.62 && leftV >= 0.25 && leftV <= 0.75;
            const isRightCentered = rightH >= 0.38 && rightH <= 0.62;

            lookingCentered = isLeftCentered && isRightCentered;

            // Draw subtle, non-intrusive tracking reticle on overlay canvas
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              const drawIrisDot = (iris: any, centered: boolean) => {
                ctx.beginPath();
                ctx.arc(iris.x * canvas.width, iris.y * canvas.height, 3, 0, 2 * Math.PI);
                ctx.fillStyle = centered ? "#10b981" : "#f59e0b"; // emerald if centered, amber if shifted
                ctx.fill();
              };

              drawIrisDot(leftIris, lookingCentered);
              drawIrisDot(rightIris, lookingCentered);
            }
          }

          setIsLookingAtCamera(lookingCentered);

          // Update cumulative counters
          totalFramesRef.current += 1;
          if (lookingCentered) {
            gazeCenteredFramesRef.current += 1;
          }

          const currentPct =
            totalFramesRef.current > 0
              ? gazeCenteredFramesRef.current / totalFramesRef.current
              : 1.0;

          setGazeOnCameraPct(Math.round(currentPct * 1000) / 1000);
        } else {
          setIsFaceDetected(false);
        }
      }
    }

    if (isTrackingRef.current) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [videoRef, canvasRef]);

  const startTracking = useCallback(() => {
    totalFramesRef.current = 0;
    gazeCenteredFramesRef.current = 0;
    lastVideoTimeRef.current = -1;
    isTrackingRef.current = true;
    setGazeOnCameraPct(1.0);
    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    const finalPct =
      totalFramesRef.current > 0
        ? gazeCenteredFramesRef.current / totalFramesRef.current
        : 1.0;
    const rounded = Math.round(finalPct * 1000) / 1000;
    setGazeOnCameraPct(rounded);
    return rounded;
  }, []);

  const resetMetrics = useCallback(() => {
    totalFramesRef.current = 0;
    gazeCenteredFramesRef.current = 0;
    setGazeOnCameraPct(1.0);
    setIsLookingAtCamera(true);
  }, []);

  return {
    isModelLoaded,
    isFaceDetected,
    isLookingAtCamera,
    gazeOnCameraPct,
    startTracking,
    stopTracking,
    resetMetrics,
  };
}
