import React, { useState } from 'react';

const MetadataTest: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://147.93.102.178:8888/api/v4';
  const MAYAN_USERNAME = 'Pivotpie';
  const MAYAN_PASSWORD = 'WelcomePie@2025x';

  const getAuthHeaders = () => {
    const credentials = btoa(`${MAYAN_USERNAME}:${MAYAN_PASSWORD}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  };

  const testMetadataTypes = async () => {
    setLoading(true);
    setResults('Testing metadata types...\n');

    try {
      // Step 1: Get metadata types
      const metadataTypesResponse = await fetch(`${API_BASE_URL}/metadata_types/`, {
        headers: getAuthHeaders(),
      });

      const metadataTypesData = await metadataTypesResponse.json();
      setResults(prev => prev + `Metadata Types Response: ${JSON.stringify(metadataTypesData, null, 2)}\n\n`);

      // Step 2: Get a test document ID
      const documentsResponse = await fetch(`${API_BASE_URL}/documents/?page_size=1`, {
        headers: getAuthHeaders(),
      });

      const documentsData = await documentsResponse.json();
      setResults(prev => prev + `Documents Response: ${JSON.stringify(documentsData, null, 2)}\n\n`);

      if (documentsData.results && documentsData.results.length > 0) {
        const testDocumentId = documentsData.results[0].id;
        setResults(prev => prev + `Using test document ID: ${testDocumentId}\n\n`);

        // Step 3: Try to add metadata to the document
        if (metadataTypesData.results && metadataTypesData.results.length > 0) {
          const firstMetadataType = metadataTypesData.results[0];
          setResults(prev => prev + `Testing with metadata type: ${JSON.stringify(firstMetadataType, null, 2)}\n\n`);

          const metadataPayload = {
            metadata_type: firstMetadataType.id,
            value: 'Test Category Value'
          };

          setResults(prev => prev + `Payload to send: ${JSON.stringify(metadataPayload, null, 2)}\n\n`);

          const addMetadataResponse = await fetch(`${API_BASE_URL}/documents/${testDocumentId}/metadata/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(metadataPayload),
          });

          const responseText = await addMetadataResponse.text();
          setResults(prev => prev + `Add Metadata Response Status: ${addMetadataResponse.status}\n`);
          setResults(prev => prev + `Add Metadata Response: ${responseText}\n\n`);

          // Step 4: Get the document's metadata to verify
          const docMetadataResponse = await fetch(`${API_BASE_URL}/documents/${testDocumentId}/metadata/`, {
            headers: getAuthHeaders(),
          });

          const docMetadataData = await docMetadataResponse.json();
          setResults(prev => prev + `Document Metadata: ${JSON.stringify(docMetadataData, null, 2)}\n\n`);
        }
      }

    } catch (error) {
      setResults(prev => prev + `Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Metadata API Test</h2>

      <button
        onClick={testMetadataTypes}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Metadata API'}
      </button>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Results:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap max-h-96">
          {results || 'Click "Test Metadata API" to start testing...'}
        </pre>
      </div>
    </div>
  );
};

export default MetadataTest;