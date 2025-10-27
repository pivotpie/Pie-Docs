import React, { useState } from 'react';
import { documentsService } from '@/services/api/documentsService';

const MetadataValidationTest: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testMetadataWorkflow = async () => {
    setLoading(true);
    setResults('Testing metadata workflow...\n');

    try {
      // Create a test file
      const testContent = 'This is a test document for metadata validation';
      const testFile = new File([testContent], 'test-metadata-document.txt', {
        type: 'text/plain',
      });

      setResults(prev => prev + 'Created test file\n');

      // Upload file with metadata
      const uploadResult = await documentsService.uploadFile(
        testFile,
        {
          metadata: {
            category: 'Test Category',
            documentNumber: 'TEST-001',
            description: 'Test document for metadata validation',
          },
        },
        (progress) => {
          setResults(prev => prev + `Upload progress: ${progress.percentage}%\n`);
        }
      );

      setResults(prev => prev + `Upload result: ${JSON.stringify(uploadResult, null, 2)}\n\n`);

      if (uploadResult.success && uploadResult.documentId) {
        // Verify metadata was attached
        setResults(prev => prev + 'Verifying metadata attachment...\n');

        // Wait a moment for metadata to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const API_BASE_URL = 'http://147.93.102.178:8888/api/v4';
        const MAYAN_USERNAME = 'Pivotpie';
        const MAYAN_PASSWORD = 'WelcomePie@2025x';
        const credentials = btoa(`${MAYAN_USERNAME}:${MAYAN_PASSWORD}`);

        const metadataResponse = await fetch(`${API_BASE_URL}/documents/${uploadResult.documentId}/metadata/`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
          },
        });

        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json();
          setResults(prev => prev + `Document metadata: ${JSON.stringify(metadataData, null, 2)}\n\n`);

          // Check if values are properly set
          const categoryEntry = metadataData.results?.find((entry: any) =>
            entry.metadata_type.name === 'Category'
          );
          const docNumberEntry = metadataData.results?.find((entry: any) =>
            entry.metadata_type.name === 'Document Number'
          );

          setResults(prev => prev + `Category value: ${categoryEntry?.value || 'NULL'}\n`);
          setResults(prev => prev + `Document Number value: ${docNumberEntry?.value || 'NULL'}\n\n`);

          if (categoryEntry?.value === 'Test Category' && docNumberEntry?.value === 'TEST-001') {
            setResults(prev => prev + '✅ SUCCESS: Metadata was properly attached!\n');
          } else {
            setResults(prev => prev + '❌ FAILED: Metadata values are incorrect or missing\n');
          }
        } else {
          setResults(prev => prev + `Failed to fetch metadata: ${metadataResponse.status}\n`);
        }
      } else {
        setResults(prev => prev + '❌ Upload failed, cannot verify metadata\n');
      }

    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Metadata Validation Test</h2>
      <p className="text-gray-600 mb-4">
        This test uploads a document with metadata and verifies it's properly attached in Mayan EDMS.
      </p>

      <button
        onClick={testMetadataWorkflow}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Metadata Workflow'}
      </button>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap max-h-96">
          {results || 'Click "Test Metadata Workflow" to start testing...'}
        </pre>
      </div>
    </div>
  );
};

export default MetadataValidationTest;