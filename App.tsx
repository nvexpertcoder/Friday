import React, { useState, useEffect, useRef } from 'react';
import { ARView } from './components/ARView';
import { AssistantUI } from './components/AssistantUI';
import { DrawingLayer } from './components/DrawingLayer';
import { BuildingLayer } from './components/BuildingLayer';
import { HandTracking } from './components/HandTracking';
import { HandCursor } from './components/HandCursor';
import { AppMode, ChatMessage, GeneratedObject } from './types';
import { 
  analyzeImage, 
  generateAssistantResponse, 
  generateARObject, 
  hasApiKey, 
  setApiKey, 
  clearApiKey,
  getProvider,
  setProvider,
  AIProvider
} from './services/geminiService';
import { Palette, Box, BrainCircuit, Activity, Settings, Brush, Eraser, Server, Cloud } from 'lucide-react';

// --- Setup Wizard Component ---
interface SetupWizardProps {
  onSetupComplete: () => void;
}
const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const [step, setStep] = useState<'select' | 'gemini' | 'ollama'>('select');
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  // New state for Ollama connection test
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSaveGemini = () => {
    if (keyInput.trim()) {
      setApiKey(keyInput.trim());
      setProvider('gemini');
      onSetupComplete();
    } else {
      setError('API Key cannot be empty.');
    }
  };

  const handleConfirmOllama = () => {
    setProvider('ollama');
    onSetupComplete();
  };

  const testOllamaConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage('');
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
      });
      if (!response.ok) {
          throw new Error(`Ollama server responded with status ${response.status}.`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.models)) {
          setTestStatus('success');
          setTestMessage(`Successfully connected! Found ${data.models.length} models.`);
      } else {
          throw new Error('Received an unexpected response from Ollama.');
      }
    } catch (error: any) {
      setTestStatus('error');
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
          setTestMessage("Connection failed. This is a CORS issue.\n\nPlease stop your Ollama server and restart it with the following command in your terminal:\n\nOLLAMA_ORIGINS=\"*\" ollama serve");
      } else {
          setTestMessage(`An error occurred: ${error.message}\n\nPlease ensure Ollama is running correctly.`);
      }
    } finally {
      setIsTesting(false);
    }
  };


  const renderContent = () => {
    switch (step) {
      case 'gemini':
        return (
          <>
            <h2 className="font-hud text-3xl text-cyan-400 mb-4">Google Gemini API</h2>
            <div className="text-left text-white/80 space-y-4 mb-6">
                <p>Enter your Google Gemini API key to connect to Google's cloud AI.</p>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
                    <h3 className="font-bold mb-2">Important Note on API Keys</h3>
                    <p>
                        While free-tier API keys will work, they have very strict usage limits. You may encounter "Quota Exceeded" errors frequently.
                    </p>
                    <p className="mt-2">
                        For a stable experience, it is <strong>highly recommended</strong> to use an API key from a project with billing enabled.
                        You can set this up at the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-bold hover:underline">Google AI developer portal</a>.
                    </p>
                </div>
            </div>
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveGemini()} placeholder="Enter your Gemini API key" className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-4 py-3 text-white placeholder-cyan-700/50 outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm" />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <button onClick={handleSaveGemini} disabled={!keyInput.trim()} className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-black font-hud text-lg py-3 rounded-lg transition-all">Authorize FRIDAY</button>
            <button onClick={() => setStep('select')} className="text-xs text-white/50 mt-4 hover:underline">Back to provider selection</button>
          </>
        );
      case 'ollama':
        return (
          <>
            <h2 className="font-hud text-3xl text-yellow-400 mb-4">Ollama Local AI</h2>
            <p className="text-white/80 mb-4">To use Ollama, you must have it running on your local machine. The application will attempt to connect to <code className="bg-black/30 text-yellow-300 p-1 rounded">http://localhost:11434</code>.</p>
            <p className="text-sm text-white/60 mb-2">Recommended models: <code className="text-white">llama3</code> for chat and <code className="text-white">llava</code> for vision. FRIDAY will use these by default. Note: Image Generation (Building Mode) is not available with Ollama.</p>
            
            <div className="my-6 text-left">
              <button onClick={testOllamaConnection} disabled={isTesting} className="w-full bg-blue-500/50 hover:bg-blue-500/70 text-white font-hud text-md py-2 rounded-lg transition-all disabled:opacity-50">
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              {testStatus !== 'idle' && (
                <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  testStatus === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  <code className="block">{testMessage}</code>
                </div>
              )}
            </div>
            
            <button onClick={handleConfirmOllama} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-hud text-lg py-3 rounded-lg transition-all">Confirm and Connect</button>
            <button onClick={() => setStep('select')} className="text-xs text-white/50 mt-4 hover:underline">Back to provider selection</button>
          </>
        );
      default: // 'select'
        return (
          <>
            <h2 className="font-hud text-3xl text-cyan-400 mb-4">Select AI Provider</h2>
            <p className="text-white/80 mb-8">Choose the AI service that will power FRIDAY's core intelligence.</p>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => setStep('gemini')} className="flex-1 p-6 glass-panel rounded-lg text-left hover:border-cyan-400 transition-all border border-cyan-500/50">
                <Cloud className="text-cyan-400 mb-2" size={32} />
                <h3 className="font-hud text-xl text-white">Google Gemini</h3>
                <p className="text-xs text-white/60">Powerful, cloud-based AI with full capabilities, including image generation. Requires an API key.</p>
              </button>
              <button onClick={() => setStep('ollama')} className="flex-1 p-6 glass-panel rounded-lg text-left hover:border-yellow-400 transition-all border border-yellow-500/50">
                <Server className="text-yellow-400 mb-2" size={32} />
                <h3 className="font-hud text-xl text-white">Ollama</h3>
                <p className="text-xs text-white/60">Run AI locally on your own machine. Private and customizable. Image generation is not supported.</p>
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-xl max-w-2xl w-full text-center">{renderContent()}</div>
    </div>
  );
};
// --- End Setup Wizard Component ---


