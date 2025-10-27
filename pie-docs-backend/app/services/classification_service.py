"""
Document Classification Service - LLM-based document type identification
WITH ROBUST ERROR HANDLING AND RETRY LOGIC
"""
import logging
import os
import time
import re
from pathlib import Path
from typing import Tuple, Optional, Dict, List
import json

logger = logging.getLogger(__name__)

# Check if OpenAI is available
OPENAI_AVAILABLE = False
OPENAI_API_KEY = None

try:
    from openai import OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    if OPENAI_API_KEY:
        OPENAI_AVAILABLE = True
        logger.info("OpenAI LLM Classification is available with GPT-5 Nano Vision")
    else:
        logger.warning("OpenAI API key not found. Classification service will run in mock mode.")

except ImportError as e:
    logger.warning(f"Classification dependencies not fully installed: {e}")


class ClassificationService:
    """Service for LLM-based document classification"""

    def __init__(self):
        self.openai_available = OPENAI_AVAILABLE
        if self.openai_available:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def is_available(self) -> bool:
        """Check if classification service is available"""
        return self.openai_available

    def _extract_json_from_response(self, text: str) -> Optional[Dict]:
        """
        Robustly extract JSON from LLM response
        Handles markdown code blocks, extra text, etc.
        """
        if not text:
            return None

        # Try 1: Direct JSON parse
        try:
            return json.loads(text.strip())
        except:
            pass

        # Try 2: Extract from markdown code block
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except:
                pass

        # Try 3: Find first JSON object
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except:
                pass

        # Try 4: Clean and parse
        cleaned = text.strip()
        if cleaned.startswith('```'):
            lines = cleaned.split('\n')
            cleaned = '\n'.join(lines[1:-1] if len(lines) > 2 else lines)
        try:
            return json.loads(cleaned)
        except:
            pass

        return None

    def _call_llm_with_retry(
        self,
        messages: List[Dict],
        max_retries: int = 3,
        timeout: int = 30
    ) -> Optional[str]:
        """
        Call LLM with exponential backoff retry logic and timeout handling

        NOTE: GPT-5-Nano only supports temperature=1 (default)
        """
        for attempt in range(max_retries):
            try:
                logger.info(f"🔄 LLM call attempt {attempt + 1}/{max_retries}")

                # GPT-5-Nano only supports default temperature (1)
                # No temperature parameter = uses default
                response = self.client.chat.completions.create(
                    model="gpt-5-nano",
                    messages=messages,
                    max_completion_tokens=2000,  # Increased to allow for reasoning + output
                    timeout=timeout
                )

                # Check response structure
                if not response.choices or len(response.choices) == 0:
                    logger.warning(f"⚠️ No choices in response (attempt {attempt + 1})")
                    logger.warning(f"   Response object: {response}")
                    raise ValueError("No choices in API response")

                content = response.choices[0].message.content

                # Debug logging for empty responses
                if not content:
                    logger.warning(f"⚠️ Content is None (attempt {attempt + 1})")
                    logger.warning(f"   Full response: {response}")
                    logger.warning(f"   Choice: {response.choices[0]}")
                    logger.warning(f"   Message: {response.choices[0].message}")
                    raise ValueError("Response content is None")

                if not content.strip():
                    logger.warning(f"⚠️ Content is empty/whitespace (attempt {attempt + 1})")
                    logger.warning(f"   Content repr: {repr(content)}")
                    raise ValueError("Response content is empty")

                logger.info(f"✅ LLM responded (attempt {attempt + 1})")
                return content.strip()

            except Exception as e:
                logger.error(f"❌ LLM call failed (attempt {attempt + 1}): {e}")

                if attempt < max_retries - 1:
                    # Exponential backoff: 2s, 4s, 8s
                    wait_time = 2 ** attempt
                    logger.info(f"⏳ Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    logger.error("❌ All retry attempts exhausted")
                    return None

        return None

    def classify_document(
        self,
        file_path: Path,
        available_types: List[Dict[str, str]],
        ocr_text: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Classify a document using LLM with vision and/or OCR text

        Args:
            file_path: Path to document file
            available_types: List of available document types from system
                            Format: [{"id": "uuid", "name": "Invoice", "description": "..."}, ...]
            ocr_text: Optional pre-extracted OCR text

        Returns:
            Tuple of (success, classification_result, error_message)

        Classification result contains:
            - document_type_id: Matched document type ID from available_types
            - document_type_name: Name of the matched type
            - confidence: Confidence score (0-1)
            - reasoning: LLM's reasoning for the classification
            - suggested_metadata: Additional metadata suggestions
        """
        if not self.openai_available:
            return False, None, "OpenAI API not available. Please configure API key."

        try:
            # Prepare document types for LLM
            types_str = "\n".join([
                f"- ID: {dt['id']}, Name: {dt['display_name']}, Description: {dt.get('description', 'N/A')}"
                for dt in available_types
            ])

            # Build prompt
            system_prompt = """You are a document classification expert. Analyze the provided document and classify it into one of the available document types.

Available Document Types:
{types}

Please respond with a valid JSON object only. Do not include any text before or after the JSON.

Required JSON format:
{{
    "document_type_id": "the UUID from the list above",
    "document_type_name": "the name from the list above",
    "confidence": 0.95,
    "reasoning": "brief explanation of your classification",
    "suggested_metadata": {{
        "key": "value"
    }}
}}

Classification steps:
1. Examine the document content carefully
2. Select the most appropriate document type from the available types
3. If uncertain, choose "General Document"
4. Provide your confidence level (0.0 to 1.0)
5. Explain your reasoning briefly
6. Suggest any metadata you can extract

Return only the JSON object."""

            system_prompt = system_prompt.format(types=types_str)

            # Check file extension to determine if we can use vision
            extension = file_path.suffix.lower()
            can_use_vision = extension in ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp']

            messages = []
            response = None

            if can_use_vision:
                # Use vision API
                import base64

                # For PDFs, convert first page to image for vision API
                if extension == '.pdf':
                    logger.info("🔄 Converting PDF to image for vision API...")
                    logger.info(f"📂 PDF file path: {file_path}")
                    logger.info(f"📏 PDF file size: {file_path.stat().st_size} bytes")
                    try:
                        from pdf2image import convert_from_path
                        from PIL import Image
                        import io
                        import os

                        # Set poppler path for Windows Chocolatey installation
                        poppler_path = None
                        if os.name == 'nt':  # Windows
                            logger.info("🔍 Searching for Poppler on Windows...")
                            # Try to find poppler from various installations
                            possible_paths = [
                                r'C:\poppler\poppler-24.08.0\Library\bin',  # Direct download
                                r'C:\poppler\Library\bin',
                                r'C:\ProgramData\chocolatey\lib\poppler\tools\poppler-25.10.0\Library\bin',
                                r'C:\Program Files\poppler\Library\bin'
                            ]
                            for path in possible_paths:
                                logger.info(f"  Checking: {path}")
                                if os.path.exists(path):
                                    poppler_path = path
                                    logger.info(f"✅ Found Poppler at: {poppler_path}")
                                    break

                            if not poppler_path:
                                logger.warning("⚠️ Poppler not found in standard locations!")

                        # Convert first page to image
                        logger.info("🖼️ Starting PDF to image conversion...")
                        images = convert_from_path(
                            str(file_path),
                            first_page=1,
                            last_page=1,
                            poppler_path=poppler_path
                        )
                        logger.info(f"📊 Conversion complete. Images generated: {len(images) if images else 0}")

                        if images:
                            # Convert PIL Image to bytes with compression
                            logger.info("💾 Converting image to JPEG bytes (compressed)...")
                            img = images[0]

                            # Resize if too large (max 2048px on longest side)
                            max_size = 2048
                            if max(img.width, img.height) > max_size:
                                ratio = max_size / max(img.width, img.height)
                                new_size = (int(img.width * ratio), int(img.height * ratio))
                                img = img.resize(new_size, Image.Resampling.LANCZOS)
                                logger.info(f"📐 Resized image from {images[0].size} to {new_size}")

                            img_byte_arr = io.BytesIO()
                            # Use JPEG with 85% quality for better compression
                            img.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
                            file_bytes = img_byte_arr.getvalue()
                            mime_type = 'image/jpeg'
                            logger.info(f"✅ PDF converted to JPEG successfully! Size: {len(file_bytes)} bytes")
                        else:
                            logger.warning("⚠️ PDF conversion returned no images, falling back to text-only")
                            can_use_vision = False
                    except ImportError as e:
                        logger.error(f"❌ pdf2image not installed: {e}")
                        logger.error("   Run: pip install pdf2image")
                        can_use_vision = False
                    except Exception as e:
                        logger.error(f"❌ Error converting PDF to image: {e}")
                        logger.error(f"   Error type: {type(e).__name__}")
                        logger.error(f"   Poppler path used: {poppler_path if 'poppler_path' in locals() else 'None'}")
                        can_use_vision = False

                if can_use_vision and extension != '.pdf':
                    # For images, read directly
                    with open(file_path, "rb") as f:
                        file_bytes = f.read()
                    mime_type = self._get_mime_type(file_path)

                if can_use_vision:
                    logger.info("🎨 Encoding image to base64...")
                    base64_file = base64.b64encode(file_bytes).decode('utf-8')
                    logger.info(f"✅ Base64 encoding complete. Length: {len(base64_file)} chars")

                    # Build user message with system prompt embedded in text
                    user_text = f"{system_prompt}\n\nClassify this document by analyzing the visual content."
                    if ocr_text:
                        user_text += f"\n\nOCR Text:\n{ocr_text[:2000]}"

                    user_content = [
                        {
                            "type": "text",
                            "text": user_text
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_file}"
                            }
                        }
                    ]

                    messages.append({
                        "role": "user",
                        "content": user_content
                    })

                    logger.info("🚀 Sending request to OpenAI GPT-5 Nano Vision API...")
                    logger.info(f"   Model: gpt-5-nano")
                    logger.info(f"   Image MIME: {mime_type}")
                    logger.info(f"   Has OCR text: {bool(ocr_text)}")

            if not can_use_vision:
                # Text-only classification using OCR text or file metadata
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })

                text_content = f"Filename: {file_path.name}\n"
                if ocr_text:
                    text_content += f"\nDocument Text:\n{ocr_text[:4000]}"
                else:
                    text_content += "\nNo OCR text available. Please classify based on filename."

                messages.append({
                    "role": "user",
                    "content": text_content
                })

            # ===================================================
            # ROBUST LLM CALL WITH RETRY AND TIMEOUT
            # ===================================================
            result_text = self._call_llm_with_retry(messages, max_retries=3, timeout=30)

            if not result_text:
                logger.error("❌ All LLM call attempts failed")
                return False, None, "LLM call failed after retries"

            logger.info(f"📝 LLM response ({len(result_text)} chars): {result_text[:200]}...")

            # ===================================================
            # ROBUST JSON EXTRACTION
            # ===================================================
            result = self._extract_json_from_response(result_text)

            if not result:
                logger.error(f"❌ Failed to extract JSON from response: {result_text[:500]}")

                # Try one more time with simpler prompt
                simple_messages = [
                    {
                        "role": "system",
                        "content": "You are a document classifier. Respond with ONLY valid JSON. No markdown, no explanations."
                    },
                    {
                        "role": "user",
                        "content": f"Classify this document. Available types: {', '.join([dt['display_name'] for dt in available_types[:5]])}. Return JSON with: document_type_name, confidence, reasoning."
                    }
                ]

                logger.info("🔄 Trying with simplified prompt...")
                simple_response = self._call_llm_with_retry(simple_messages, max_retries=2, timeout=20)

                if simple_response:
                    result = self._extract_json_from_response(simple_response)

            # ===================================================
            # FALLBACK TO GENERAL DOCUMENT TYPE
            # ===================================================
            if not result or 'document_type_name' not in result:
                logger.warning("⚠️ Using fallback classification")
                general_type = next(
                    (dt for dt in available_types if 'general' in dt['display_name'].lower()),
                    available_types[0] if available_types else None
                )

                if general_type:
                    result = {
                        'document_type_id': general_type['id'],
                        'document_type_name': general_type['display_name'],
                        'confidence': 0.5,
                        'reasoning': "Automatic classification failed, using fallback",
                        'suggested_metadata': {}
                    }
                else:
                    return False, None, "No document types available and classification failed"

            # ===================================================
            # ENSURE REQUIRED FIELDS
            # ===================================================
            if 'document_type_id' not in result and 'document_type_name' in result:
                # Find ID from name
                matched_type = next(
                    (dt for dt in available_types if dt['display_name'].lower() == result['document_type_name'].lower()),
                    None
                )
                if matched_type:
                    result['document_type_id'] = matched_type['id']

            if 'document_type_id' not in result:
                logger.warning("⚠️ No document_type_id in result, using first available type")
                result['document_type_id'] = available_types[0]['id']
                result['document_type_name'] = available_types[0]['display_name']

            # Set defaults for optional fields
            result.setdefault('confidence', 0.7)
            result.setdefault('reasoning', "Classified successfully")
            result.setdefault('suggested_metadata', {})

            logger.info(f"✅ Document classified as: {result.get('document_type_name')} (confidence: {result.get('confidence')})")

            return True, result, None

        except Exception as e:
            logger.error(f"❌ Classification error: {e}")
            import traceback
            traceback.print_exc()

            # Last-resort fallback
            try:
                general_type = next(
                    (dt for dt in available_types if 'general' in dt['display_name'].lower()),
                    available_types[0] if available_types else None
                )
                if general_type:
                    return True, {
                        'document_type_id': general_type['id'],
                        'document_type_name': general_type['display_name'],
                        'confidence': 0.3,
                        'reasoning': f"Error fallback: {str(e)[:100]}",
                        'suggested_metadata': {}
                    }, None
            except:
                pass

            return False, None, str(e)

    def _get_mime_type(self, file_path: Path) -> str:
        """Get MIME type for file"""
        extension = file_path.suffix.lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        return mime_types.get(extension, 'application/octet-stream')

    def classify_batch(
        self,
        file_paths: List[Path],
        available_types: List[Dict[str, str]],
        ocr_texts: Optional[List[str]] = None
    ) -> List[Tuple[bool, Optional[Dict], Optional[str]]]:
        """
        Classify multiple documents

        Args:
            file_paths: List of file paths
            available_types: Available document types
            ocr_texts: Optional list of pre-extracted OCR texts (same order as file_paths)

        Returns:
            List of classification results
        """
        results = []
        for i, file_path in enumerate(file_paths):
            ocr_text = ocr_texts[i] if ocr_texts and i < len(ocr_texts) else None
            result = self.classify_document(file_path, available_types, ocr_text)
            results.append(result)
        return results

    def generate_mock_classification(
        self,
        file_path: Path,
        available_types: List[Dict[str, str]]
    ) -> Dict:
        """Generate mock classification result for testing"""
        # Default to General type if available
        general_type = next((dt for dt in available_types if dt['display_name'].lower() == 'general'), None)

        if general_type:
            return {
                'document_type_id': general_type['id'],
                'document_type_name': general_type['display_name'],
                'confidence': 0.0,
                'reasoning': 'Mock classification - OpenAI API not configured',
                'suggested_metadata': {},
                'mock': True
            }
        else:
            return {
                'document_type_id': available_types[0]['id'] if available_types else 'unknown',
                'document_type_name': available_types[0]['display_name'] if available_types else 'Unknown',
                'confidence': 0.0,
                'reasoning': 'Mock classification - OpenAI API not configured',
                'suggested_metadata': {},
                'mock': True
            }


# Singleton instance
classification_service = ClassificationService()


# Convenience functions
def is_classification_available() -> bool:
    """Check if classification service is available"""
    return classification_service.is_available()


def classify_document(
    file_path: Path,
    available_types: List[Dict[str, str]],
    ocr_text: Optional[str] = None
) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """Classify a document"""
    return classification_service.classify_document(file_path, available_types, ocr_text)


def generate_mock_classification(
    file_path: Path,
    available_types: List[Dict[str, str]]
) -> Dict:
    """Generate mock classification"""
    return classification_service.generate_mock_classification(file_path, available_types)
