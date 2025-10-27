import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface DocumentPreviewModalProps {
  documentId: string;
  onClose: () => void;
  searchQuery?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  documentId,
  onClose,
  searchQuery,
}) => {
  const { theme } = useTheme();
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom modal-glass px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all hover:scale-105 sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Document Preview</h3>
            <button
              onClick={onClose}
              className={`${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-gray-400 hover:text-gray-600'} hover:scale-110 transition-all duration-300`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-center py-12">
            <svg className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h3 className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Document Preview</h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
              Real-time document preview will be implemented in Task 7.
            </p>
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'}`}>
              Document ID: {documentId}
              {searchQuery && <><br />Search Query: "{searchQuery}"</>}
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className={`btn-glass px-4 py-2 text-sm font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}
            >
              Close
            </button>
            <button
              disabled
              className="btn-glass px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            >
              Open Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;