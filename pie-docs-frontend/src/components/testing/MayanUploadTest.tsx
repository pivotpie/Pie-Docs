import React, { useState } from 'react';
import { documentsService } from '@/services/api/documentsService';
import type { UploadProgress } from '@/types/domain/Upload';

const MayanUploadTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: number; label: string }>>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setUploadResult('');
    setUploadProgress(null);
  };

  const loadDocumentTypes = async () => {
    try {
      const types = await documentsService.getDocumentTypes();
      setDocumentTypes(types);
      setUploadResult('Document types loaded successfully: ' + types.map(t => t.label).join(', '));
    } catch (error) {
      setUploadResult('Failed to load document types: ' + (error as Error).message);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadResult('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadResult('');
    setUploadProgress(null);

    try {
      const result = await documentsService.uploadFile(
        selectedFile,
        {
          metadata: {
            description: 'Test upload from frontend',
            tags: ['test', 'frontend-upload'],
            author: 'Frontend Test',
          },
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (result.success) {
        setUploadResult(`Upload successful! Document ID: ${result.documentId}`);
      } else {
        setUploadResult(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      setUploadResult(`Upload error: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Mayan EDMS Upload Test</h2>

      <div className="mb-4">
        <button
          onClick={loadDocumentTypes}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Connection & Load Document Types
        </button>
      </div>

      {documentTypes.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Available Document Types:</h3>
          <ul className="text-sm text-gray-600">
            {documentTypes.map(type => (
              <li key={type.id}>{type.id}: {type.label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File to Upload:
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          className="w-full p-2 border border-gray-300 rounded"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        />
      </div>

      {selectedFile && (
        <div className="mb-4 text-sm text-gray-600">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading...' : 'Upload to Mayan EDMS'}
      </button>

      {uploadProgress && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">
            Upload Progress: {uploadProgress.percentage}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Speed: {(uploadProgress.speed / 1024).toFixed(1)} KB/s |
            Remaining: {uploadProgress.remainingTime.toFixed(0)}s
          </div>
        </div>
      )}

      {uploadResult && (
        <div className={`mt-4 p-3 rounded ${
          uploadResult.includes('successful') || uploadResult.includes('loaded successfully')
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {uploadResult}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <h4 className="font-semibold mb-2">Configuration:</h4>
        <p>Backend: http://147.93.102.178:8888/</p>
        <p>API Endpoint: /api/v4/documents/upload/</p>
        <p>Mock Data: {import.meta.env.VITE_USE_MOCK_DATA === 'true' ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
};

export default MayanUploadTest;