import { useState, useRef, useEffect } from 'react';

export const useSpeech = (input, setInput, isStreaming, handleSubmitRef) => {
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const silenceTimeoutRef = useRef(null);
  const lastInputWasVoiceRef = useRef(false);

  useEffect(() => {
    if (autoSubmitPending) {
        setAutoSubmitPending(false);
        if (input.trim() && !isStreaming) {
            if (handleSubmitRef.current) handleSubmitRef.current({ preventDefault: () => {} }, { fromVoice: true });
        }
    }
  }, [autoSubmitPending, input, isStreaming, handleSubmitRef]);

  // Use an interval to check if AI is still speaking, since events can be flaky
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.speechSynthesis) {
        setIsAiSpeaking(window.speechSynthesis.speaking);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      manualStopRef.current = true;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    manualStopRef.current = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not natively support Speech Recognition.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const originalInput = input.trim();
    let finalTranscript = '';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const combined = originalInput + (originalInput && (finalTranscript || interimTranscript) ? ' ' : '') + finalTranscript + interimTranscript;
      setInput(combined);
      
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      
      if (combined.trim()) {
         silenceTimeoutRef.current = setTimeout(() => {
             if (recognitionRef.current) {
                 manualStopRef.current = false;
                 recognitionRef.current.stop();
             }
         }, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (!manualStopRef.current) {
          setAutoSubmitPending(true);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const speakChunk = (text) => {
    if (!window.speechSynthesis || !text) return;
    const cleanText = text.replace(/[*#`_]/g, '').trim();
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(v => 
       v.name.includes('Google US English') || 
       v.name.includes('Microsoft Aria') ||
       v.name.includes('Samantha') || 
       v.name.includes('Google UK English Female') ||
       v.name.includes('Microsoft Jenny') ||
       v.name.includes('Microsoft Guy')
    );
    
    if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(window.speechSynthesis.speaking);
    utterance.onerror = () => setIsAiSpeaking(window.speechSynthesis.speaking);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }
  };

  return {
    isListening,
    isAiSpeaking,
    toggleListening,
    speakChunk,
    stopSpeaking,
    lastInputWasVoiceRef,
    manualStopRef,
    recognitionRef,
    setIsListening,
    setAutoSubmitPending
  };
};
