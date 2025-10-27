import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  DocumentFolder,
  FolderCreationRequest,
  SmartFolderCriteria,
  DocumentType,
  DocumentStatus
} from '@/types/domain/Document';

const folderCreationSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255, 'Folder name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['regular', 'smart'] as const),
  color: z.string().optional(),
  icon: z.string().optional(),
  autoRefresh: z.boolean().default(false),
});

type FormData = z.infer<typeof folderCreationSchema>;

interface SmartCriteriaFormData {
  documentTypes: DocumentType[];
  tags: string[];
  authors: string[];
  status: DocumentStatus[];
  dateRangeStart: string;
  dateRangeEnd: string;
  sizeRangeMin: string;
  sizeRangeMax: string;
  contentKeywords: string;
}

interface FolderCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: FolderCreationRequest) => Promise<void>;
  parentFolder?: DocumentFolder | null;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' },
];

const FOLDER_ICONS = [
  '📁', '📂', '🗂️', '📋', '📊', '📈', '📉', '🗃️',
  '📝', '📄', '📑', '📒', '📓', '📔', '📕', '📗',
  '📘', '📙', '📚', '🗄️', '🔍', '⭐', '🔥', '💼',
];

const DOCUMENT_TYPES: DocumentType[] = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'html', 'image', 'video', 'audio', 'other'];
const DOCUMENT_STATUSES: DocumentStatus[] = ['draft', 'published', 'archived', 'processing', 'failed'];

const FolderCreationDialog: React.FC<FolderCreationDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parentFolder,
}) => {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [smartCriteria, setSmartCriteria] = useState<SmartCriteriaFormData>({
    documentTypes: [],
    tags: [],
    authors: [],
    status: [],
    dateRangeStart: '',
    dateRangeEnd: '',
    sizeRangeMin: '',
    sizeRangeMax: '',
    contentKeywords: '',
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(folderCreationSchema),
    defaultValues: {
      type: 'regular',
      autoRefresh: false,
    },
  });

  const folderType = watch('type');

  const handleClose = useCallback(() => {
    reset();
    setSmartCriteria({
      documentTypes: [],
      tags: [],
      authors: [],
      status: [],
      dateRangeStart: '',
      dateRangeEnd: '',
      sizeRangeMin: '',
      sizeRangeMax: '',
      contentKeywords: '',
    });
    onClose();
  }, [reset, onClose]);

  const onFormSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const request: FolderCreationRequest = {
        name: data.name,
        description: data.description,
        parentId: parentFolder?.id,
        type: data.type,
        color: data.color,
        icon: data.icon,
        autoRefresh: data.autoRefresh,
      };

      // Add smart criteria if it's a smart folder
      if (data.type === 'smart') {
        const criteria: SmartFolderCriteria = {};

        if (smartCriteria.documentTypes.length > 0) {
          criteria.documentTypes = smartCriteria.documentTypes;
        }
        if (smartCriteria.tags.length > 0) {
          criteria.tags = smartCriteria.tags;
        }
        if (smartCriteria.authors.length > 0) {
          criteria.authors = smartCriteria.authors;
        }
        if (smartCriteria.status.length > 0) {
          criteria.status = smartCriteria.status;
        }
        if (smartCriteria.dateRangeStart && smartCriteria.dateRangeEnd) {
          criteria.dateRange = {
            start: smartCriteria.dateRangeStart,
            end: smartCriteria.dateRangeEnd,
          };
        }
        if (smartCriteria.sizeRangeMin && smartCriteria.sizeRangeMax) {
          criteria.sizeRange = {
            min: parseInt(smartCriteria.sizeRangeMin) * 1024 * 1024, // Convert MB to bytes
            max: parseInt(smartCriteria.sizeRangeMax) * 1024 * 1024,
          };
        }
        if (smartCriteria.contentKeywords) {
          criteria.contentKeywords = smartCriteria.contentKeywords.split(',').map(k => k.trim()).filter(Boolean);
        }

        request.smartCriteria = criteria;
      }

      await onSubmit(request);
      handleClose();
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [smartCriteria, parentFolder, onSubmit, handleClose]);

  const handleSmartCriteriaChange = useCallback((field: keyof SmartCriteriaFormData, value: unknown) => {
    setSmartCriteria(prev => ({ ...prev, [field]: value }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity z-[9998]" onClick={handleClose} />

      <div className="modal-glass rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto hover:scale-105 transition-all duration-300 relative z-[9999]">
        <div className="modal-glass-header p-6">
          <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
            Create New Folder
          </h2>
          <button
            onClick={handleClose}
            className={`${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} hover:scale-110 transition-all duration-300`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="modal-glass-content p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Basic Information</h3>

            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                Folder Name *
              </label>
              <input
                {...register('name')}
                type="text"
                className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                placeholder="Enter folder name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                placeholder="Optional description"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
              )}
            </div>

            {parentFolder && (
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                  Parent Folder
                </label>
                <div className="px-3 py-2 glass-panel rounded-md border border-white/10">
                  <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                    {parentFolder.path}/{parentFolder.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Folder Type */}
          <div className="space-y-4">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Folder Type</h3>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-4 glass-panel border border-white/20 rounded-lg cursor-pointer hover:scale-105 hover:border-white/30 transition-all duration-300">
                <input
                  {...register('type')}
                  type="radio"
                  value="regular"
                  className="mr-3 accent-blue-400"
                />
                <div>
                  <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Regular Folder</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                    Standard folder for manual organization
                  </div>
                </div>
              </label>

              <label className="flex items-center p-4 glass-panel border border-white/20 rounded-lg cursor-pointer hover:scale-105 hover:border-white/30 transition-all duration-300">
                <input
                  {...register('type')}
                  type="radio"
                  value="smart"
                  className="mr-3 accent-blue-400"
                />
                <div>
                  <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Smart Folder</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>
                    Auto-populated based on criteria
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Smart Folder Criteria */}
          {folderType === 'smart' && (
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Smart Folder Criteria</h3>

              {/* Document Types */}
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>
                  Document Types
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DOCUMENT_TYPES.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={smartCriteria.documentTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSmartCriteriaChange('documentTypes', [...smartCriteria.documentTypes, type]);
                          } else {
                            handleSmartCriteriaChange('documentTypes', smartCriteria.documentTypes.filter(t => t !== type));
                          }
                        }}
                        className="mr-2 rounded accent-blue-400"
                      />
                      <span className={`text-sm uppercase ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Document Status */}
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>
                  Document Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DOCUMENT_STATUSES.map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={smartCriteria.status.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSmartCriteriaChange('status', [...smartCriteria.status, status]);
                          } else {
                            handleSmartCriteriaChange('status', smartCriteria.status.filter(s => s !== status));
                          }
                        }}
                        className="mr-2 rounded accent-blue-400"
                      />
                      <span className={`text-sm capitalize ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={smartCriteria.dateRangeStart}
                    onChange={(e) => handleSmartCriteriaChange('dateRangeStart', e.target.value)}
                    className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={smartCriteria.dateRangeEnd}
                    onChange={(e) => handleSmartCriteriaChange('dateRangeEnd', e.target.value)}
                    className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white' : 'text-white'}`}
                  />
                </div>
              </div>

              {/* Size Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                    Min Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={smartCriteria.sizeRangeMin}
                    onChange={(e) => handleSmartCriteriaChange('sizeRangeMin', e.target.value)}
                    className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                    Max Size (MB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={smartCriteria.sizeRangeMax}
                    onChange={(e) => handleSmartCriteriaChange('sizeRangeMax', e.target.value)}
                    className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Content Keywords */}
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-1`}>
                  Content Keywords
                </label>
                <input
                  type="text"
                  value={smartCriteria.contentKeywords}
                  onChange={(e) => handleSmartCriteriaChange('contentKeywords', e.target.value)}
                  className={`w-full px-3 py-2 glass-panel border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-white placeholder-white/50'}`}
                  placeholder="Invoice, Contract, Report"
                />
                <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/60'}`}>
                  Comma-separated keywords to search in document content
                </p>
              </div>

              {/* Auto Refresh */}
              <label className="flex items-center">
                <input
                  {...register('autoRefresh')}
                  type="checkbox"
                  className="mr-2 rounded accent-blue-400"
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                  Auto-refresh folder contents when documents change
                </span>
              </label>
            </div>
          )}

          {/* Appearance */}
          <div className="space-y-4">
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Appearance</h3>

            {/* Color Selection */}
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>
                Folder Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setValue('color', color.value)}
                    className="w-8 h-8 rounded-full border-2 border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:scale-110 transition-all duration-300"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'} mb-2`}>
                Folder Icon
              </label>
              <div className="grid grid-cols-8 gap-2">
                {FOLDER_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setValue('icon', icon)}
                    className="w-8 h-8 flex items-center justify-center glass-panel border border-white/20 rounded hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className={`btn-glass px-4 py-2 text-sm font-medium hover:scale-105 transition-all duration-300 ${theme === 'dark' ? 'text-white/90 hover:text-white' : 'text-white/90 hover:text-white'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-glass px-4 py-2 text-sm font-medium text-blue-300 hover:text-blue-200 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderCreationDialog;