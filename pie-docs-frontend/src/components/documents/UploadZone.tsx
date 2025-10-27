import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/contexts/ThemeContext';
import { addFilesToQueue, selectIsUploading } from '@/store/slices/documentsSlice';
import { FileValidator } from '@/utils/validation/fileValidator';
import type { UploadZoneProps, UploadFile } from '@/types/domain/Upload';

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesAdded,
  onFolderAdded,
  disabled = false,
  accept,
  maxFileSize,
  maxFiles = 50,
  className = '',
  children,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const isUploading = useSelector(selectIsUploading);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const isDisabled = disabled || isUploading;

  const acceptAttribute = useMemo(() => {
    return accept || FileValidator.getAcceptAttribute();
  }, [accept]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDisabled) return;

    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, [isDisabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDisabled) return;

    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  }, [isDisabled, dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDisabled) return;

    e.dataTransfer.dropEffect = 'copy';
  }, [isDisabled]);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (maxFiles && fileArray.length > maxFiles) {
      console.warn(`Too many files selected. Maximum ${maxFiles} files allowed.`);
      return;
    }

    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending',
      lastModified: file.lastModified,
      retryCount: 0,
    }));

    // Validate files
    const validationResult = FileValidator.validateFiles(fileArray);

    if (!validationResult.isValid) {
      console.error('File validation failed:', validationResult.errors);
      return;
    }

    if (validationResult.warnings.length > 0) {
      console.warn('File validation warnings:', validationResult.warnings);
    }

    // Add files to queue
    dispatch(addFilesToQueue(uploadFiles));
    onFilesAdded(fileArray);
  }, [dispatch, maxFiles, onFilesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    setDragCounter(0);

    if (isDisabled) return;

    const { files, items } = e.dataTransfer;

    // Check if we're dealing with folders
    if (items && items.length > 0) {
      const hasDirectories = Array.from(items).some(item => item.webkitGetAsEntry()?.isDirectory);

      if (hasDirectories && onFolderAdded) {
        // Handle folder upload - this is a simplified version
        // Full implementation would recursively traverse directories
        console.log('Folder upload detected - implementation needed');
        return;
      }
    }

    processFiles(files);
  }, [isDisabled, processFiles, onFolderAdded]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input value to allow selecting the same files again
    if (e.target) {
      e.target.value = '';
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  }, [isDisabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isDisabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [isDisabled, handleClick]);

  const baseClasses = `
    relative glass-card
    border-2 border-dashed
    rounded-lg
    p-8
    text-center
    transition-all duration-300
    cursor-pointer
    focus:outline-none
    focus:ring-2 focus:ring-white/40
    min-h-[200px]
    flex flex-col items-center justify-center
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/40 hover:bg-white/20 hover:scale-[1.02]'}
    ${isDragOver ? 'border-white/60 bg-white/30 scale-105' : 'border-white/20'}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <>
      <div
        className={baseClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isDisabled ? -1 : 0}
        role="button"
        aria-label="Upload files by clicking or dragging and dropping"
        aria-disabled={isDisabled}
      >
        {children || (
          <>
            <div className="mb-4">
              <svg
                className={`mx-auto h-12 w-12 ${isDragOver ? (theme === 'dark' ? 'text-white' : 'text-white') : (theme === 'dark' ? 'text-white/60' : 'text-white/70')}`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <p className={`text-lg font-medium ${isDragOver ? (theme === 'dark' ? 'text-white' : 'text-white') : (theme === 'dark' ? 'text-white/90' : 'text-white/90')}`}>
                {isDragOver ? 'Drop files here' : 'Upload your documents'}
              </p>

              <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/80'}`}>
                {isDragOver
                  ? 'Release to upload'
                  : 'Drag and drop files here, or click to browse'
                }
              </p>

              <div className="flex flex-col items-center space-y-3">
                {/* File Type Icons */}
                <div className="flex items-center space-x-4">
                  {/* PDF */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Document base */}
                        <path d="M8 4h24l8 8v32a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#DC2626"/>
                        <path d="M32 4v8h8" fill="#B91C1C"/>
                        {/* PDF text */}
                        <text x="24" y="30" textAnchor="middle" className="fill-white text-xs font-bold">PDF</text>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">PDF</span>
                  </div>

                  {/* Word */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Document base */}
                        <path d="M8 4h24l8 8v32a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#2563EB"/>
                        <path d="M32 4v8h8" fill="#1D4ED8"/>
                        {/* W symbol */}
                        <text x="24" y="32" textAnchor="middle" className="fill-white text-lg font-bold">W</text>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">Word</span>
                  </div>

                  {/* Excel */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Document base */}
                        <path d="M8 4h24l8 8v32a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#059669"/>
                        <path d="M32 4v8h8" fill="#047857"/>
                        {/* Grid pattern */}
                        <rect x="12" y="16" width="24" height="20" fill="#10B981" rx="1"/>
                        <path d="M12 20h24M12 24h24M12 28h24M12 32h24M16 16v20M20 16v20M24 16v20M28 16v20M32 16v20" stroke="#047857" strokeWidth="0.5"/>
                        <text x="24" y="30" textAnchor="middle" className="fill-white text-xs font-bold">X</text>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">Excel</span>
                  </div>

                  {/* PowerPoint */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Document base */}
                        <path d="M8 4h24l8 8v32a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#EA580C"/>
                        <path d="M32 4v8h8" fill="#C2410C"/>
                        {/* Slide elements */}
                        <rect x="12" y="16" width="24" height="16" fill="#FB923C" rx="1"/>
                        <rect x="14" y="18" width="20" height="3" fill="#FED7AA" rx="0.5"/>
                        <rect x="14" y="22" width="12" height="2" fill="#FED7AA" rx="0.5"/>
                        <text x="24" y="30" textAnchor="middle" className="fill-white text-xs font-bold">P</text>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">PowerPoint</span>
                  </div>

                  {/* Images */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Image frame */}
                        <rect x="6" y="8" width="36" height="32" fill="#7C3AED" rx="2"/>
                        <rect x="8" y="10" width="32" height="28" fill="#A855F7" rx="1"/>
                        {/* Mountain landscape */}
                        <path d="M8 30l8-8 6 6 8-10 12 12v8H8z" fill="#DDD6FE"/>
                        {/* Sun */}
                        <circle cx="35" cy="15" r="3" fill="#FEF3C7"/>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">Images</span>
                  </div>

                  {/* Audio */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Audio waves background */}
                        <circle cx="24" cy="24" r="20" fill="#EC4899"/>
                        <circle cx="24" cy="24" r="16" fill="#F472B6"/>
                        {/* Sound waves */}
                        <path d="M18 18v12m3-8v4m3-10v16m3-12v8m3-6v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">Audio</span>
                  </div>

                  {/* Video */}
                  <div className="flex flex-col items-center group">
                    <div className="relative">
                      <svg className="h-12 w-12 drop-shadow-lg" viewBox="0 0 48 48" fill="none">
                        {/* Video player */}
                        <rect x="4" y="12" width="40" height="24" fill="#4F46E5" rx="3"/>
                        <rect x="6" y="14" width="36" height="20" fill="#6366F1" rx="2"/>
                        {/* Play button */}
                        <circle cx="24" cy="24" r="6" fill="white" fillOpacity="0.9"/>
                        <path d="M21 20l8 4-8 4z" fill="#4F46E5"/>
                      </svg>
                    </div>
                    <span className="text-xs text-white/80 mt-1 group-hover:text-white transition-colors">Video</span>
                  </div>
                </div>

                {/* File limitations */}
                <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/70'} flex items-center space-x-2`}>
                  {maxFileSize && (
                    <>
                      <span>Max {FileValidator.formatFileSize(maxFileSize)} per file</span>
                      {maxFiles && <span>•</span>}
                    </>
                  )}
                  {maxFiles && <span>Up to {maxFiles} files</span>}
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="absolute inset-0 glass backdrop-blur-md flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${theme === 'dark' ? 'border-white/60' : 'border-white/70'}`}></div>
                  <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Uploading...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptAttribute}
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {onFolderAdded && (
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default UploadZone;