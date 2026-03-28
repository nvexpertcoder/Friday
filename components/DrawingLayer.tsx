import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingStroke } from '../types';

interface DrawingLayerProps {
  active: boolean;
  color: string;
  brushSize: number;
  handLandmarks?: any[];
  clearTrigger?: number;
  tool: 'brush' | 'eraser';
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({ active, color, brushSize, handLandmarks, clearTrigger, tool }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);

  // Effect to clear canvas when trigger changes
  useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      // Reset all drawing state
      setStrokes([]);
      setCurrentStroke(null);
      setIsDrawing(false);

      // And force-clear the canvas immediately for instant visual feedback,
      // preventing a race condition with the hand tracking.
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [clearTrigger]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    [...strokes, currentStroke].forEach(stroke => {
      if (!stroke || stroke.points.length < 2) return;
      
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }, [strokes, currentStroke]);
  
  // Resize canvas to match window
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        redraw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);
  
  const endDrawing = useCallback(() => {
    setIsDrawing(false);
    setCurrentStroke(stroke => {
      if (stroke && stroke.points.length > 1) {
        setStrokes(prev => [...prev, stroke]);
      }
      return null;
    });
  }, []);

  // GESTURE HANDLING
  const hasHand = handLandmarks && handLandmarks.length > 0;
  useEffect(() => {
    if (!active || !hasHand) {
      if (isDrawing) {
        endDrawing();
      }
      return;
    }

    const landmarks = handLandmarks[0];
    const wrist = landmarks[0];

    const distance = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    const isExtended = (tip: any, mcp: any) => distance(tip, wrist) > distance(mcp, wrist);

    const indexExtended = isExtended(landmarks[8], landmarks[5]);
    const middleExtended = isExtended(landmarks[12], landmarks[9]);
    const ringExtended = isExtended(landmarks[16], landmarks[13]);
    const pinkyExtended = isExtended(landmarks[20], landmarks[17]);

    const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const tipIndex = landmarks[8];
    const x = tipIndex.x * canvas.width;
    const y = tipIndex.y * canvas.height;

    if (isPointing) {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentStroke({ points: [{ x, y }], color: tool === 'eraser' ? '#000000' : color, width: brushSize, tool });
      } else {
        setCurrentStroke(stroke => stroke ? { ...stroke, points: [...stroke.points, { x, y }] } : null);
      }
    } else {
      if (isDrawing) {
        endDrawing();
      }
    }
  }, [handLandmarks, active, isDrawing, color, brushSize, endDrawing, hasHand, tool]);


  // MOUSE/TOUCH HANDLING
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active || hasHand) return;
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    
    setIsDrawing(true);
    setCurrentStroke({
      points: [{ x: clientX, y: clientY }],
      color: tool === 'eraser' ? '#000000' : color,
      width: brushSize,
      tool: tool
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!active || !isDrawing || !currentStroke || hasHand) return;
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, { x: clientX, y: clientY }]
    });
  };

  const mouseUp = () => {
    if(hasHand) return;
    endDrawing();
  }


  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 ${active ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={mouseUp}
      onMouseLeave={mouseUp}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={mouseUp}
    />
  );
};