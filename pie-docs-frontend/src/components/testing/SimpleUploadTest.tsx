import React, { useState } from 'react';

interface UploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

const SimpleUploadTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>('');
  const [documentList, setDocumentList] = useState<any[]>([]);

  const API_BASE_URL = 'http://147.93.102.178:8888/api/v4';
  const USERNAME = 'Pivotpie';
  const PASSWORD = 'WelcomePie@2025x';

  const getAuthHeaders = () => {
    const credentials = btoa(`${USERNAME}:${PASSWORD}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
    };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setUploadResult('');
  };

  const testConnection = async () => {
    try {
      setUploadResult('Testing connection...');

      // Test basic API connectivity
      const response = await fetch(`${API_BASE_URL}/document_types/`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUploadResult(`✅ Connection successful! Found ${data.results?.length || data.length || 0} document types.`);
        return true;
      } else {
        setUploadResult(`❌ Connection failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      setUploadResult(`❌ Connection error: ${(error as Error).message}`);
      return false;
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadResult('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadResult('');

    try {
      // Step 1: Get document types
      const typesResponse = await fetch(`${API_BASE_URL}/document_types/`, {
        headers: getAuthHeaders(),
      });

      if (!typesResponse.ok) {
        throw new Error(`Failed to get document types: ${typesResponse.statusText}`);
      }

      const typesData = await typesResponse.json();
      const documentTypes = typesData.results || typesData;

      if (!documentTypes || documentTypes.length === 0) {
        throw new Error('No document types available');
      }

      const documentTypeId = documentTypes[0].id;
      setUploadResult(`📁 Using document type: ${documentTypes[0].label} (ID: ${documentTypeId})`);

      // Step 2: Upload document
      const formData = new FormData();
      formData.append('document_type_id', documentTypeId.toString());
      formData.append('file', selectedFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/documents/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeaders()['Authorization'], // Only auth header, let browser set content-type for FormData
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}\n${errorText}`);
      }

      const result = await uploadResponse.json();
      const documentId = result.id || result.pk;

      setUploadResult(`✅ Upload successful!\nDocument ID: ${documentId}\nFile: ${selectedFile.name}\nSize: ${(selectedFile.size / 1024).toFixed(1)} KB`);

      // Step 3: Verify the document exists
      if (documentId) {
        await verifyDocument(documentId);
      }

    } catch (error) {
      setUploadResult(`❌ Upload failed: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const verifyDocument = async (documentId: string) => {
    try {
      setUploadResult(prev => prev + '\n\n🔍 Verifying document...');

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const document = await response.json();
        setUploadResult(prev => prev + `\n✅ Document verified!\nName: ${document.label || document.name}\nType: ${document.document_type?.label || 'Unknown'}\nCreated: ${document.datetime_created}`);
      } else {
        setUploadResult(prev => prev + `\n❌ Document verification failed: ${response.statusText}`);
      }
    } catch (error) {
      setUploadResult(prev => prev + `\n❌ Verification error: ${(error as Error).message}`);
    }
  };

  const listRecentDocuments = async () => {
    try {
      setUploadResult('📋 Fetching recent documents...');

      const response = await fetch(`${API_BASE_URL}/documents/?ordering=-datetime_created&page_size=10`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const documents = data.results || data;
        setDocumentList(documents);
        setUploadResult(`📋 Found ${documents.length} recent documents`);
      } else {
        setUploadResult(`❌ Failed to fetch documents: ${response.statusText}`);
      }
    } catch (error) {
      setUploadResult(`❌ Error fetching documents: ${(error as Error).message}`);
    }
  };

  const downloadDocument = async (documentId: string, documentLabel: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/files/`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const filesData = await response.json();
        const files = filesData.results || filesData;

        if (files.length > 0) {
          const fileId = files[0].id;
          const downloadUrl = `${API_BASE_URL}/documents/${documentId}/files/${fileId}/download/`;

          // Open download in new tab
          window.open(downloadUrl, '_blank');
          setUploadResult(prev => prev + `\n📥 Download initiated for: ${documentLabel}`);
        } else {
          setUploadResult(prev => prev + `\n❌ No files found for document: ${documentLabel}`);
        }
      }
    } catch (error) {
      setUploadResult(prev => prev + `\n❌ Download error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Simple Mayan EDMS Upload Test</h2>

      <div className="space-y-4">
        {/* Connection Test */}
        <button
          onClick={testConnection}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Connection
        </button>

        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File:
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={uploadFile}
          disabled={!selectedFile || isUploading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>

        {/* List Documents */}
        <button
          onClick={listRecentDocuments}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          List Recent Documents
        </button>

        {/* Result Display */}
        {uploadResult && (
          <div className="p-4 bg-gray-100 rounded border whitespace-pre-wrap text-sm">
            {uploadResult}
          </div>
        )}

        {/* Document List */}
        {documentList.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recent Documents:</h3>
            <div className="space-y-2">
              {documentList.map((doc) => (
                <div key={doc.id} className="p-3 border rounded bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{doc.label || `Document ${doc.id}`}</div>
                    <div className="text-sm text-gray-600">
                      Created: {new Date(doc.datetime_created).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(doc.id, doc.label || `Document ${doc.id}`)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <h4 className="font-semibold mb-2">Configuration:</h4>
          <p>Backend: {API_BASE_URL}</p>
          <p>Upload endpoint: /documents/upload/</p>
          <p>⚠️ Update USERNAME and PASSWORD in the component code</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleUploadTest;