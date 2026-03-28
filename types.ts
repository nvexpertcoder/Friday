export enum AppMode {
  NORMAL = 'NORMAL',
  DRAWING = 'DRAWING',
  BUILDING = 'BUILDING',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export interface GeneratedObject {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'brush' | 'eraser';
}

export interface VisionAnalysisResult {
  text: string;
  relatedItems?: string[];
}

// For Web Speech API support
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}