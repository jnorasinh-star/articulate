
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AudioRecorder } from '../lib/audioRecorder';
import { AudioPlayer } from '../lib/audioPlayer';

interface PronunciationLiveProps {
  word: string;
  onClose: () => void;
}

export default function PronunciationLive({ word, onClose }: PronunciationLiveProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    playerRef.current = new AudioPlayer(24000);
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    setFeedback(null);
    setTranscription('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            setIsListening(true);
            
            // Start recording after connection is open
            recorderRef.current = new AudioRecorder((base64Data) => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
            recorderRef.current.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const part = message.serverContent?.modelTurn?.parts?.[0];
            if (part?.inlineData?.data) {
              playerRef.current?.playBase64Chunk(part.inlineData.data);
            }

            // Handle transcription (Model's response text)
            if (message.serverContent?.modelTurn?.parts) {
               const text = message.serverContent.modelTurn.parts
                 .filter(p => !!p.text)
                 .map(p => p.text)
                 .join(' ');
               if (text) {
                 setFeedback(text); // Replace instead of append for clearer live feedback
               }
            }

            // Handle user transcription
            if ((message as any).inputAudioTranscription?.text) {
               setTranscription((message as any).inputAudioTranscription.text);
            }
          },
          onerror: (error) => {
            console.error('Gemini Live Error:', error);
            stopSession();
          },
          onclose: () => {
            setIsConnected(false);
            setIsListening(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: `You are a strict but encouraging pronunciation coach.
          The user is practicing the word: "${word}".
          
          TASK:
          1. Listen to the user's pronunciation of "${word}".
          2. IMMEDIATELY tell them if they got it right or wrong.
          3. Be specific. If they mispronounced a vowel or consonant, point it out.
          4. Give them a "Pass" or "Try again" verdict clearly in your speech.
          
          TONE: Friendly, academic, and precise.
          RESPONSE LIMIT: Keep responses to maximum 10 seconds of speech.`,
          inputAudioTranscription: {},
        },
      });

      sessionRef.current = sessionPromise;
    } catch (error) {
      console.error('Failed to connect to Gemini Live:', error);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    recorderRef.current?.stop();
    playerRef.current?.stop();
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
    }
    setIsConnected(false);
    setIsListening(false);
  };

  const toggleSession = () => {
    if (isConnected) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-4 border-deep">
        <div className="p-6 border-b border-deep/10 flex justify-between items-center bg-paper">
          <div>
            <h3 className="text-xl font-serif font-bold text-deep uppercase italic tracking-tight">Articulate Live</h3>
            <p className="text-xs text-deep/60 font-mono">Pronunciation Coach</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-deep/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-10 flex flex-col items-center gap-8 min-h-[300px] justify-center text-center">
          <div className="space-y-2">
            <p className="text-sm font-mono uppercase tracking-widest text-deep/40">Practice Word</p>
            <h2 className="text-4xl font-hand chalk-text text-deep bg-deep p-4 rounded-xl shadow-lg lowercase">{word}</h2>
          </div>

          <div className="relative">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-accent rounded-full -z-10"
                />
              )}
            </AnimatePresence>
            <button
              onClick={toggleSession}
              disabled={isConnecting}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isConnected ? 'bg-accent text-white scale-110' : 'bg-deep text-white hover:bg-deep/90'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="animate-spin" size={40} />
              ) : isConnected ? (
                <Mic size={40} />
              ) : (
                <MicOff size={40} />
              )}
            </button>
          </div>

          <div className="space-y-4 w-full">
            {transcription && (
              <div className="p-3 bg-paper rounded-xl border border-deep/5 text-sm italic text-deep/70">
                "{transcription}"
              </div>
            )}
            
            {feedback ? (
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-serif italic text-deep"
              >
                {feedback}
              </motion.p>
            ) : (
              <p className="text-sm text-deep/40 font-mono">
                {isConnected ? 'I\'m listening... speak naturally.' : 'Tap to start your live session.'}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 bg-deep/5 text-[10px] text-center font-mono opacity-50 uppercase tracking-tighter">
          Powered by Gemini 3.1 Live • Real-time Feedback
        </div>
      </div>
    </motion.div>
  );
}
