import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createConversation,
  setActiveConversation,
  addMessage,
  setNLPProcessing,
  setNLPLanguage,
  selectActiveConversation,
  selectNLPProcessing,
  selectNLPLanguage,
  selectNLPError
} from '@/store/slices/searchSlice';
import type { ConversationMessage } from '@/types/domain/Search';
import ConversationHistory from './ConversationHistory';
import VoiceInputButton from './VoiceInputButton';
import { nlpIntegrationService } from '@/services/nlp/NLPIntegrationService';

interface NLPQueryInterfaceProps {
  onResultsUpdate?: (results: any[]) => void;
  className?: string;
}

export const NLPQueryInterface: React.FC<NLPQueryInterfaceProps> = ({
  onResultsUpdate,
  className = ''
}) => {
  const dispatch = useDispatch();
  const activeConversation = useSelector(selectActiveConversation);
  const isProcessing = useSelector(selectNLPProcessing);
  const language = useSelector(selectNLPLanguage);
  const error = useSelector(selectNLPError);

  const [inputValue, setInputValue] = useState('');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isProcessing) return;

    const query = inputValue.trim();
    setInputValue('');

    // Create new conversation if none exists
    if (!activeConversation) {
      dispatch(createConversation({
        messages: [],
        title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
        language,
        isActive: true,
      }));
    }

    // Add user message
    dispatch(addMessage({
      type: 'user',
      content: query,
      language,
    }));

    // Start processing
    dispatch(setNLPProcessing(true));

    try {
      // Process query through actual NLP service
      const nlpResult = await nlpIntegrationService.processQuery(query, language);

      // Generate response based on NLP analysis
      let responseContent = '';
      if (nlpResult.intent.type === 'search') {
        responseContent = language === 'ar'
          ? `لقد وجدت ${nlpResult.searchResults.length} نتائج متعلقة بـ "${query}". إليك ما وجدته:`
          : `I found ${nlpResult.searchResults.length} results related to "${query}". Here's what I found:`;

        if (nlpResult.searchResults.length > 0) {
          responseContent += '\n\n' + nlpResult.searchResults.map(result =>
            `• ${result.title} (Score: ${Math.round(result.score * 100)}%)`
          ).join('\n');
        }
      } else if (nlpResult.intent.type === 'analytics') {
        responseContent = language === 'ar'
          ? `يمكنني مساعدتك في تحليل المستندات. بناءً على استعلامك "${query}"، إليك النتائج:`
          : `I can help you analyze your documents. Based on your query "${query}", here are the results:`;
      } else {
        responseContent = language === 'ar'
          ? `فهمت طلبك "${query}". دعني أبحث في مجموعة المستندات لديك.`
          : `I understand your request about "${query}". Let me search through your document collection.`;
      }

      // Add clarification if query is ambiguous
      if (nlpIntegrationService.isAmbiguous(query)) {
        const clarifications = nlpIntegrationService.getClarificationQuestions(query, language);
        if (clarifications.length > 0) {
          responseContent += '\n\n' + (language === 'ar' ? 'للحصول على نتائج أفضل، هل يمكنك توضيح:' : 'For better results, could you clarify:');
          responseContent += '\n' + clarifications.map(q => `• ${q}`).join('\n');
        }
      }

      dispatch(addMessage({
        type: 'assistant',
        content: responseContent,
        language,
        metadata: {
          intent: nlpResult.intent.type,
          confidence: nlpResult.confidence,
          entities: nlpResult.intent.entities,
          sources: nlpResult.searchResults.map(r => r.id),
          processingTime: nlpResult.processingTime
        }
      }));

      // Update results for parent component
      if (onResultsUpdate) {
        onResultsUpdate(nlpResult.searchResults);
      }

    } catch (error) {
      console.error('NLP processing failed:', error);
      dispatch(addMessage({
        type: 'assistant',
        content: language === 'ar'
          ? 'أعتذر، واجهت خطأ في معالجة استعلامك. يرجى المحاولة مرة أخرى.'
          : 'I apologize, but I encountered an error processing your query. Please try again.',
        language,
        metadata: {
          intent: 'error',
          confidence: 0.0,
          entities: [],
          sources: []
        }
      }));
    } finally {
      dispatch(setNLPProcessing(false));
    }

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue, isProcessing, activeConversation, language, dispatch]);

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: 'en' | 'ar') => {
    dispatch(setNLPLanguage(newLanguage));
    setShowLanguageSelector(false);
  }, [dispatch]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Handle voice input
  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInputValue(transcript);
    // Auto-submit voice input after a short delay
    setTimeout(() => {
      if (transcript.trim()) {
        handleSubmit(new Event('submit') as any);
      }
    }, 500);
  }, [handleSubmit]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const placeholderText = language === 'ar'
    ? 'اسأل عن مستنداتك باللغة الطبيعية...'
    : 'Ask questions about your documents in natural language...';

  const isRTL = language === 'ar';

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {language === 'ar' ? 'الاستعلام الذكي' : 'AI Assistant'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'اسأل عن مستنداتك' : 'Ask about your documents'}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span>{language === 'ar' ? 'العربية' : 'English'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showLanguageSelector && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  language === 'en' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('ar')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  language === 'ar' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}
              >
                العربية
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConversationHistory className="flex-1" />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <form onSubmit={handleSubmit} className="flex-1 relative">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                disabled={isProcessing}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`w-full min-h-[44px] max-h-32 p-3 pr-12 ${isRTL ? 'pl-12 pr-3' : 'pr-12 pl-3'} border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ fontSize: '16px' }} // Prevents zoom on iOS
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className={`absolute ${isRTL ? 'left-2' : 'right-2'} bottom-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md flex items-center justify-center transition-colors disabled:cursor-not-allowed`}
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>

            {/* Helpful Text */}
            <div className={`mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>
                {language === 'ar'
                  ? 'اضغط Enter للإرسال، Shift+Enter لسطر جديد'
                  : 'Press Enter to send, Shift+Enter for new line'
                }
              </span>
              <span>
                {inputValue.length}/500
              </span>
            </div>
          </form>

          {/* Voice Input Button */}
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            language={language}
            disabled={isProcessing}
            className="mb-2"
          />
        </div>
      </div>
    </div>
  );
};

export default NLPQueryInterface;