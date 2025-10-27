"""
OCR Service - GPT-4 Vision-based text extraction
"""
import logging
import os
import base64
from pathlib import Path
from typing import Tuple, Optional, Dict, List
from uuid import UUID
import json

logger = logging.getLogger(__name__)

# Check if OpenAI is available
OPENAI_AVAILABLE = False
OPENAI_API_KEY = None

try:
    from openai import OpenAI
    import fitz  # PyMuPDF for PDF processing
    from PIL import Image
    import io

    # Get API key from environment or use provided key
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    if OPENAI_API_KEY:
        OPENAI_AVAILABLE = True
        logger.info("OpenAI GPT-4 Vision OCR is available")
    else:
        logger.warning("OpenAI API key not found. OCR service will run in mock mode.")

except ImportError as e:
    logger.warning(f"OCR dependencies not fully installed: {e}")
    logger.warning("Install: pip install openai PyMuPDF Pillow")


class OCRService:
    """Service for OCR processing using GPT-4 Vision"""

    def __init__(self):
        self.openai_available = OPENAI_AVAILABLE
        if self.openai_available:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def is_available(self) -> bool:
        """Check if OCR service is available"""
        return self.openai_available

    def _encode_image_to_base64(self, image_path: Path) -> str:
        """Encode image file to base64 string"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def _get_image_mime_type(self, image_path: Path) -> str:
        """Get MIME type for image"""
        extension = image_path.suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        return mime_types.get(extension, 'image/jpeg')

    def process_image(
        self,
        image_path: Path,
        language: str = 'eng'
    ) -> Tuple[bool, Optional[str], Optional[float], Optional[str]]:
        """
        Process an image file with GPT-4 Vision OCR

        Args:
            image_path: Path to image file
            language: Language hint (not strictly used by GPT-4 Vision)

        Returns:
            Tuple of (success, extracted_text, confidence, error_message)
        """
        if not self.openai_available:
            return False, None, None, "OpenAI API not available. Please configure API key."

        try:
            # Encode image to base64
            base64_image = self._encode_image_to_base64(image_path)
            mime_type = self._get_image_mime_type(image_path)

            # Call GPT-4 Vision API
            response = self.client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Extract all text from this image with proper formatting preservation.

IMPORTANT FORMATTING RULES:
1. Preserve line breaks exactly as they appear in the image
2. Maintain paragraph spacing (add blank lines between paragraphs)
3. Keep proper indentation for lists, sections, and nested content
4. For tables: use clear spacing/alignment or markdown table format
5. Preserve headings with their original formatting/styling
6. Maintain the reading order (top to bottom, left to right)
7. Add a blank line before and after section changes

Return ONLY the extracted text with preserved formatting. Do NOT add any commentary or explanations."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_completion_tokens=4096
            )

            # Extract text from response
            extracted_text = response.choices[0].message.content

            # GPT-4 Vision doesn't provide confidence scores, so we'll use a high default
            # since it generally performs very well
            confidence = 95.0

            logger.info(f"Vision OCR processed image: {len(extracted_text)} characters extracted")

            return True, extracted_text, confidence, None

        except Exception as e:
            logger.error(f"Error processing image with Vision OCR: {e}")
            return False, None, None, str(e)

    def process_pdf(
        self,
        pdf_path: Path,
        language: str = 'eng',
        max_pages: Optional[int] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Process a PDF file with GPT-4 Vision OCR

        Args:
            pdf_path: Path to PDF file
            language: Language hint
            max_pages: Maximum number of pages to process (None = all)

        Returns:
            Tuple of (success, ocr_results_dict, error_message)

        OCR results dict contains:
            - full_text: Complete extracted text
            - pages: List of page results with text and confidence
            - overall_confidence: Average confidence across all pages
        """
        if not self.openai_available:
            return False, None, "OpenAI API not available. Please configure API key."

        try:
            # Open PDF
            pdf_document = fitz.open(pdf_path)
            page_count = len(pdf_document)

            if max_pages:
                page_count = min(page_count, max_pages)

            logger.info(f"Processing PDF with {page_count} pages using Vision OCR")

            all_text = []
            page_results = []
            all_confidences = []

            for page_num in range(page_count):
                page = pdf_document[page_num]

                # Convert page to image (PNG format for better quality)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scaling for better quality
                img_data = pix.tobytes("png")

                # Save to temporary file
                temp_path = Path(f"C:/Users/Book 3/Desktop/Pivot Pie Projects/Pie-Docs/pie-docs-backend/temp/ocr_page_{page_num}.png")
                temp_path.parent.mkdir(parents=True, exist_ok=True)

                with open(temp_path, "wb") as f:
                    f.write(img_data)

                # Process with Vision OCR
                success, text, confidence, error = self.process_image(temp_path, language)

                # Clean up temp file
                try:
                    temp_path.unlink()
                except:
                    pass

                if success and text:
                    all_text.append(text)
                    page_results.append({
                        'page_number': page_num + 1,
                        'text': text,
                        'confidence': confidence,
                        'char_count': len(text)
                    })
                    if confidence:
                        all_confidences.append(confidence)
                else:
                    logger.warning(f"Failed to process page {page_num + 1}: {error}")

            pdf_document.close()

            # Calculate overall metrics
            full_text = '\n\n--- Page Break ---\n\n'.join(all_text)
            overall_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

            results = {
                'full_text': full_text,
                'pages': page_results,
                'page_count': page_count,
                'overall_confidence': overall_confidence,
                'total_chars': len(full_text)
            }

            logger.info(f"PDF Vision OCR complete: {len(full_text)} characters, {overall_confidence:.2f}% confidence")

            return True, results, None

        except Exception as e:
            logger.error(f"Error processing PDF with Vision OCR: {e}")
            return False, None, str(e)

    def process_document(
        self,
        file_path: Path,
        language: str = 'eng'
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Process any document (image or PDF) with GPT-4 Vision OCR

        Args:
            file_path: Path to document
            language: Language hint

        Returns:
            Tuple of (success, ocr_results_dict, error_message)
        """
        if not file_path.exists():
            return False, None, f"File not found: {file_path}"

        # Determine file type
        extension = file_path.suffix.lower()

        if extension == '.pdf':
            return self.process_pdf(file_path, language)
        elif extension in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp']:
            success, text, confidence, error = self.process_image(file_path, language)
            if success:
                results = {
                    'full_text': text,
                    'pages': [{
                        'page_number': 1,
                        'text': text,
                        'confidence': confidence,
                        'char_count': len(text) if text else 0
                    }],
                    'page_count': 1,
                    'overall_confidence': confidence,
                    'total_chars': len(text) if text else 0
                }
                return True, results, None
            return False, None, error
        else:
            return False, None, f"Unsupported file type: {extension}"

    def generate_mock_ocr_result(
        self,
        file_path: Path
    ) -> Dict:
        """
        Generate mock OCR result when OpenAI is not available
        Used for development/testing purposes
        """
        return {
            'full_text': f"[Mock Vision OCR Result]\nThis is simulated Vision OCR text for {file_path.name}.\nOpenAI API is not configured. Please set OPENAI_API_KEY environment variable to get real results.\n\nGPT-4 Vision provides superior text extraction with:\n- Better accuracy for complex layouts\n- Understanding of context and structure\n- Support for multiple languages\n- Handling of handwritten text\n- Recognition of tables and forms",
            'pages': [{
                'page_number': 1,
                'text': f"Mock Vision OCR text for {file_path.name}",
                'confidence': 0.0,
                'char_count': 100
            }],
            'page_count': 1,
            'overall_confidence': 0.0,
            'total_chars': 100,
            'mock': True
        }


# Singleton instance
ocr_service = OCRService()


# Convenience functions
def is_ocr_available() -> bool:
    """Check if OCR service is available"""
    return ocr_service.is_available()


def process_document(file_path: Path, language: str = 'eng') -> Tuple[bool, Optional[Dict], Optional[str]]:
    """Process document with Vision OCR"""
    return ocr_service.process_document(file_path, language)


def generate_mock_ocr_result(file_path: Path) -> Dict:
    """Generate mock OCR result"""
    return ocr_service.generate_mock_ocr_result(file_path)
