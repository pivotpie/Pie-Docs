import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SecureStorage from '@/utils/secureStorage';
import { useTheme } from '@/contexts/ThemeContext';

interface MetadataField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: (value: string) => string | null;
}

interface MetadataTemplate {
  id: string;
  name: string;
  fields: MetadataField[];
  category: string;
}

interface VoiceTranscription {
  isListening: boolean;
  transcript: string;
  confidence: number;
  isSupported: boolean;
}

interface MobileMetadataFormProps {
  onSubmit: (metadata: Record<string, string>) => void;
  onCancel: () => void;
  isVisible: boolean;
  initialData?: Record<string, string>;
  documentType?: string;
  barcode?: string;
}

const MobileMetadataForm: React.FC<MobileMetadataFormProps> = ({
  onSubmit,
  onCancel,
  isVisible,
  initialData = {},
  documentType = 'document',
  barcode
}) => {
  const { theme } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<MetadataTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentField, setCurrentField] = useState<string>('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  // Voice input state
  const [voiceTranscription, setVoiceTranscription] = useState<VoiceTranscription>({
    isListening: false,
    transcript: '',
    confidence: 0,
    isSupported: false
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [suggestionHistory, setSuggestionHistory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setVoiceTranscription(prev => ({
              ...prev,
              transcript: finalTranscript,
              confidence: confidence || 0,
              isListening: false
            }));

            // Apply transcript to current field
            if (currentField) {
              setFormData(prev => ({
                ...prev,
                [currentField]: finalTranscript.trim()
              }));
            }
          } else {
            interimTranscript += transcript;
            setVoiceTranscription(prev => ({
              ...prev,
              transcript: interimTranscript
            }));
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceTranscription(prev => ({
          ...prev,
          isListening: false
        }));
      };

      recognitionRef.current.onend = () => {
        setVoiceTranscription(prev => ({
          ...prev,
          isListening: false
        }));
      };

      setVoiceTranscription(prev => ({
        ...prev,
        isSupported: true
      }));
    }

    // Load metadata history for suggestions
    const initializeHistory = async () => {
      await loadMetadataHistory();
    };
    initializeHistory();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const loadMetadataHistory = async () => {
    try {
      const history = await SecureStorage.getItem('metadataHistory');
      if (history) {
        setSuggestionHistory(history);
      }
    } catch (error) {
      console.error('Failed to load metadata history:', error);
    }
  };

  const saveToHistory = async (fieldId: string, value: string) => {
    if (!value.trim()) return;

    const updatedHistory = { ...suggestionHistory };
    if (!updatedHistory[fieldId]) {
      updatedHistory[fieldId] = [];
    }

    // Add to beginning and limit to 10 items
    const fieldHistory = updatedHistory[fieldId];
    if (!fieldHistory.includes(value)) {
      fieldHistory.unshift(value);
      updatedHistory[fieldId] = fieldHistory.slice(0, 10);
    }

    setSuggestionHistory(updatedHistory);
    await SecureStorage.setItem('metadataHistory', updatedHistory);
  };

  const metadataTemplates: MetadataTemplate[] = [
    {
      id: 'invoice',
      name: 'Invoice',
      category: 'Financial',
      fields: [
        {
          id: 'vendor',
          label: 'Vendor Name',
          type: 'text',
          required: true,
          placeholder: 'Enter vendor name',
          validation: (value) => value.length < 2 ? 'Vendor name too short' : null
        },
        {
          id: 'invoiceNumber',
          label: 'Invoice Number',
          type: 'text',
          required: true,
          placeholder: 'INV-001',
          validation: (value) => !/^[A-Za-z0-9\-]+$/.test(value) ? 'Invalid invoice number format' : null
        },
        {
          id: 'amount',
          label: 'Amount',
          type: 'number',
          required: true,
          placeholder: '0.00'
        },
        {
          id: 'date',
          label: 'Invoice Date',
          type: 'date',
          required: true
        },
        {
          id: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: 'Additional notes'
        }
      ]
    },
    {
      id: 'receipt',
      name: 'Receipt',
      category: 'Financial',
      fields: [
        {
          id: 'merchant',
          label: 'Merchant',
          type: 'text',
          required: true,
          placeholder: 'Store name'
        },
        {
          id: 'amount',
          label: 'Total Amount',
          type: 'number',
          required: true,
          placeholder: '0.00'
        },
        {
          id: 'date',
          label: 'Purchase Date',
          type: 'date',
          required: true
        },
        {
          id: 'category',
          label: 'Category',
          type: 'select',
          required: false,
          options: ['Office Supplies', 'Travel', 'Meals', 'Equipment', 'Other']
        }
      ]
    },
    {
      id: 'contract',
      name: 'Contract',
      category: 'Legal',
      fields: [
        {
          id: 'title',
          label: 'Contract Title',
          type: 'text',
          required: true,
          placeholder: 'Contract name'
        },
        {
          id: 'parties',
          label: 'Parties Involved',
          type: 'textarea',
          required: true,
          placeholder: 'List all parties'
        },
        {
          id: 'startDate',
          label: 'Start Date',
          type: 'date',
          required: true
        },
        {
          id: 'endDate',
          label: 'End Date',
          type: 'date',
          required: false
        },
        {
          id: 'value',
          label: 'Contract Value',
          type: 'number',
          required: false,
          placeholder: '0.00'
        }
      ]
    },
    {
      id: 'general',
      name: 'General Document',
      category: 'General',
      fields: [
        {
          id: 'title',
          label: 'Document Title',
          type: 'text',
          required: true,
          placeholder: 'Enter document title'
        },
        {
          id: 'author',
          label: 'Author',
          type: 'text',
          required: false,
          placeholder: 'Document author'
        },
        {
          id: 'date',
          label: 'Document Date',
          type: 'date',
          required: false
        },
        {
          id: 'tags',
          label: 'Tags',
          type: 'text',
          required: false,
          placeholder: 'Comma-separated tags'
        },
        {
          id: 'notes',
          label: 'Notes',
          type: 'textarea',
          required: false,
          placeholder: 'Additional notes'
        }
      ]
    }
  ];

  const startVoiceInput = (fieldId: string) => {
    if (!voiceTranscription.isSupported || !recognitionRef.current) return;

    setCurrentField(fieldId);
    setVoiceTranscription(prev => ({
      ...prev,
      isListening: true,
      transcript: ''
    }));

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      setVoiceTranscription(prev => ({
        ...prev,
        isListening: false
      }));
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceTranscription(prev => ({
      ...prev,
      isListening: false
    }));
  };

  const validateField = (field: MetadataField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      return field.validation(value);
    }

    return null;
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }

    // Save to history for auto-completion
    if (value.trim()) {
      saveToHistory(fieldId, value);
    }
  };

  const handleSubmit = () => {
    if (!selectedTemplate) return;

    const newErrors: Record<string, string> = {};

    // Validate all fields
    selectedTemplate.fields.forEach(field => {
      const value = formData[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Add system metadata
    const finalData = {
      ...formData,
      template: selectedTemplate.id,
      barcode: barcode || '',
      timestamp: new Date().toISOString(),
      source: 'mobile'
    };

    onSubmit(finalData);
  };

  const getSuggestions = (fieldId: string): string[] => {
    return suggestionHistory[fieldId] || [];
  };

  const applyTemplate = (template: MetadataTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);

    // Pre-fill any matching initial data
    const newFormData = { ...initialData };
    setFormData(newFormData);
  };

  const renderField = (field: MetadataField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];
    const suggestions = getSuggestions(field.id);

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {/* Voice input button */}
          {voiceTranscription.isSupported && (field.type === 'text' || field.type === 'textarea') && (
            <button
              type="button"
              onClick={() => voiceTranscription.isListening ? stopVoiceInput() : startVoiceInput(field.id)}
              className={`p-2 rounded-full ${
                voiceTranscription.isListening && currentField === field.id
                  ? 'glass-panel text-red-400 border border-red-400/30'
                  : 'glass-panel text-white/60 border border-white/20'
              } hover:scale-105 transition-all duration-300`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>

        {/* Voice transcription indicator */}
        {voiceTranscription.isListening && currentField === field.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-panel border border-red-400/30 rounded-lg p-2 text-sm backdrop-blur-sm"
          >
            <div className="flex items-center text-red-400 mb-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-red-500 rounded-full mr-2"
              />
              Listening...
            </div>
            {voiceTranscription.transcript && (
              <div className={`${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>"{voiceTranscription.transcript}"</div>
            )}
          </motion.div>
        )}

        {/* Field input */}
        <div className="relative">
          {field.type === 'text' && (
            <div>
              <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className={`w-full px-4 py-3 text-lg glass-panel border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                  error ? 'border-red-400/50' : 'border-white/20'
                } ${theme === 'dark' ? 'text-white' : 'text-white'} placeholder-white/50`}
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />

              {/* Auto-completion suggestions */}
              {suggestions.length > 0 && value.length > 0 && (
                <div className="absolute z-10 w-full mt-1 glass-card border border-white/20 rounded-lg shadow-lg max-h-40 overflow-y-auto backdrop-blur-sm">
                  {suggestions
                    .filter(suggestion => suggestion.toLowerCase().includes(value.toLowerCase()))
                    .slice(0, 5)
                    .map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleFieldChange(field.id, suggestion)}
                        className={`w-full px-4 py-2 text-left hover:bg-white/10 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} transition-all duration-200`}
                      >
                        {suggestion}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {field.type === 'textarea' && (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={`w-full px-4 py-3 text-lg glass-panel border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none ${
                error ? 'border-red-400/50' : 'border-white/20'
              } ${theme === 'dark' ? 'text-white' : 'text-white'} placeholder-white/50`}
              style={{ fontSize: '16px' }}
            />
          )}

          {field.type === 'select' && (
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`w-full px-4 py-3 text-lg glass-panel border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                error ? 'border-red-400/50' : 'border-white/20'
              } ${theme === 'dark' ? 'text-white' : 'text-white'}`}
              style={{ fontSize: '16px' }}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}

          {field.type === 'date' && (
            <input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`w-full px-4 py-3 text-lg glass-panel border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                error ? 'border-red-400/50' : 'border-white/20'
              } ${theme === 'dark' ? 'text-white' : 'text-white'}`}
              style={{ fontSize: '16px' }}
            />
          )}

          {field.type === 'number' && (
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              step="0.01"
              className={`w-full px-4 py-3 text-lg glass-panel border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                error ? 'border-red-400/50' : 'border-white/20'
              } ${theme === 'dark' ? 'text-white' : 'text-white'} placeholder-white/50`}
              style={{ fontSize: '16px' }}
            />
          )}
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-red-600 text-sm"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
          className="modal-glass rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="modal-glass-header flex items-center justify-between p-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              {showTemplateSelector ? 'Select Template' : selectedTemplate?.name}
            </h3>
            <button
              onClick={onCancel}
              className={`${theme === 'dark' ? 'text-white/60' : 'text-white/60'} hover:text-white/80 transition-colors duration-200`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {showTemplateSelector ? (
              /* Template Selection */
              <div className="modal-glass-content p-4 space-y-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} mb-4`}>
                  Choose a template to quickly fill metadata for your document.
                </p>

                {barcode && (
                  <div className="glass-panel border border-blue-400/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-300">
                      <strong>Barcode:</strong> {barcode}
                    </p>
                  </div>
                )}

                <div className="grid gap-3">
                  {metadataTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="p-4 text-left glass-panel border border-white/20 rounded-lg hover:border-blue-400/50 hover:bg-white/10 hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{template.name}</h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{template.category}</p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'} mt-1`}>
                            {template.fields.length} fields
                          </p>
                        </div>
                        <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Metadata Form */
              <div className="modal-glass-content p-4 space-y-6">
                {/* Template change button */}
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change Template
                </button>

                {/* Form fields */}
                {selectedTemplate?.fields.map(renderField)}
              </div>
            )}
          </div>

          {/* Footer */}
          {!showTemplateSelector && (
            <div className="modal-glass-header p-4 border-t border-white/10 space-y-3">
              <button
                onClick={handleSubmit}
                className="w-full btn-glass py-3 px-4 rounded-lg font-medium hover:scale-105 transition-all duration-300"
              >
                Save Metadata
              </button>
              <button
                onClick={onCancel}
                className={`w-full glass-panel border border-white/20 py-3 px-4 rounded-lg font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileMetadataForm;