import React, { useState, useCallback, useEffect } from 'react';
import { speechRecognitionService } from '@/services/voice/SpeechRecognitionService';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language: 'en' | 'ar';
  disabled?: boolean;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  language,
  disabled = false,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(speechRecognitionService.isBrowserSupported());
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleResult = (event: any) => {
      if (event.data && event.data.isFinal) {
        onTranscript(event.data.transcript);
        setIsListening(false);
      }
    };

    const handleError = (event: any) => {
      console.error('Voice recognition error:', event.data);
      setError('Voice recognition failed. Please try again.');
      setIsListening(false);
    };

    const handleEnd = () => {
      setIsListening(false);
    };

    speechRecognitionService.addEventListener('result', handleResult);
    speechRecognitionService.addEventListener('error', handleError);
    speechRecognitionService.addEventListener('end', handleEnd);

    return () => {
      speechRecognitionService.removeEventListener('result', handleResult);
      speechRecognitionService.removeEventListener('error', handleError);
      speechRecognitionService.removeEventListener('end', handleEnd);
    };
  }, [onTranscript]);

  const toggleListening = useCallback(async () => {
    if (!isSupported) {
      setError('Voice input is not supported in this browser');
      return;
    }

    setError(null);

    try {
      if (isListening) {
        speechRecognitionService.stopListening();
        setIsListening(false);
      } else {
        // Configure for the current language
        await speechRecognitionService.updateConfiguration({
          language: language === 'ar' ? 'ar-SA' : 'en-US',
          continuous: false,
          interimResults: true,
          confidence: 0.7
        });

        await speechRecognitionService.startListening();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Voice input error:', error);
      setError('Failed to start voice input. Please check microphone permissions.');
      setIsListening(false);
    }
  }, [isListening, isSupported, language]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  const buttonText = language === 'ar'
    ? (isListening ? 'جاري الاستماع...' : 'إدخال صوتي')
    : (isListening ? 'Listening...' : 'Voice Input');

  const ariaLabel = language === 'ar'
    ? 'إدخال صوتي للاستعلام'
    : 'Voice input for query';

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={toggleListening}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`flex items-center justify-center p-2 rounded-lg border transition-colors ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
            : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isListening ? (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-sm">{buttonText}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm">{buttonText}</span>
          </div>
        )}
      </button>

      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 max-w-xs text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;