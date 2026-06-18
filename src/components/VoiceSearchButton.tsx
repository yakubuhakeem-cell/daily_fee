import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  inputId?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({
  onTranscript,
  className = "",
  inputId
}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safely check for standard and prefixed SpeechRecognition in browser environment
  const SpeechRecognition = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition;
  
  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!isListening) return;

    let recognition: any = null;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          // Remove trailing period if speech recognizer added one to match simple searches
          const cleanedText = transcript.trim().replace(/\.$/, '');
          onTranscript(cleanedText);
          
          if (inputId) {
            const inputEl = document.getElementById(inputId) as HTMLInputElement;
            if (inputEl) {
              inputEl.focus();
              const inputEvent = new Event('input', { bubbles: true });
              inputEl.dispatchEvent(inputEvent);
            }
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }

    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isListening]);

  if (!isSupported) {
    return null;
  }

  const toggleListening = () => {
    setIsListening(prev => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`p-1.5 rounded-full cursor-pointer hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-all flex items-center justify-center relative ${className} ${
        isListening ? "animate-ping border border-amber-500 bg-amber-500/20 text-amber-400" : ""
      }`}
      aria-label="Search by voice"
      title={isListening ? "Listening... Click to stop." : "Search by voice (Microphone)"}
    >
      <Mic className={`${isListening ? "text-amber-400" : ""} h-3.5 w-3.5`} />
    </button>
  );
};
