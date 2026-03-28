// This file has been updated to support both Google Gemini and Ollama.
// It acts as a unified service layer, routing requests to the correct AI provider.
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- AI Provider Management ---
export type AIProvider = 'gemini' | 'ollama';
const AI_PROVIDER_STORAGE_KEY = 'ai-provider';

export const setProvider = (provider: AIProvider): void => {
    localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
};

export const getProvider = (): AIProvider => {
    return (localStorage.getItem(AI_PROVIDER_STORAGE_KEY) as AIProvider) || 'gemini';
};


// ===================================================================
// START: Gemini-specific implementation
// ===================================================================
const API_KEY_STORAGE_KEY = 'gemini-api-key';

export const hasApiKey = (): boolean => {
  return !!localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const setApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const clearApiKey = (): void => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    // Also clear provider setting to force re-selection
    localStorage.removeItem(AI_PROVIDER_STORAGE_KEY);
}

const getGeminiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found. Please set your API key in the settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota/Rate limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getGeminiFriendlyErrorMessage = (error: any, defaultMsg: string): string => {
  console.error(defaultMsg, error);
  if (error?.message?.includes('API key not valid')) {
      return "Your API key is not valid. Please check it in the settings.";
  }
  if (error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
    return "API quota exceeded. This is a limit on your Google account, not an application error.\n\n" +
           "To continue, you can:\n" +
           "1. Ensure billing is enabled for your project at ai.google.dev/gemini-api/docs/billing.\n" +
           "2. Wait for your free tier quota to reset.\n" +
           "3. Use a different API key with available quota.";
  }
   if (error?.message?.includes('API Key not found')) {
    return "API Key not set. Please add your key via the settings button.";
  }
  return defaultMsg;
};

const geminiAnalyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } }, { text: prompt }] },
      config: { systemInstruction: "You are FRIDAY, an intelligent AR assistant. Keep responses concise, helpful, and technical yet conversational. Do not use markdown formatting extensively, plain text is preferred for speech synthesis." }
    }));
    return response.text || "I couldn't analyze the visual data.";
  } catch (error) {
    throw new Error(getGeminiFriendlyErrorMessage(error, "I encountered an error analyzing the visual feed."));
  }
};

const geminiGenerateAssistantResponse = async (history: { role: string; text: string }[], userMessage: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    
    const contents = [
      ...history.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.text }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: { systemInstruction: "You are FRIDAY. Helpful, concise, intelligent." }
    }));
    return response.text || "I didn't catch that.";
  } catch (error) {
    throw new Error(getGeminiFriendlyErrorMessage(error, "Communication systems are offline."));
  }
};

const geminiGenerateARObject = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Generate a high quality, isolated object with a transparent background if possible, or a solid clean background. The object is: ${prompt}` }] }
    }));
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) { return `data:image/png;base64,${part.inlineData.data}`; }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw new Error(getGeminiFriendlyErrorMessage(error, "Failed to generate AR object."));
  }
};

// ===================================================================
// START: Ollama-specific implementation
// ===================================================================

const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';
const OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat';
const OLLAMA_VISION_MODEL = 'llava';
const OLLAMA_TEXT_MODEL = 'llama3';

const getOllamaFriendlyErrorMessage = (error: any, defaultMsg: string): string => {
  console.error(defaultMsg, error);
  if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      return "Could not connect to Ollama. This is a Cross-Origin (CORS) issue.\n\n" +
             "Your browser is blocking the request for security reasons. To fix this, you must configure your local Ollama server to allow connections from this web page.\n\n" +
             "1. Stop the Ollama server if it's running.\n" +
             "2. Open a new terminal and run this exact command:\n\n" +
             "   OLLAMA_ORIGINS=\"*\" ollama serve\n\n" +
             "Keep this terminal window open while using the app.";
  }
  return defaultMsg;
}

const ollamaAnalyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const response = await fetch(OLLAMA_GENERATE_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_VISION_MODEL, prompt: prompt, images: [base64Image.split(',')[1]], stream: false })
    });
    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const data = await response.json();
    return data.response || "I couldn't analyze the visual data with Ollama.";
  } catch (error) {
    throw new Error(getOllamaFriendlyErrorMessage(error, "I encountered an error analyzing the visual feed with Ollama."));
  }
};

const ollamaGenerateAssistantResponse = async (history: { role: string; text: string }[], userMessage: string): Promise<string> => {
  try {
    const messages = [
      ...history.map(msg => ({
        role: msg.role,
        content: msg.text
      })),
      { role: 'user', content: userMessage }
    ];
    
    const response = await fetch(OLLAMA_CHAT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: OLLAMA_TEXT_MODEL, 
        messages: messages,
        stream: false 
      })
    });
    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const data = await response.json();
    // The chat endpoint returns the response in a message object
    return data.message?.content || "I didn't catch that.";
  } catch (error) {
    throw new Error(getOllamaFriendlyErrorMessage(error, "Communication with Ollama failed."));
  }
};

const ollamaGenerateARObject = async (prompt: string): Promise<string | null> => {
    console.warn("Ollama does not support image generation through its standard API. This feature is disabled.");
    return null; 
};

// ===================================================================
// Unified Service Exports (Router)
// ===================================================================

export const analyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
    const provider = getProvider();
    if (provider === 'ollama') return ollamaAnalyzeImage(base64Image, prompt);
    return geminiAnalyzeImage(base64Image, prompt);
};

export const generateAssistantResponse = async (history: { role: string; text: string }[], userMessage: string): Promise<string> => {
    const provider = getProvider();
    if (provider === 'ollama') return ollamaGenerateAssistantResponse(history, userMessage);
    return geminiGenerateAssistantResponse(history, userMessage);
};

export const generateARObject = async (prompt: string): Promise<string | null> => {
    const provider = getProvider();
    if (provider === 'ollama') return ollamaGenerateARObject(prompt);
    return geminiGenerateARObject(prompt);
};