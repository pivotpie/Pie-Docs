import React, { useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveConversation, selectNLPProcessing } from '@/store/slices/searchSlice';
import type { ConversationMessage } from '@/types/domain/Search';

interface ConversationHistoryProps {
  className?: string;
}

interface MessageComponentProps {
  message: ConversationMessage;
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isRTL = message.language === 'ar';

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessageContent = () => {
    // Simple markdown-like formatting for basic text styling
    const content = message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>');

    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
          }`}>
            {isUser ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
          } ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="text-sm leading-relaxed">
              {renderMessageContent()}
            </div>

            {/* Metadata for assistant messages */}
            {!isUser && message.metadata && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {message.metadata.confidence && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Confidence: {Math.round(message.metadata.confidence * 100)}%
                  </div>
                )}
                {message.metadata.entities && message.metadata.entities.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Entities: {message.metadata.entities.map(e => e.value).join(', ')}
                  </div>
                )}
                {message.metadata.sources && message.metadata.sources.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Sources: {message.metadata.sources.length} documents
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-6">
    <div className="flex flex-row max-w-[80%] space-x-3">
      {/* Assistant Avatar */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Typing Animation */}
      <div className="flex flex-col items-start">
        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ className = '' }) => {
  const activeConversation = useSelector(selectActiveConversation);
  const isProcessing = useSelector(selectNLPProcessing);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, isProcessing]);

  const messages = useMemo(() => {
    return activeConversation?.messages || [];
  }, [activeConversation?.messages]);

  const renderWelcomeMessage = () => {
    const language = activeConversation?.language || 'en';
    const isRTL = language === 'ar';

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        <h3 className={`text-xl font-semibold text-gray-900 dark:text-white mb-2 ${isRTL ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'مرحباً بك في المساعد الذكي' : 'Welcome to AI Assistant'}
        </h3>

        <p className={`text-gray-600 dark:text-gray-400 mb-6 max-w-md ${isRTL ? 'font-arabic text-right' : ''}`}>
          {language === 'ar'
            ? 'اسأل أي سؤال عن مستنداتك وسأقوم بالبحث والإجابة باستخدام المحتوى المتوفر'
            : 'Ask any question about your documents and I\'ll search and provide answers using your content'
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
          {(language === 'ar' ? [
            'ما هي آخر المستندات المضافة؟',
            'ابحث عن تقارير الشهر الماضي',
            'أظهر لي المستندات المهمة',
            'من كتب هذا المستند؟'
          ] : [
            'What are the latest documents added?',
            'Find reports from last month',
            'Show me important documents',
            'Who authored this document?'
          ]).map((example, index) => (
            <div
              key={index}
              className={`p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
              onClick={() => {
                // TODO: Implement example click handler
                console.log('Example clicked:', example);
              }}
            >
              {example}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? renderWelcomeMessage() : (
          <>
            {messages.map((message) => (
              <MessageComponent key={message.id} message={message} />
            ))}
            {isProcessing && <TypingIndicator />}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;