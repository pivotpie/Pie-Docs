import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { OCRTextPreviewProps, OCRTextChange, OCREditSession } from '@/types/domain/OCR';
import {
  startOCREditSession,
  updateOCREditSession,
  completeOCREditSession
} from '@/store/slices/documentsSlice';
import {
  segmentBilingualText,
  isRTLText,
  formatBilingualText,
  detectTextLanguage
} from '@/utils/ocr/languageDetection';

const OCRTextPreview: React.FC<OCRTextPreviewProps> = ({
  ocrResult,
  previewData,
  editMode = false,
  onTextEdit,
  onSave,
}) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(previewData.extractedText);
  const [showConfidenceColors, setShowConfidenceColors] = useState(true);
  const [showLanguageLabels, setShowLanguageLabels] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'formatted' | 'blocks'>('original');
  const [changes, setChanges] = useState<OCRTextChange[]>([]);
  const [editSession, setEditSession] = useState<OCREditSession | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const originalTextRef = useRef<string>(previewData.extractedText);

  // Generate UUID for edit session
  const generateSessionId = () => 'edit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  const startEditSession = useCallback(() => {
    const sessionId = generateSessionId();
    const newSession: OCREditSession = {
      id: sessionId,
      ocrResultId: ocrResult.id,
      originalText: previewData.extractedText,
      editedText: previewData.extractedText,
      changes: [],
      dateStarted: new Date().toISOString(),
      dateLastModified: new Date().toISOString(),
      isCompleted: false,
    };

    setEditSession(newSession);
    setIsEditing(true);
    dispatch(startOCREditSession(newSession));
  }, [ocrResult.id, previewData.extractedText, dispatch]);

  const saveChanges = useCallback(() => {
    if (!editSession) return;

    const finalText = editedText;

    // Create change record
    if (finalText !== originalTextRef.current) {
      const change: OCRTextChange = {
        id: `change-${Date.now()}`,
        blockId: 'full-text',
        originalText: originalTextRef.current,
        newText: finalText,
        changeType: 'correction',
        timestamp: new Date().toISOString(),
      };

      const updatedChanges = [...changes, change];
      setChanges(updatedChanges);
      onTextEdit?.(updatedChanges);
    }

    // Complete edit session
    dispatch(completeOCREditSession({
      sessionId: editSession.id,
      finalText
    }));

    setIsEditing(false);
    setEditSession(null);
    onSave?.(finalText);
  }, [editSession, editedText, changes, onTextEdit, onSave, dispatch]);

  const cancelEdit = useCallback(() => {
    setEditedText(originalTextRef.current);
    setIsEditing(false);
    setEditSession(null);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 75) return 'bg-yellow-100 text-yellow-800';
    if (confidence >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const highlightTextBlocks = (text: string) => {
    if (!showConfidenceColors || !previewData.highlightedBlocks.length) {
      return <span>{text}</span>;
    }

    return previewData.highlightedBlocks.map((block, index) => {
      const isRTL = isRTLText(block.text);
      return (
        <span
          key={block.id}
          className={`${getConfidenceColor(block.confidence)} px-1 rounded ${isRTL ? 'rtl' : 'ltr'}`}
          title={`Confidence: ${block.confidence.toFixed(1)}%, Language: ${block.language || 'auto'}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {block.text}
          {index < previewData.highlightedBlocks.length - 1 && ' '}
        </span>
      );
    });
  };

  const renderFormattedText = () => {
    if (!previewData.formattedText) return null;

    const segments = segmentBilingualText(previewData.formattedText);
    const formattedText = formatBilingualText(segments, {
      preserveOrder: true,
      addLanguageLabels: showLanguageLabels,
    });

    return (
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {formattedText.split('\n').map((line, index) => {
          const isRTL = isRTLText(line);
          return (
            <div
              key={index}
              className={`${isRTL ? 'text-right rtl' : 'text-left ltr'} py-1`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBlockView = () => {
    return (
      <div className="space-y-4">
        {previewData.highlightedBlocks.map((block) => {
          const isRTL = isRTLText(block.text);
          const detection = detectTextLanguage(block.text);

          return (
            <div
              key={block.id}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
            >
              <div className="flex justify-between items-center mb-2 text-xs text-gray-600">
                <span>Block {block.order}</span>
                <div className="space-x-2">
                  <span className={`px-2 py-1 rounded ${getConfidenceColor(block.confidence)}`}>
                    {block.confidence.toFixed(1)}%
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {detection.language === 'ar' ? 'Arabic' :
                     detection.language === 'en' ? 'English' :
                     detection.language === 'ar-en' ? 'Mixed' : 'Auto'}
                  </span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {block.type}
                  </span>
                </div>
              </div>
              <div
                className={`${isRTL ? 'text-right rtl' : 'text-left ltr'} font-mono text-sm`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {block.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Auto-save during editing
  useEffect(() => {
    if (isEditing && editSession) {
      const timeoutId = setTimeout(() => {
        dispatch(updateOCREditSession({
          sessionId: editSession.id,
          updates: { editedText }
        }));
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [editedText, isEditing, editSession, dispatch]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <span className="text-lg mr-2" role="img" aria-label="Text Preview">
            📄
          </span>
          <h3 className="text-sm font-medium text-gray-900">OCR Text Preview</h3>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="original">Original</option>
            <option value="formatted">Formatted</option>
            <option value="blocks">Block View</option>
          </select>

          {/* Options */}
          <button
            type="button"
            onClick={() => setShowConfidenceColors(!showConfidenceColors)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showConfidenceColors
                ? 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
          >
            Confidence Colors
          </button>

          <button
            type="button"
            onClick={() => setShowLanguageLabels(!showLanguageLabels)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showLanguageLabels
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-gray-100 text-gray-600 border-gray-300'
            }`}
          >
            Language Labels
          </button>

          {/* Edit Controls */}
          {editMode && !isEditing && (
            <button
              type="button"
              onClick={startEditSession}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ✏️ Edit
            </button>
          )}

          {isEditing && (
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={saveChanges}
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                ✅ Save
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 flex justify-between">
              <span>Edit mode active</span>
              <span>Auto-saving changes...</span>
            </div>
            <textarea
              ref={textAreaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Edit the extracted text..."
              dir={isRTLText(editedText) ? 'rtl' : 'ltr'}
            />
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Characters: {editedText.length}</span>
              <span>Changes: {changes.length}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quality Summary */}
            <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-4">
                <span>Overall Confidence: <strong>{previewData.confidence.overall.toFixed(1)}%</strong></span>
                <span>Language: <strong>
                  {ocrResult.language === 'ar' ? 'Arabic' :
                   ocrResult.language === 'en' ? 'English' :
                   ocrResult.language === 'ar-en' ? 'Arabic & English' : 'Auto-detected'}
                </strong></span>
                <span>Blocks: <strong>{previewData.highlightedBlocks.length}</strong></span>
              </div>
              <div className="text-gray-500">
                Processing time: {ocrResult.processingTime}s
              </div>
            </div>

            {/* Text Content */}
            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {viewMode === 'original' && (
                <div className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                  isRTLText(previewData.extractedText) ? 'text-right rtl' : 'text-left ltr'
                }`} dir={isRTLText(previewData.extractedText) ? 'rtl' : 'ltr'}>
                  {showConfidenceColors ?
                    highlightTextBlocks(previewData.extractedText) :
                    previewData.extractedText
                  }
                </div>
              )}

              {viewMode === 'formatted' && renderFormattedText()}
              {viewMode === 'blocks' && renderBlockView()}
            </div>

            {/* Export Options */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(previewData.extractedText)}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                📋 Copy Text
              </button>

              <button
                type="button"
                onClick={() => {
                  const formattedText = formatBilingualText(
                    segmentBilingualText(previewData.extractedText),
                    { groupByLanguage: true, addLanguageLabels: true }
                  );
                  navigator.clipboard.writeText(formattedText);
                }}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                🌐 Copy Formatted
              </button>

              <button
                type="button"
                onClick={() => {
                  const dataStr = JSON.stringify(ocrResult, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `ocr-result-${ocrResult.documentId}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                💾 Export JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit History */}
      {changes.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Edit History</h4>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {changes.map((change) => (
              <div key={change.id} className="text-xs text-gray-600 flex justify-between">
                <span className="capitalize">{change.changeType}</span>
                <span>{new Date(change.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRTextPreview;