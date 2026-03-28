import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Radio } from 'lucide-react';
import { ChatMessage } from '../types';

interface AssistantUIProps {
  isListening: boolean;
  isProcessing: boolean;
  isInCooldown: boolean;
  messages: ChatMessage[];
  onToggleListening: () => void;
  onSendMessage: (text: string) => void;
  lastTranscript: string;
}

export const AssistantUI: React.FC<AssistantUIProps> = ({ 
  isListening, 
  isProcessing, 
  isInCooldown,
  messages, 
  onToggleListening, 
  onSendMessage,
  lastTranscript 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = React.useState('');
  const isBusy = isProcessing || isInCooldown;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, lastTranscript]);

  const handleSend = () => {
    if (!inputText.trim() || isBusy) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 z-50 flex flex-col gap-2 pointer-events-none">
      {/* Transcript / Dynamic Subtitles */}
      {(lastTranscript || isProcessing || isInCooldown) && (
         <div className="mx-auto mb-4 max-w-lg text-center">
            <div className={`inline-block glass-panel px-6 py-3 rounded-full font-hud text-lg ${
              isInCooldown ? 'text-yellow-400 border border-yellow-500/50' : 'text-cyan-400 animate-pulse'
            }`}>
                {isProcessing ? "PROCESSING..." : isInCooldown ? "RATE LIMIT ACTIVE" : `"${lastTranscript}"`}
            </div>
         </div>
      )}

      {/* Chat History Panel - Left Side (Desktop) or Bottom (Mobile) */}
      <div className="pointer-events-auto flex flex-col md:flex-row items-end justify-between gap-4">
        
        {/* Messages Area */}
        <div className="hidden md:flex flex-col max-h-[300px] w-[350px] glass-panel rounded-xl p-4 overflow-hidden">
             <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                <Radio className="text-cyan-400 animate-pulse" size={16} />
                <span className="font-hud text-xs text-cyan-400 tracking-widest">SYSTEM_LOG</span>
             </div>
             <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[90%] text-sm p-2 rounded-lg ${
                            msg.role === 'user' 
                            ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-500/30' 
                            : 'bg-slate-800/60 text-slate-200 border border-slate-600/30'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
             </div>
        </div>

        {/* Voice Control & Input */}
        <div className="w-full md:w-auto glass-panel p-2 rounded-full flex items-center gap-2 mx-auto md:mx-0">
          <button
            onClick={onToggleListening}
            disabled={isBusy}
            className={`p-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening 
                ? 'bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse' 
                : 'bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isListening ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isBusy ? "Please wait..." : "Command FRIDAY..."}
            disabled={isBusy}
            className="bg-transparent border-none outline-none text-white placeholder-cyan-700/50 w-full md:w-64 px-2 font-hud disabled:opacity-50"
          />
          
          <button 
            onClick={handleSend}
            disabled={isBusy || !inputText.trim()}
            className="p-3 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};