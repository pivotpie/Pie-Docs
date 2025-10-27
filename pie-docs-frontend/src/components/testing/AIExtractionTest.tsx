import React, { useState } from 'react';
import { metadataExtractionService } from '@/services/ai/metadataExtractionService';

const AIExtractionTest: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPIConnection = async () => {
    setLoading(true);
    setResults('Testing AI API connection...\n');

    try {
      const response = await fetch('https://api.ppq.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-q6pWgPVuMNVmKcDFgtK5wQ'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello, test message' }],
          max_completion_tokens: 50
        })
      });

      setResults(prev => prev + `Response status: ${response.status}\n`);

      if (response.ok) {
        const result = await response.json();
        setResults(prev => prev + `Response: ${JSON.stringify(result, null, 2)}\n`);
        setResults(prev => prev + '✅ API connection successful!\n');
      } else {
        const errorText = await response.text();
        setResults(prev => prev + `Error: ${errorText}\n`);
      }
    } catch (error) {
      setResults(prev => prev + `Connection failed: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  const testAIExtraction = async () => {
    setLoading(true);
    setResults('Testing AI metadata extraction...\n');

    try {
      // Create a sample document with clear metadata
      const sampleContent = `
INVOICE #INV-2024-001

Bill To:
Acme Corporation
123 Business Street
New York, NY 10001

Date: September 23, 2024
Due Date: October 23, 2024

Item Description: Consulting Services
Amount: $1,500.00

Please remit payment by the due date.

Thank you for your business!
`;

      // Create test file
      const testFile = new File([sampleContent], 'invoice-sample.txt', {
        type: 'text/plain',
      });

      setResults(prev => prev + 'Created test file with invoice content\n');
      setResults(prev => prev + 'File content preview:\n' + sampleContent.substring(0, 200) + '...\n\n');

      // Test metadata extraction
      setResults(prev => prev + 'Calling AI service for metadata extraction...\n');

      const extractedMetadata = await metadataExtractionService.extractMetadata(testFile, {
        documentType: 'financial',
        includeOCR: false
      });

      setResults(prev => prev + 'Extraction completed!\n\n');
      setResults(prev => prev + 'Results:\n');
      setResults(prev => prev + `Category: ${extractedMetadata.category || 'Not found'}\n`);
      setResults(prev => prev + `Document Number: ${extractedMetadata.documentNumber || 'Not found'}\n`);
      setResults(prev => prev + `Confidence: ${extractedMetadata.confidence ? (extractedMetadata.confidence * 100).toFixed(1) : 'Unknown'}%\n`);
      setResults(prev => prev + `Extraction Method: ${extractedMetadata.extractionMethod}\n\n`);

      // Validate results
      const isValid = metadataExtractionService.validateMetadata(extractedMetadata);
      setResults(prev => prev + `Validation: ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);

      if (!isValid) {
        const suggestions = metadataExtractionService.getSuggestions(extractedMetadata);
        setResults(prev => prev + 'Suggestions:\n');
        suggestions.forEach(suggestion => {
          setResults(prev => prev + `- ${suggestion}\n`);
        });
      }

      // Expected results check
      if (extractedMetadata.category?.toLowerCase().includes('invoice') &&
          extractedMetadata.documentNumber?.includes('INV-2024-001')) {
        setResults(prev => prev + '\n🎉 SUCCESS: AI correctly identified invoice and document number!\n');
      } else {
        setResults(prev => prev + '\n⚠️ PARTIAL: AI extraction may need refinement\n');
      }

    } catch (error) {
      setResults(prev => prev + `❌ ERROR: ${error}\n`);
      console.error('AI Extraction test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testOCRExtraction = async () => {
    setLoading(true);
    setResults('Testing OCR metadata extraction...\n');

    try {
      const testFile = new File(['Sample scanned document content'], 'scanned-doc.pdf', {
        type: 'application/pdf',
      });

      setResults(prev => prev + 'Testing OCR extraction (simulated)...\n');

      const extractedMetadata = await metadataExtractionService.extractMetadataWithOCR(testFile, {
        includeOCR: true
      });

      setResults(prev => prev + 'OCR Extraction Results:\n');
      setResults(prev => prev + JSON.stringify(extractedMetadata, null, 2) + '\n');

    } catch (error) {
      setResults(prev => prev + `OCR Test Error: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">AI Metadata Extraction Test</h2>
      <p className="text-gray-600 mb-4">
        This test validates the AI metadata extraction service with sample documents.
      </p>

      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={testAPIConnection}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test API Connection'}
        </button>

        <button
          onClick={testAIExtraction}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Text Extraction'}
        </button>

        <button
          onClick={testOCRExtraction}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OCR Extraction'}
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap max-h-96 font-mono">
          {results || 'Click a test button to start testing...'}
        </pre>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-800 mb-2">Integration Notes:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• AI extraction is integrated into the upload workflow</li>
          <li>• Extracted metadata auto-populates form fields</li>
          <li>• Users can review and edit AI suggestions</li>
          <li>• OCR extraction available for scanned documents</li>
          <li>• Confidence scoring helps identify reliability</li>
        </ul>
      </div>
    </div>
  );
};

export default AIExtractionTest;