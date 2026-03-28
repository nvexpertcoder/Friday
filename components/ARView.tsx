import React, { useEffect, useRef } from 'react';

interface ARViewProps {
  onFrameCapture: (dataUrl: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const ARView: React.FC<ARViewProps> = ({ onFrameCapture, videoRef }) => {
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
      {/* Grid Overlay for "Tech" feel */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
};