export default function App() {
  const [setupComplete, setSetupComplete] = useState(() => {
    const provider = getProvider();
    return provider === 'gemini' ? hasApiKey() : provider === 'ollama';
  });
  
  const [mode, setMode] = useState<AppMode>(AppMode.NORMAL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [systemError, setSystemError] = useState<string | null>(null);
  const [isInCooldown, setIsInCooldown] = useState(false);
  
  const [drawingTool, setDrawingTool] = useState<'brush' | 'eraser'>('brush');
  const [brushColor, setBrushColor] = useState('#00FFFF');
  const [brushSize, setBrushSize] = useState(5);
  const [handLandmarks, setHandLandmarks] = useState<any[]>([]);
  const [clearCanvasTrigger, setClearCanvasTrigger] = useState(0);
  
  const [arObjects, setArObjects] = useState<GeneratedObject[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const currentProvider = getProvider();

  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  const handleResetSettings = () => {
    clearApiKey(); // This now clears the provider as well
    setSetupComplete(false);
    setSystemError(null); // Clear error when resetting
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '', finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        if (interimTranscript) setLastTranscript(interimTranscript);
        if (finalTranscript) {
          setLastTranscript(finalTranscript);
          handleVoiceCommand(finalTranscript);
        }
      };
      recognitionRef.current.onerror = (event: any) => console.error('Speech recognition error', event.error);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start recognition", e);
        setIsListening(false);
      }
    }
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, text, timestamp: Date.now() }]);
  };

  const handleVoiceCommand = async (command: string) => {
    if (isInCooldown) {
      speak("API rate limit active. Please wait a moment before your next command.");
      return;
    }

    const lowerCmd = command.toLowerCase().trim();
    if (!lowerCmd) return;
    addMessage('user', command);
    setIsProcessing(true);

    try {
      // Mode Switching
      if (lowerCmd.includes('drawing mode')) { 
        setMode(AppMode.DRAWING); 
        speak("Drawing Mode initialized.");
        return;
      }
      if (lowerCmd.includes('building mode')) {
        if (currentProvider === 'ollama') {
          speak("Building Mode is not available with Ollama.");
        } else {
          setMode(AppMode.BUILDING); 
          speak("Building Mode engaged.");
        }
        return;
      }
      if (lowerCmd.includes('normal mode') || lowerCmd.includes('exit mode')) { 
        setMode(AppMode.NORMAL); 
        speak("Returning to Normal Mode.");
        return;
      }

      // Context-specific commands
      if (mode === AppMode.DRAWING) {
        if (lowerCmd.includes('eraser')) { setDrawingTool('eraser'); speak("Eraser activated."); return; }
        if (lowerCmd.includes('brush') || lowerCmd.includes('pen')) { setDrawingTool('brush'); speak("Brush activated."); return; }
        if (lowerCmd.includes('clear canvas')) { setClearCanvasTrigger(c => c + 1); speak("Canvas cleared."); return; }
        
        const colors: { [key: string]: string } = { red: '#FF4136', blue: '#0074D9', green: '#2ECC40', yellow: '#FFDC00', orange: '#FF851B', purple: '#B10DC9', white: '#FFFFFF', cyan: '#00FFFF' };
        for (const colorName in colors) { 
          if (lowerCmd.includes(colorName)) { 
            setBrushColor(colors[colorName]); 
            speak(`Color set to ${colorName}.`); 
            setDrawingTool('brush'); 
            return; 
          } 
        }
        if (lowerCmd.includes('bigger')) { setBrushSize(s => Math.min(s + 5, 50)); speak("Size increased."); return; }
        if (lowerCmd.includes('smaller')) { setBrushSize(s => Math.max(s - 5, 1)); speak("Size decreased."); return; }
        const sizeMatch = lowerCmd.match(/(size) (\d+)/);
        if (sizeMatch?.[2]) { 
            const newSize = parseInt(sizeMatch[2], 10); 
            setBrushSize(Math.max(1, Math.min(newSize, 50))); 
            speak(`Size set to ${newSize}.`); 
            return; 
        }
      } 
      
      // AI-powered commands
      if (lowerCmd.includes('generate') || lowerCmd.includes('put a') || lowerCmd.includes('spawn')) {
        await processGenerationCommand(lowerCmd);
      } else if (lowerCmd.includes('analyze') || lowerCmd.includes('what is this')) {
        const frame = captureFrame();
        if (frame) {
          const analysis = await analyzeImage(frame, lowerCmd);
          addMessage('assistant', analysis); speak(analysis);
        } else speak("Visual sensors unavailable.");
      } else {
        await processGeneralCommand(command);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.message || "An unknown system error occurred.";
      setSystemError(message);
      speak("I've encountered a system error. Please see the screen for details.");
      
      if (message.includes('API quota exceeded')) {
        setIsInCooldown(true);
        setTimeout(() => setIsInCooldown(false), 30000); // 30-second cooldown
      }
    } finally {
      setIsProcessing(false);
      setLastTranscript('');
    }
  };
  
  const processGeneralCommand = async (command: string) => {
      const aiResponse = await generateAssistantResponse(messages, command);
      addMessage('assistant', aiResponse); speak(aiResponse);
  };

  const processGenerationCommand = async (lowerCmd: string) => {
    if (currentProvider === 'ollama') {
        const resp = "Image generation is not supported when using Ollama.";
        addMessage('assistant', resp); speak(resp);
        return;
    }
    const prompt = lowerCmd.replace(/generate|put a|spawn|here|friday/g, '').trim();
    speak(`Generating ${prompt}...`);
    let spawnX = window.innerWidth / 2, spawnY = window.innerHeight / 2;
    if (handLandmarks?.[0]) {
        const landmarks = handLandmarks[0];
        const isPointing = (landmarks[8].y < landmarks[5].y) && (landmarks[12].y > landmarks[9].y);
        if (isPointing) { spawnX = landmarks[8].x * window.innerWidth; spawnY = landmarks[8].y * window.innerHeight; }
    }
    const imageUrl = await generateARObject(prompt);
    if (imageUrl) {
        setArObjects(prev => [...prev, { id: Date.now().toString(), imageUrl, x: spawnX, y: spawnY, scale: 1, rotation: 0 }]);
        if (mode !== AppMode.BUILDING) setMode(AppMode.BUILDING);
        speak(`Placed ${prompt} in the scene.`);
    } else {
        speak("Failed to generate asset.");
    }
  };

  const isQuotaError = systemError?.includes('API quota exceeded');

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans">
      {!setupComplete ? (
        <SetupWizard onSetupComplete={handleSetupComplete} />
      ) : (
        <>
          <ARView onFrameCapture={() => {}} videoRef={videoRef} />
          <HandTracking videoRef={videoRef} onLandmarks={setHandLandmarks} enabled={mode === AppMode.DRAWING || (mode === AppMode.BUILDING && currentProvider !== 'ollama')} />
          <HandCursor handLandmarks={handLandmarks} enabled={mode === AppMode.DRAWING || (mode === AppMode.BUILDING && currentProvider !== 'ollama')} />
          <DrawingLayer active={mode === AppMode.DRAWING} color={brushColor} brushSize={drawingTool === 'eraser' ? 30 : brushSize} handLandmarks={handLandmarks} clearTrigger={clearCanvasTrigger} tool={drawingTool} />
          {currentProvider !== 'ollama' && <BuildingLayer active={mode === AppMode.BUILDING} objects={arObjects} onUpdateObject={(updated) => setArObjects(prev => prev.map(o => o.id === updated.id ? updated : o))} onRemoveObject={(id) => setArObjects(prev => prev.filter(o => o.id !== id))} handLandmarks={handLandmarks} />}

          <div className="absolute top-0 left-0 p-6 z-40 flex items-start gap-4 flex-wrap">
            <div className="glass-panel p-4 rounded-lg border-l-4 border-cyan-400">
              <h1 className="text-2xl font-hud font-bold text-cyan-400 tracking-wider">FRIDAY <span className="text-xs text-white/60 font-normal">OS v1.0</span></h1>
              <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                 <span className="text-xs font-mono text-cyan-200/70">{isListening ? 'LISTENING' : 'STANDBY'}</span>
              </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setMode(AppMode.NORMAL)} className={`p-3 rounded-lg backdrop-blur-sm transition-all border ${mode === AppMode.NORMAL ? 'bg-cyan-500/30 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'bg-black/40 border-white/10 text-gray-400'}`}><BrainCircuit size={20} /><span className="text-[10px] block mt-1 font-hud">NORMAL</span></button>
                <button onClick={() => setMode(AppMode.DRAWING)} className={`p-3 rounded-lg backdrop-blur-sm transition-all border ${mode === AppMode.DRAWING ? 'bg-pink-500/30 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'bg-black/40 border-white/10 text-gray-400'}`}><Palette size={20} /><span className="text-[10px] block mt-1 font-hud">DRAW</span></button>
                <button onClick={() => currentProvider !== 'ollama' && setMode(AppMode.BUILDING)} disabled={currentProvider === 'ollama'} className={`p-3 rounded-lg backdrop-blur-sm transition-all border ${mode === AppMode.BUILDING && currentProvider !== 'ollama' ? 'bg-yellow-500/30 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-black/40 border-white/10 text-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed`}><Box size={20} /><span className="text-[10px] block mt-1 font-hud">BUILD</span></button>
                <button onClick={handleResetSettings} title="Change Settings" className="p-3 rounded-lg backdrop-blur-sm transition-all border bg-black/40 border-white/10 text-gray-400 hover:bg-red-500/30 hover:text-red-300 hover:border-red-400"><Settings size={20} /><span className="text-[10px] block mt-1 font-hud">CONFIG</span></button>
            </div>
          </div>
          
          <div className="absolute top-6 right-6 z-30 pointer-events-none hidden md:block">
             <div className="glass-panel p-2 rounded flex flex-col items-end gap-1"><div className="flex items-center gap-2 text-cyan-400/80"><Activity size={16} /><span className="font-mono text-xs">SYS_OPTIMAL</span></div><div className="text-[10px] text-cyan-700 font-mono">MEM: {arObjects.length * 12}MB<br/>LAT: 24ms<br/>GPS: LOCK</div></div>
          </div>
          
          <AssistantUI isListening={isListening} isProcessing={isProcessing} isInCooldown={isInCooldown} messages={messages} onToggleListening={toggleListening} onSendMessage={handleVoiceCommand} lastTranscript={lastTranscript} />
          
          {mode === AppMode.DRAWING && ( <div className="absolute top-28 left-6 z-30 glass-panel px-4 py-3 rounded-lg text-xs text-pink-300 pointer-events-none flex flex-col gap-2"><div className="font-hud text-base">DRAWING MODE</div><div className="flex items-center gap-3"><span className="font-bold">TOOL:</span>{drawingTool === 'brush' ? <div className="flex items-center gap-2 text-white"><Brush size={16}/> BRUSH</div> : <div className="flex items-center gap-2 text-white"><Eraser size={16}/> ERASER</div>}</div><div className="flex items-center gap-3"><span className="font-bold">SIZE:</span><span className="text-white">{drawingTool === 'eraser' ? 30 : brushSize}px</span></div>{drawingTool === 'brush' && (<div className="flex items-center gap-3"><span className="font-bold">COLOR:</span><div className="w-4 h-4 rounded-full border-2 border-white/50" style={{ backgroundColor: brushColor }}></div></div>)}<div className="mt-2 border-t border-pink-400/20 pt-2 text-pink-400/80">Point to draw.<br/>Say "Eraser", a color, or "bigger".</div></div> )}
          {mode === AppMode.BUILDING && currentProvider !== 'ollama' && ( <div className="absolute top-28 left-6 z-30 glass-panel px-3 py-2 rounded text-xs text-yellow-300 pointer-events-none">MODE: BUILDING<br/>Point and say "Generate [object]".<br/>Drag objects to move.<br/>Pinch to scale & rotate selected.</div> )}
        </>
      )}

      {systemError && (
        <div className="absolute inset-0 z-[101] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className={`glass-panel p-8 rounded-xl max-w-lg w-full text-center border ${isQuotaError ? 'border-yellow-500/50' : 'border-red-500/50'}`}>
            <h2 className={`font-hud text-3xl mb-4 ${isQuotaError ? 'text-yellow-400' : 'text-red-400'}`}>
              {isQuotaError ? 'Quota Exceeded' : 'System Error'}
            </h2>
            <p className="text-white/80 mb-6 whitespace-pre-wrap text-left">{systemError}</p>
            {isQuotaError ? (
              <div className="flex flex-col gap-2 mt-4">
                <button 
                  onClick={handleResetSettings}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-hud text-lg py-3 rounded-lg transition-all"
                >
                  Change API Key
                </button>
                <button 
                  onClick={() => setSystemError(null)} 
                  className="w-full bg-gray-500/50 hover:bg-gray-500/70 text-white font-hud text-lg py-2 rounded-lg transition-all"
                >
                  Acknowledge & Wait
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSystemError(null)} 
                className="mt-4 w-full bg-red-500 hover:bg-red-400 text-black font-hud text-lg py-3 rounded-lg transition-all"
              >
                Acknowledge
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}