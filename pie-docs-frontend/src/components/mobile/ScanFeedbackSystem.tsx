import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanFeedback {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  code?: string;
  suggestions?: string[];
  duration?: number;
}

interface ScanFeedbackSystemProps {
  feedback: ScanFeedback | null;
  onDismiss: () => void;
  onRetry?: () => void;
  className?: string;
}

const ScanFeedbackSystem: React.FC<ScanFeedbackSystemProps> = ({
  feedback,
  onDismiss,
  onRetry,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (feedback) {
      setIsVisible(true);

      // Auto-dismiss after duration (default 5 seconds)
      const duration = feedback.duration || 5000;
      setTimeRemaining(duration);

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      // Update countdown every 100ms
      const countdown = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 100));
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
      };
    } else {
      setIsVisible(false);
    }
  }, [feedback]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300); // Wait for animation
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColors = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-800',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  if (!feedback) return null;

  const colors = getStatusColors(feedback.type);
  const progressPercentage = feedback.duration ? ((timeRemaining / feedback.duration) * 100) : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 left-4 right-4 z-50 ${className}`}
        >
          <div className={`border rounded-lg shadow-lg p-4 ${colors.bg}`}>
            {/* Progress bar */}
            {feedback.duration && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
                <motion.div
                  className="h-full bg-current opacity-30"
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
            )}

            <div className="flex items-start space-x-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 pt-0.5">
                {getStatusIcon(feedback.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${colors.text}`}>
                      {feedback.message}
                    </h4>

                    {feedback.details && (
                      <p className={`mt-1 text-xs ${colors.text} opacity-80`}>
                        {feedback.details}
                      </p>
                    )}

                    {feedback.code && (
                      <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs font-mono">
                        {feedback.code}
                      </div>
                    )}

                    {feedback.suggestions && feedback.suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className={`text-xs font-medium ${colors.text} mb-1`}>
                          Suggestions:
                        </p>
                        <ul className="space-y-1">
                          {feedback.suggestions.map((suggestion, index) => (
                            <li key={index} className={`text-xs ${colors.text} opacity-80 flex items-start`}>
                              <span className="w-1 h-1 bg-current rounded-full mt-1.5 mr-2 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={handleDismiss}
                    className={`flex-shrink-0 ml-3 ${colors.text} opacity-60 hover:opacity-100 transition-opacity`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Action buttons */}
                {(feedback.type === 'error' || feedback.type === 'warning') && onRetry && (
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={onRetry}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded ${colors.button} transition-colors`}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScanFeedbackSystem;