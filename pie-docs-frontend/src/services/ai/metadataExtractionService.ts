/**
 * Service for extracting metadata from documents using AI
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for PDF to image conversion
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const API_KEY = "sk-q6pWgPVuMNVmKcDFgtK5wQ";
const API_URL = "https://api.ppq.ai/chat/completions";

interface ExtractedMetadata {
  category?: string;
  documentNumber?: string;
  confidence?: number;
  extractionMethod: 'text' | 'ocr';
  ocrText?: string;
}

interface MetadataExtractionOptions {
  includeOCR?: boolean;
  documentType?: string;
  customPrompt?: string;
}

class MetadataExtractionService {
  /**
   * Extract metadata from a file using AI
   */
  async extractMetadata(
    file: File,
    options: MetadataExtractionOptions = {}
  ): Promise<ExtractedMetadata> {
    try {
      // Read file content
      const fileContent = await this.readFileContent(file);

      // Prepare the extraction prompt
      const prompt = this.buildExtractionPrompt(fileContent, file.name, options);

      // Call GPT-5 API
      const response = await this.callGPT5API(prompt);

      // Parse the response and extract metadata
      return this.parseMetadataResponse(response, 'text');
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {
        extractionMethod: 'text',
        confidence: 0,
      };
    }
  }

  /**
   * Extract metadata from multiple files
   */
  async extractMetadataFromFiles(
    files: File[],
    options: MetadataExtractionOptions = {}
  ): Promise<ExtractedMetadata[]> {
    const extractionPromises = files.map(file => this.extractMetadata(file, options));
    return Promise.all(extractionPromises);
  }

  /**
   * Extract metadata using OCR with robust error recovery
   */
  async extractMetadataWithOCR(
    file: File,
    options: MetadataExtractionOptions = {}
  ): Promise<ExtractedMetadata> {
    try {
      console.log(`Starting OCR extraction for: ${file.name} (${file.type})`);

      // Perform OCR with error handling
      let ocrText: string;
      try {
        ocrText = await this.performOCR(file);
      } catch (ocrError) {
        console.error('OCR extraction failed, trying fallback approach:', ocrError);

        // Fallback: try basic text extraction for text files
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          try {
            ocrText = await this.readFileContent(file);
          } catch (fallbackError) {
            ocrText = `OCR extraction failed for: ${file.name}\nFallback text extraction also failed.\nFile type: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB`;
          }
        } else {
          ocrText = `OCR extraction failed for: ${file.name}\nError: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}\nFile type: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)} KB`;
        }
      }

      // Build extraction prompt
      const prompt = this.buildExtractionPrompt(ocrText, file.name, {
        ...options,
        includeOCR: true,
      });

      // Try metadata extraction with retry
      let response;
      try {
        response = await this.callGPT5API(prompt);
      } catch (apiError) {
        console.error('API call failed, trying simplified extraction:', apiError);

        // Simplified fallback prompt for failed API calls
        const fallbackPrompt = `Extract metadata from: ${file.name}\n\nContent: ${ocrText.substring(0, 500)}\n\nReturn JSON with category and documentNumber fields only.`;

        try {
          response = await this.callGPT5API(fallbackPrompt);
        } catch (finalError) {
          console.error('All extraction attempts failed:', finalError);
          return {
            extractionMethod: 'ocr',
            confidence: 0,
            ocrText: ocrText,
            category: undefined,
            documentNumber: undefined
          };
        }
      }

      const metadata = this.parseMetadataResponse(response, 'ocr');

      return {
        ...metadata,
        ocrText: ocrText
      };

    } catch (error) {
      console.error('Complete metadata extraction failed:', error);
      return {
        extractionMethod: 'ocr',
        confidence: 0,
        ocrText: `Extraction completely failed for: ${file.name}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: undefined,
        documentNumber: undefined
      };
    }
  }

  /**
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          // For binary files, we'll provide basic info
          resolve(`File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      // Try to read as text first
      if (file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // For other file types, we'll work with file metadata
        resolve(`File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
      }
    });
  }

  /**
   * Build the extraction prompt for AI processing
   */
  private buildExtractionPrompt(
    content: string,
    fileName: string,
    options: MetadataExtractionOptions
  ): string {
    const basePrompt = `
You are a document metadata extraction expert. Analyze the following document and extract key metadata.

Document Information:
- Filename: ${fileName}
- Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Extract the following metadata:
1. **Category (Document Classification)**: Determine the document type/category (e.g., Invoice, Contract, Report, Letter, Manual, Policy, etc.)
2. **Document Number**: Look for any document numbers, reference numbers, invoice numbers, contract numbers, or similar identifiers

${options.includeOCR ? '\nNote: This document was processed using OCR, so account for potential text recognition errors.' : ''}

${options.documentType ? `\nExpected document type: ${options.documentType}` : ''}

${options.customPrompt ? `\nAdditional instructions: ${options.customPrompt}` : ''}

Respond in JSON format:
{
  "category": "extracted category or null if not found",
  "documentNumber": "extracted document number or null if not found",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of extraction logic"
}

Be conservative in your extractions. Only extract clear, unambiguous information. If you're unsure, return null for that field.
`;

    return basePrompt.trim();
  }

  /**
   * Call AI API with retry logic and timeout handling
   */
  private async callGPT5API(prompt: string, customData?: any): Promise<any> {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    };

    const data = customData || {
      model: "gpt-5", // Using advanced AI model for superior metadata extraction
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent extractions
      max_completion_tokens: 500, // Changed from max_tokens to max_completion_tokens
    };

    // Retry logic for failed requests
    const maxRetries = 2;
    const baseTimeout = 30000; // 30 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), baseTimeout * attempt);

        console.log(`AI API Request (attempt ${attempt}/${maxRetries}):`, {
          url: API_URL,
          headers: headers,
          body: data,
          timeout: baseTimeout * attempt
        });

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('AI API Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('AI API Error Response:', errorText);

          // If it's a timeout or server error, retry
          if (response.status >= 500 && attempt < maxRetries) {
            console.log(`Server error ${response.status}, retrying in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }

          throw new Error(`AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('AI API Success Response:', result);
        return result;

      } catch (error) {
        console.error(`AI API Call Failed (attempt ${attempt}/${maxRetries}):`, error);

        // If it's the last attempt or not a network/timeout error, throw
        if (attempt === maxRetries || !(error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('timeout') ||
          error.message.includes('Gateway Timeout') ||
          error.message.includes('Internal server error')
        ))) {
          throw error;
        }

        // Wait before retry
        console.log(`Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    throw new Error('AI API call failed after all retries');
  }

  /**
   * Parse the AI response and extract metadata
   */
  private parseMetadataResponse(response: any, method: 'text' | 'ocr'): ExtractedMetadata {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Try to parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Sanitize JSON string to remove control characters that break parsing
        let jsonString = jsonMatch[0];
        // Replace control characters (0x00-0x1F except newline, tab, carriage return)
        jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

        const parsed = JSON.parse(jsonString);
        return {
          category: parsed.category || undefined,
          documentNumber: parsed.documentNumber || undefined,
          confidence: parsed.confidence || 0.5,
          extractionMethod: method,
        };
      }

      // Fallback parsing if JSON is malformed
      const categoryMatch = content.match(/category["\s]*:["\s]*([^",\n]+)/i);
      const docNumberMatch = content.match(/documentNumber["\s]*:["\s]*([^",\n]+)/i);
      const confidenceMatch = content.match(/confidence["\s]*:["\s]*([0-9.]+)/);

      return {
        category: categoryMatch?.[1]?.replace(/['"]/g, '') || undefined,
        documentNumber: docNumberMatch?.[1]?.replace(/['"]/g, '') || undefined,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        extractionMethod: method,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        extractionMethod: method,
        confidence: 0,
      };
    }
  }

  /**
   * Perform OCR on the file using AI vision capabilities
   * Converts all file types to images and uses AI vision for text extraction and formatting
   */
  private async performOCR(file: File): Promise<string> {
    try {
      // For image files, process directly with AI vision
      if (file.type.startsWith('image/')) {
        return await this.processImageWithVision(file);
      }

      // For PDF files, convert to images first, then process each page
      if (file.type === 'application/pdf') {
        return await this.processPDFWithVision(file);
      }

      // For text files, read directly but format with AI
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const textContent = await this.readFileContent(file);
        return await this.formatTextWithAI(textContent, file.name);
      }

      // For other file types
      return `File type ${file.type} does not support OCR extraction.\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB`;

    } catch (error) {
      console.error('OCR extraction failed:', error);
      return `OCR extraction failed for: ${file.name}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Process image with AI vision for OCR and formatting
   */
  private async processImageWithVision(file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);

    const ocrPrompt = `
Extract and format all visible text from this image in a clean, human-readable format.

Instructions:
1. Extract ALL visible text including headers, body text, numbers, labels, etc.
2. Organize the content logically with proper structure
3. Use clear formatting with sections, line breaks, and spacing
4. Preserve important document structure (headers, lists, tables, etc.)
5. Include any document identifiers, reference numbers, dates
6. Make it easy to read and understand

Format the output as clean, well-structured text that maintains the document's logical flow and hierarchy.

If no text is visible, return "No text detected in this image."`;

    const ocrData = {
      model: "gpt-5",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: ocrPrompt },
          { type: "image_url", image_url: { url: base64 } }
        ]
      }],
      temperature: 0.1,
      max_completion_tokens: 3000
    };

    const response = await this.callGPT5API(ocrPrompt, ocrData);
    const extractedText = response.choices?.[0]?.message?.content || "No text detected";
    return extractedText.trim();
  }

  /**
   * Process PDF by converting to images and using AI vision with fallback strategies
   */
  private async processPDFWithVision(file: File): Promise<string> {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      const numPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages to avoid timeouts

      // First, try to extract existing text as fallback
      let hasExistingText = false;
      try {
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .trim();

          if (pageText && pageText.length > 50) { // If substantial text exists
            hasExistingText = true;
            fullText += `\n=== PAGE ${pageNum} ===\n${pageText}\n`;
          }
        }
      } catch (textError) {
        console.log('PDF text extraction failed, proceeding with vision:', textError);
      }

      // If we found existing text, use it as fallback
      if (hasExistingText) {
        console.log('Found existing text in PDF, using as primary source');
        return fullText.trim();
      }

      // Otherwise, process with vision (with optimizations)
      console.log('No substantial text found, processing with vision...');
      fullText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);

          // Convert PDF page to optimized image
          const compressedImage = await this.convertPDFPageToOptimizedImage(page, pageNum);

          if (compressedImage) {
            // Process the page image with AI vision
            const pageText = await this.processBase64ImageWithVision(compressedImage, pageNum);

            if (pageText && pageText.trim() !== "No text detected in this image.") {
              fullText += `\n=== PAGE ${pageNum} ===\n${pageText}\n`;
            }
          }
        } catch (pageError) {
          console.error(`Failed to process page ${pageNum}:`, pageError);
          fullText += `\n=== PAGE ${pageNum} ===\n[Error processing this page: ${pageError instanceof Error ? pageError.message : 'Unknown error'}]\n`;
        }
      }

      if (!fullText.trim()) {
        return `PDF file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)\n\nNo readable text found in any pages of this PDF.`;
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF vision processing failed:', error);
      return `PDF vision processing failed for: ${file.name}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Convert PDF page to optimized, compressed image
   */
  private async convertPDFPageToOptimizedImage(page: any, pageNum: number): Promise<string | null> {
    try {
      // Create canvas with optimized scale
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // Use lower scale for large pages to reduce payload size
      const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2.0

      // Limit maximum dimensions to prevent huge images
      const maxDimension = 2048;
      let scale = 1.5;

      if (viewport.width > maxDimension || viewport.height > maxDimension) {
        scale = Math.min(maxDimension / viewport.width, maxDimension / viewport.height) * 1.5;
      }

      const finalViewport = page.getViewport({ scale });
      canvas.height = finalViewport.height;
      canvas.width = finalViewport.width;

      const renderContext = {
        canvasContext: context!,
        viewport: finalViewport
      };

      await page.render(renderContext).promise;

      // Convert to JPEG with compression for smaller payload
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.8); // 80% quality

      // Check payload size (base64 is about 1.37x original size)
      const estimatedSizeMB = (imageBase64.length * 0.75) / (1024 * 1024);

      if (estimatedSizeMB > 10) { // If still too large, compress more
        console.log(`Page ${pageNum} still large (${estimatedSizeMB.toFixed(1)}MB), compressing further...`);
        return canvas.toDataURL('image/jpeg', 0.6); // 60% quality
      }

      console.log(`Page ${pageNum} optimized: ${estimatedSizeMB.toFixed(1)}MB`);
      return imageBase64;

    } catch (error) {
      console.error(`Failed to convert page ${pageNum} to image:`, error);
      return null;
    }
  }

  /**
   * Process base64 image with AI vision
   */
  private async processBase64ImageWithVision(base64Image: string, pageNumber?: number): Promise<string> {
    const ocrPrompt = `
Extract and format all visible text from this ${pageNumber ? `PDF page ${pageNumber}` : 'image'} in a clean, human-readable format.

Instructions:
1. Extract ALL visible text including headers, body text, numbers, labels, etc.
2. Organize the content logically with proper structure
3. Use clear formatting with sections, line breaks, and spacing
4. Preserve important document structure (headers, lists, tables, etc.)
5. Include any document identifiers, reference numbers, dates
6. Make it easy to read and understand

Format the output as clean, well-structured text that maintains the document's logical flow and hierarchy.

If no text is visible, return "No text detected in this image."`;

    const ocrData = {
      model: "gpt-5",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: ocrPrompt },
          { type: "image_url", image_url: { url: base64Image } }
        ]
      }],
      temperature: 0.1,
      max_completion_tokens: 3000
    };

    const response = await this.callGPT5API(ocrPrompt, ocrData);
    const extractedText = response.choices?.[0]?.message?.content || "No text detected";
    return extractedText.trim();
  }

  /**
   * Format existing text content with AI for better readability
   */
  private async formatTextWithAI(textContent: string, fileName: string): Promise<string> {
    const formatPrompt = `
Please format and improve the readability of this text content from "${fileName}".

Original content:
${textContent}

Instructions:
1. Clean up and format the text for better readability
2. Organize content with proper structure and spacing
3. Preserve all important information
4. Add clear section breaks where appropriate
5. Maintain the original meaning and data

Return the formatted text in a clean, human-readable format.`;

    const response = await this.callGPT5API(formatPrompt);
    const formattedText = response.choices?.[0]?.message?.content || textContent;
    return formattedText.trim();
  }

  /**
   * Convert file to ArrayBuffer for PDF.js
   */
  private async fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert file to base64 for AI vision API
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate extracted metadata
   */
  validateMetadata(metadata: ExtractedMetadata): boolean {
    return metadata.confidence !== undefined && metadata.confidence > 0.3;
  }

  /**
   * Get suggested improvements for low-confidence extractions
   */
  getSuggestions(metadata: ExtractedMetadata): string[] {
    const suggestions: string[] = [];

    if (metadata.confidence !== undefined && metadata.confidence < 0.5) {
      suggestions.push('Low confidence extraction - please review and correct');
    }

    if (!metadata.category) {
      suggestions.push('Could not determine document category - please specify manually');
    }

    if (!metadata.documentNumber) {
      suggestions.push('No document number found - consider adding one if applicable');
    }

    if (metadata.extractionMethod === 'ocr') {
      suggestions.push('Extracted using OCR - verify accuracy of text recognition');
    }

    return suggestions;
  }
}

export const metadataExtractionService = new MetadataExtractionService();
export default metadataExtractionService;

// Export types
export type { ExtractedMetadata, MetadataExtractionOptions };