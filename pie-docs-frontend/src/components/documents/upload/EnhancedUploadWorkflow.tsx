import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { documentsService } from '@/services/api/documentsService';

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  metadata: {
    category?: string;
    documentNumber?: string;
  };
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface MetadataType {
  id: number;
  label: string;
  name: string;
}

interface EnhancedUploadWorkflowProps {
  onUploadComplete?: (documents: any[]) => void;
  className?: string;
}

const EnhancedUploadWorkflow: React.FC<EnhancedUploadWorkflowProps> = ({
  onUploadComplete,
  className = ''
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [metadataTypes, setMetadataTypes] = useState<MetadataType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'metadata' | 'processing'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load metadata types on component mount
  React.useEffect(() => {
    loadMetadataTypes();
  }, []);

  const loadMetadataTypes = async () => {
    try {
      console.log('Loading metadata types...');
      const types = await documentsService.getMetadataTypes();
      console.log('Metadata types loaded:', types);
      setMetadataTypes(types);
    } catch (error) {
      console.error('Failed to load metadata types:', error);
    }
  };

  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    const newFiles: FileWithPreview[] = [];

    for (const file of acceptedFiles) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = await generatePreview(file);

      newFiles.push({
        id,
        file,
        preview,
        metadata: {},
        status: 'pending',
        progress: 0
      });
    }

    console.log('New files created:', newFiles);
    setFiles(prev => [...prev, ...newFiles]);

    if (newFiles.length > 0) {
      console.log('Moving to preview step');
      setStep('preview');
      setSelectedFileId(newFiles[0].id);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setSelectedFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const updateFileMetadata = (fileId: string, metadata: Partial<FileWithPreview['metadata']>) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, metadata: { ...f.metadata, ...metadata } }
        : f
    ));
  };

  const selectedFile = files.find(f => f.id === selectedFileId);

  const allMetadataComplete = files.every(f =>
    f.metadata.category && f.metadata.documentNumber
  );

  const processAllFiles = async () => {
    if (!allMetadataComplete) {
      console.log('Not all metadata complete');
      return;
    }

    console.log('Starting file processing...');
    setIsProcessing(true);
    setStep('processing');

    const uploadedDocuments = [];

    for (const fileData of files) {
      try {
        console.log('Processing file:', fileData.file.name);

        // Update status
        setFiles(prev => prev.map(f =>
          f.id === fileData.id
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        ));

        const result = await documentsService.uploadFile(
          fileData.file,
          {
            metadata: {
              category: fileData.metadata.category,
              documentNumber: fileData.metadata.documentNumber,
              description: `Category: ${fileData.metadata.category}, Document Number: ${fileData.metadata.documentNumber}`
            }
          },
          (progress) => {
            console.log('Upload progress:', progress.percentage);
            setFiles(prev => prev.map(f =>
              f.id === fileData.id
                ? { ...f, progress: progress.percentage }
                : f
            ));
          }
        );

        console.log('Upload result:', result);

        if (result.success) {
          setFiles(prev => prev.map(f =>
            f.id === fileData.id
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          ));
          uploadedDocuments.push(result);
        } else {
          setFiles(prev => prev.map(f =>
            f.id === fileData.id
              ? { ...f, status: 'error' as const, error: result.error }
              : f
          ));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === fileData.id
            ? { ...f, status: 'error' as const, error: (error as Error).message }
            : f
        ));
      }
    }

    setIsProcessing(false);
    console.log('All files processed. Uploaded documents:', uploadedDocuments);

    if (onUploadComplete) {
      onUploadComplete(uploadedDocuments);
    }

    // Reset after successful upload
    setTimeout(() => {
      setFiles([]);
      setStep('upload');
      setSelectedFileId(null);
    }, 2000);
  };

  const renderUploadStep = () => (
    <div className="text-center">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Upload Documents'}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Supports PDF, DOC, DOCX, images, and text files
        </p>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File List Sidebar */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Files ({files.length})
        </h3>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFileId === file.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFileId(file.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-2">
        {selectedFile && (
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <button
                onClick={() => setStep('metadata')}
                disabled={files.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Metadata
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              {selectedFile.preview ? (
                <img
                  src={selectedFile.preview}
                  alt={selectedFile.file.name}
                  className="max-w-full max-h-[400px] object-contain"
                />
              ) : (
                <div className="text-center">
                  <DocumentIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedFile.file.type || 'Unknown type'} • {(selectedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMetadataStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File List */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Files ({files.length})
        </h3>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedFileId === file.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedFileId(file.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DocumentIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {file.metadata.category && file.metadata.documentNumber ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {file.metadata.category && file.metadata.documentNumber ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata Form */}
      <div className="lg:col-span-2">
        {selectedFile && (
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Metadata for {selectedFile.file.name}
              </h3>
              <button
                onClick={processAllFiles}
                disabled={!allMetadataComplete || isProcessing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                Process All Files
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={selectedFile.metadata.category || ''}
                  onChange={(e) => updateFileMetadata(selectedFile.id, { category: e.target.value })}
                  placeholder="Enter document category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Number *
                </label>
                <input
                  type="text"
                  value={selectedFile.metadata.documentNumber || ''}
                  onChange={(e) => updateFileMetadata(selectedFile.id, { documentNumber: e.target.value })}
                  placeholder="Enter document number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">File Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Name: {selectedFile.file.name}</p>
                  <p>Size: {(selectedFile.file.size / 1024).toFixed(1)} KB</p>
                  <p>Type: {selectedFile.file.type || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Processing Documents
        </h3>
        <p className="text-sm text-gray-600">
          Uploading files to Mayan EDMS with metadata...
        </p>
      </div>

      <div className="space-y-4">
        {files.map((file) => (
          <div key={file.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <DocumentIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {file.file.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {file.status === 'success' && (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                )}
                {file.status === 'error' && (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {file.status === 'uploading' && `${file.progress}%`}
                  {file.status === 'success' && 'Complete'}
                  {file.status === 'error' && 'Failed'}
                </span>
              </div>
            </div>

            {file.status === 'uploading' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            )}

            {file.error && (
              <p className="text-sm text-red-600 mt-2">{file.error}</p>
            )}

            <div className="text-xs text-gray-500 mt-2">
              Category: {file.metadata.category} | Document Number: {file.metadata.documentNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { key: 'upload', label: 'Upload' },
          { key: 'preview', label: 'Preview' },
          { key: 'metadata', label: 'Metadata' },
          { key: 'processing', label: 'Process' }
        ].map((stepInfo, index) => (
          <div key={stepInfo.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepInfo.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900">
              {stepInfo.label}
            </span>
            {index < 3 && (
              <ArrowRightIcon className="mx-4 h-4 w-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === 'upload' && renderUploadStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'metadata' && renderMetadataStep()}
        {step === 'processing' && renderProcessingStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={() => {
            if (step === 'preview') setStep('upload');
            if (step === 'metadata') setStep('preview');
          }}
          disabled={step === 'upload' || step === 'processing'}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
        >
          Back
        </button>

        {step === 'upload' && files.length > 0 && (
          <button
            onClick={() => setStep('preview')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedUploadWorkflow;