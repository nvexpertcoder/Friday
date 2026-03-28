import React from 'react';

interface HandCursorProps {
  handLandmarks?: any[];
  enabled: boolean;
}

export const HandCursor: React.FC<HandCursorProps> = ({ handLandmarks, enabled }) => {
  if (!enabled || !handLandmarks || handLandmarks.length === 0) {
    return null;
  }

  const landmarks = handLandmarks[0];
  const indexTip = landmarks[8]; // Index finger tip

  if (!indexTip) {
    return null;
  }

  const cursorX = indexTip.x * window.innerWidth;
  const cursorY = indexTip.y * window.innerHeight;

  return (
    <div
      className="absolute w-6 h-6 rounded-full bg-cyan-400/50 border-2 border-cyan-300 pointer-events-none transition-transform duration-100 ease-out"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${cursorX - 12}px, ${cursorY - 12}px)`,
        zIndex: 100,
      }}
    />
  );
};