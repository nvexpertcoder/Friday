import React, { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface HandTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onLandmarks: (landmarks: any) => void;
  enabled: boolean;
}

let handLandmarker: HandLandmarker | undefined = undefined;
let lastVideoTime = -1;
let animationFrameId: number | null = null;

export const HandTracking: React.FC<HandTrackingProps> = ({ videoRef, onLandmarks, enabled }) => {

  useEffect(() => {
    const createHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1, // Track one hand for simplicity
        });
        console.log("Hand Landmarker created successfully.");
      } catch (e) {
        console.error("Failed to create Hand Landmarker", e);
      }
    };

    if (!handLandmarker) {
      createHandLandmarker();
    }
  }, []);

  useEffect(() => {
    const predictWebcam = () => {
        if (!videoRef.current || !handLandmarker || !enabled) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            onLandmarks([]); // Clear landmarks when disabled
            return;
        }

        const video = videoRef.current;
        // Check if the video is ready and has data to prevent errors
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const results = handLandmarker.detectForVideo(video, performance.now());
            if (results.landmarks) {
                onLandmarks(results.landmarks);
            } else {
                 onLandmarks([]); // Ensure landmarks are cleared if no hand is detected
            }
        } else if (video.readyState < 2) {
            onLandmarks([]); // Clear landmarks if video is not ready
        }
        animationFrameId = requestAnimationFrame(predictWebcam);
    };

    if (enabled) {
        predictWebcam();
    } else {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        onLandmarks([]); // Clear landmarks when disabled
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

  }, [enabled, videoRef, onLandmarks]);

  return null; // This component does not render any UI
};
