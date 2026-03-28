import React, { useState, useRef, useEffect } from 'react';
import { GeneratedObject } from '../types';
import { Move, Trash2, Maximize2 } from 'lucide-react';

interface BuildingLayerProps {
  active: boolean;
  objects: GeneratedObject[];
  onUpdateObject: (obj: GeneratedObject) => void;
  onRemoveObject: (id: string) => void;
  handLandmarks?: any[];
}

export const BuildingLayer: React.FC<BuildingLayerProps> = ({ active, objects, onUpdateObject, onRemoveObject, handLandmarks }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; initX: number; initY: number } | null>(null);
  const [pinchingState, setPinchingState] = useState<{
    initialDistance: number;
    initialScale: number;
    initialAngle: number;
    initialRotation: number;
    initialObjectX: number;
    initialObjectY: number;
    initialHandX: number;
    initialHandY: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, obj: GeneratedObject) => {
    if (!active) return;
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setSelectedId(obj.id);
    dragRef.current = {
      id: obj.id,
      startX: clientX,
      startY: clientY,
      initX: obj.x,
      initY: obj.y
    };
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current || !active) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    
    const obj = objects.find(o => o.id === dragRef.current?.id);
    if (obj) {
      onUpdateObject({
        ...obj,
        x: dragRef.current.initX + deltaX,
        y: dragRef.current.initY + deltaY
      });
    }
  };

  const handleUp = () => {
    dragRef.current = null;
  };
  
  // Effect for Pinch-to-Scale & Rotate Gesture
  useEffect(() => {
    if (!active || !selectedId || !handLandmarks || handLandmarks.length === 0) {
      if (pinchingState) setPinchingState(null);
      return;
    }

    const landmarks = handLandmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const dx = indexTip.x - thumbTip.x;
    const dy = indexTip.y - thumbTip.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    const handMidpointX = (thumbTip.x + indexTip.x) / 2 * window.innerWidth;
    const handMidpointY = (thumbTip.y + indexTip.y) / 2 * window.innerHeight;

    const PINCH_THRESHOLD = 0.05;
    const selectedObject = objects.find(o => o.id === selectedId);
    if (!selectedObject) {
      if (pinchingState) setPinchingState(null);
      return;
    }

    // Start pinching
    if (distance < PINCH_THRESHOLD && !pinchingState) {
      setPinchingState({
        initialDistance: distance,
        initialScale: selectedObject.scale,
        initialAngle: angle,
        initialRotation: selectedObject.rotation,
        initialObjectX: selectedObject.x,
        initialObjectY: selectedObject.y,
        initialHandX: handMidpointX,
        initialHandY: handMidpointY,
      });
    // Continue pinching
    } else if (pinchingState) {
      // End pinching
      if (distance > PINCH_THRESHOLD * 1.5) {
        setPinchingState(null);
      } else {
        // --- Calculate Scale ---
        const scaleFactor = distance / (pinchingState.initialDistance + 1e-5);
        let newScale = pinchingState.initialScale * scaleFactor;
        newScale = Math.max(0.1, Math.min(newScale, 5.0)); // Clamp scale
        
        // --- Calculate Rotation ---
        const angleDelta = angle - pinchingState.initialAngle;
        const newRotation = pinchingState.initialRotation + angleDelta;

        // --- Calculate Drag ---
        const handMoveX = handMidpointX - pinchingState.initialHandX;
        const handMoveY = handMidpointY - pinchingState.initialHandY;
        const newX = pinchingState.initialObjectX + handMoveX;
        const newY = pinchingState.initialObjectY + handMoveY;

        onUpdateObject({
          ...selectedObject,
          x: newX,
          y: newY,
          scale: newScale,
          rotation: newRotation,
        });
      }
    }
  }, [handLandmarks, active, selectedId, objects, onUpdateObject, pinchingState]);


  return (
    <div 
      className={`absolute inset-0 z-20 overflow-hidden ${active ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      onClick={() => setSelectedId(null)} // Deselect on background click
    >
      {objects.map(obj => (
        <div
          key={obj.id}
          className={`absolute flex flex-col items-center group touch-none select-none`}
          style={{
            left: obj.x,
            top: obj.y,
            transform: `translate(-50%, -50%) scale(${obj.scale}) rotate(${obj.rotation}deg)`,
            cursor: active ? 'grab' : 'default'
          }}
          onMouseDown={(e) => handleMouseDown(e, obj)}
          onTouchStart={(e) => handleMouseDown(e, obj)}
          onClick={(e) => e.stopPropagation()} // Prevent background click when clicking object
        >
          <div className={`relative p-1 border-2 ${selectedId === obj.id && active ? 'border-cyan-400 bg-cyan-400/10' : 'border-transparent'} rounded-lg transition-all`}>
            <img 
              src={obj.imageUrl} 
              alt="AR Object" 
              className="max-w-[200px] max-h-[200px] object-contain drop-shadow-2xl" 
              draggable={false}
            />
            {selectedId === obj.id && active && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/80 rounded-full p-1 backdrop-blur-md">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateObject({...obj, scale: obj.scale * 1.1}); }}
                  className="p-1 hover:text-cyan-400"
                >
                  <Maximize2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveObject(obj.id); }}
                  className="p-1 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};