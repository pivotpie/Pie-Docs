"""
Document Intelligence Service - AI-powered document analysis using GPT-5

Provides:
- Automatic document classification
- Metadata extraction
- Document insights extraction (clauses, PII, financial terms, risks)
- Key terms extraction with definitions
- Summary generation with key points
- Entity recognition
- Multimodal analysis (images, tables, charts)
- Dynamic AI actions (amendments, risk analysis, compliance checks)
"""
import logging
import os
import time
from pathlib import Path
from typing import Tuple, Optional, Dict, List, Any
import json

logger = logging.getLogger(__name__)

# Check if OpenAI is available
OPENAI_AVAILABLE = False
OPENAI_API_KEY = None

try:
    from openai import OpenAI
    from app.config import settings

    # Get API key from settings (which loads from .env)
    OPENAI_API_KEY = settings.OPENAI_API_KEY

    if OPENAI_API_KEY:
        OPENAI_AVAILABLE = True
        logger.info("OpenAI Document Intelligence (GPT-5) is available")
    else:
        logger.warning("OpenAI API key not found. Document Intelligence will run in mock mode.")

except ImportError as e:
    logger.warning(f"Document Intelligence dependencies not fully installed: {e}")
    logger.warning("Install: pip install openai")


class DocumentIntelligenceService:
    """Service for AI-powered document analysis using GPT-5"""

    # GPT-5 model configuration
    MODEL = "gpt-5"  # Using GPT-5
    MAX_INPUT_TOKENS = 272000  # GPT-5 supports 272K input tokens
    MAX_OUTPUT_TOKENS = 128000  # GPT-5 supports 128K output tokens

    # Document type categories
    DOCUMENT_TYPES = [
        "Invoice", "Receipt", "Contract", "Legal Document", "Financial Report",
        "Technical Documentation", "Medical Record", "Academic Paper", "Letter",
        "Form", "Presentation", "Spreadsheet", "Email", "Report", "Memo",
        "Resume/CV", "Certificate", "Permit", "License", "Other"
    ]

    def __init__(self):
        self.openai_available = OPENAI_AVAILABLE
        if self.openai_available:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def is_available(self) -> bool:
        """Check if Document Intelligence service is available"""
        return self.openai_available

    def classify_document(
        self,
        text_content: str,
        filename: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Classify document type and extract metadata using GPT-4

        Args:
            text_content: Extracted text from document
            filename: Original filename (optional, helps with classification)

        Returns:
            Tuple of (success, classification_results, error_message)

        Classification results contains:
            - document_type: Primary document type
            - confidence: Confidence score (0-100)
            - sub_type: More specific classification
            - suggested_tags: List of relevant tags
            - category: Broad category (business, legal, personal, etc.)
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available. Please configure OpenAI API key."

        if not text_content or len(text_content.strip()) < 10:
            return False, None, "Text content too short for classification"

        try:
            # Prepare context
            context = f"Document filename: {filename}\n\n" if filename else ""
            context += f"Document content (first 3000 chars):\n{text_content[:3000]}"

            # Call GPT-5 for classification
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a document classification expert. Analyze the provided document and classify it.

Available document types: {', '.join(self.DOCUMENT_TYPES)}

Provide a JSON response with:
- document_type: Main type from the list above
- confidence: Confidence score 0-100
- sub_type: More specific type (e.g., "Purchase Order" for Invoice type)
- suggested_tags: Array of 3-5 relevant tags
- category: One of [business, legal, personal, technical, financial, medical, academic, administrative]
- key_entities: List of important entities (people, companies, dates, amounts)
- summary: Brief 1-sentence summary
- language: Detected language code (e.g., eng, ara, fra)

Return ONLY valid JSON, no additional text."""
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                max_completion_tokens=1000
            )

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            classification = json.loads(result_text)

            logger.info(f"Document classified as: {classification.get('document_type')} with {classification.get('confidence')}% confidence")

            return True, classification, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse classification response: {e}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error classifying document: {e}")
            return False, None, str(e)

    def extract_metadata(
        self,
        text_content: str,
        document_type: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Extract structured metadata from document content

        Args:
            text_content: Extracted text from document
            document_type: Known document type (helps with extraction)

        Returns:
            Tuple of (success, metadata_dict, error_message)

        Metadata includes type-specific fields like:
        - Invoice: invoice_number, date, amount, vendor, etc.
        - Contract: parties, effective_date, expiration_date, etc.
        - Resume: name, email, skills, experience, etc.
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        if not text_content or len(text_content.strip()) < 10:
            return False, None, "Text content too short for metadata extraction"

        try:
            # Prepare type-specific instructions
            type_instruction = ""
            if document_type:
                type_instruction = f"\nThis is a {document_type}. Extract relevant fields for this type."

            # Call GPT-5 for metadata extraction
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are a metadata extraction expert. Extract structured information from documents.{type_instruction}

Extract all relevant metadata fields as key-value pairs. Common fields include:
- Dates (use ISO format YYYY-MM-DD)
- Names (people, companies)
- Amounts (numbers with currency)
- Identifiers (invoice numbers, contract IDs, etc.)
- Contact information (emails, phones, addresses)
- Important terms and conditions

Return ONLY valid JSON with extracted fields, no additional text.
If a field is not found, omit it from the response."""
                    },
                    {
                        "role": "user",
                        "content": f"Document content:\n{text_content[:4000]}"
                    }
                ],
                max_completion_tokens=1500
            )

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            metadata = json.loads(result_text)

            logger.info(f"Extracted {len(metadata)} metadata fields from document")

            return True, metadata, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse metadata response: {e}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")
            return False, None, str(e)

    def generate_summary(
        self,
        text_content: str,
        max_length: int = 200,
        extract_key_points: bool = True
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Generate a concise summary of the document with key points

        Args:
            text_content: Full document text
            max_length: Maximum summary length in words
            extract_key_points: Whether to extract key points separately

        Returns:
            Tuple of (success, summary_dict, error_message)
            summary_dict contains: {summary_text, key_points, word_count}
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        if not text_content or len(text_content.strip()) < 50:
            return False, None, "Text content too short for summarization"

        try:
            start_time = time.time()

            system_prompt = f"""You are a document summarization expert. Create a concise summary of the document in approximately {max_length} words. Focus on key points, main ideas, and important details. Be factual and objective.

{"Also extract 3-5 key points as a bullet list." if extract_key_points else ""}

Return JSON with:
- summary_text: The main summary paragraph
- key_points: Array of 3-5 key points (if requested)
- word_count: Approximate word count of summary

Return ONLY valid JSON."""

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this document:\n\n{text_content[:10000]}"  # GPT-5 can handle more
                    }
                ],
                max_completion_tokens=max_length * 3
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Parse response - check if content exists
            if not response.choices or not response.choices[0].message.content:
                logger.error("Empty response from GPT-5 API for summary")
                logger.debug(f"Full response: {response}")
                return False, None, "Empty response from AI model"

            result_text = response.choices[0].message.content.strip()

            # Log the raw response for debugging
            if not result_text:
                logger.error("Summary response content is empty after stripping")
                return False, None, "Empty response content from AI model"

            logger.debug(f"Raw summary response (first 200 chars): {result_text[:200]}")

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            summary_data = json.loads(result_text)
            summary_data['generation_time_ms'] = generation_time
            summary_data['model_version'] = self.MODEL

            logger.info(f"Generated summary: {summary_data.get('word_count', 0)} words")

            return True, summary_data, None

        except json.JSONDecodeError as e:
            # Fallback if JSON parsing fails
            logger.warning(f"Failed to parse summary JSON: {e}. Using fallback.")
            logger.error(f"Summary text that failed to parse: {result_text[:500] if 'result_text' in locals() else 'N/A'}")
            try:
                if response.choices and response.choices[0].message.content:
                    summary = response.choices[0].message.content.strip()
                else:
                    logger.error("No content available for fallback summary")
                    return False, None, str(e)
                return True, {
                    'summary_text': summary,
                    'key_points': [],
                    'word_count': len(summary.split()),
                    'generation_time_ms': generation_time,
                    'model_version': self.MODEL
                }, None
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {fallback_error}")
                return False, None, str(e)
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return False, None, str(e)

    def extract_entities(
        self,
        text_content: str
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Extract named entities from document (people, organizations, locations, dates, amounts)

        Args:
            text_content: Document text

        Returns:
            Tuple of (success, entities_dict, error_message)

        Entities dict contains:
            - people: List of person names
            - organizations: List of company/org names
            - locations: List of places
            - dates: List of dates
            - amounts: List of monetary amounts
            - other: Other important entities
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        if not text_content or len(text_content.strip()) < 20:
            return False, None, "Text content too short for entity extraction"

        try:
            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an entity recognition expert. Extract all named entities from the document.

Return a JSON object with these categories:
- people: Array of person names
- organizations: Array of company/organization names
- locations: Array of places (cities, countries, addresses)
- dates: Array of dates (in ISO format when possible)
- amounts: Array of monetary amounts (with currency)
- emails: Array of email addresses
- phones: Array of phone numbers
- other: Array of other important entities

Return ONLY valid JSON, no additional text."""
                    },
                    {
                        "role": "user",
                        "content": f"Extract entities from:\n{text_content[:4000]}"
                    }
                ],
                max_completion_tokens=1000
            )

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            entities = json.loads(result_text)

            total_entities = sum(len(v) for v in entities.values() if isinstance(v, list))
            logger.info(f"Extracted {total_entities} entities from document")

            return True, entities, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse entities response: {e}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return False, None, str(e)

    def extract_insights(
        self,
        text_content: str
    ) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
        """
        Extract document insights (clauses, PII, financial terms, risks, etc.)

        Args:
            text_content: Full document text

        Returns:
            Tuple of (success, insights_list, error_message)

        Each insight contains:
            - insight_type: clause, pii, financial, reference, date, risk
            - category: Specific category name
            - content: The insight text
            - context: Surrounding context
            - page_number: Optional page number
            - confidence: Confidence score
            - severity: For risks (low, medium, high, critical)
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        if not text_content or len(text_content.strip()) < 50:
            return False, None, "Text content too short for insight extraction"

        try:
            start_time = time.time()

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a document insight extraction expert. Analyze the document and extract key insights including:
- Important clauses and terms
- Personal Identifiable Information (PII)
- Financial terms and obligations
- References to other documents or entities
- Important dates and deadlines
- Potential risks or concerns

Return JSON with an array of insights. Each insight should have:
- insight_type: One of [clause, pii, financial, reference, date, risk]
- category: Specific category (e.g., "Payment Terms", "Confidentiality", "Personal Data")
- content: The actual insight text or data
- context: Brief surrounding context from document
- page_number: Page number if identifiable (or null)
- confidence: Confidence score 0.0-1.0
- severity: For risks, one of [low, medium, high, critical] (or null for non-risks)

Return ONLY valid JSON in format: {"insights": [...]}"""
                    },
                    {
                        "role": "user",
                        "content": f"Extract insights from this document:\n\n{text_content[:20000]}"
                    }
                ],
                max_completion_tokens=4000
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Parse response - check if content exists
            if not response.choices or not response.choices[0].message.content:
                logger.error("Empty response from GPT-5 API")
                logger.debug(f"Full response: {response}")
                return False, None, "Empty response from AI model"

            result_text = response.choices[0].message.content.strip()

            # Log the raw response for debugging
            if not result_text:
                logger.error("Response content is empty after stripping")
                return False, None, "Empty response content from AI model"

            logger.debug(f"Raw AI response (first 200 chars): {result_text[:200]}")

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            data = json.loads(result_text)
            insights = data.get('insights', [])

            # Add model version to each insight
            for insight in insights:
                insight['model_version'] = self.MODEL

            logger.info(f"Extracted {len(insights)} insights from document in {generation_time}ms")

            return True, insights, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse insights response: {e}")
            logger.error(f"Response text that failed to parse: {result_text[:500] if 'result_text' in locals() else 'N/A'}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error extracting insights: {e}")
            return False, None, str(e)

    def extract_key_terms(
        self,
        text_content: str
    ) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
        """
        Extract key terms with definitions from document

        Args:
            text_content: Full document text

        Returns:
            Tuple of (success, key_terms_list, error_message)

        Each term contains:
            - term: The key term
            - definition: Definition or explanation
            - context: Where it appears
            - category: legal, financial, technical, date, party, other
            - importance: critical, important, reference
            - page_references: Array of page numbers
            - frequency: How many times it appears
            - confidence: Confidence score
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        if not text_content or len(text_content.strip()) < 50:
            return False, None, "Text content too short for key term extraction"

        try:
            start_time = time.time()

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a key term extraction expert. Identify and define key terms, jargon, and important concepts from the document.

Extract terms that are:
- Industry-specific terminology
- Legal or technical jargon
- Important names (parties, entities)
- Critical dates or periods
- Financial terms
- Other significant concepts

Return JSON with an array of terms. Each term should have:
- term: The key term/phrase
- definition: Clear definition or explanation
- context: Brief excerpt showing usage
- category: One of [legal, financial, technical, date, party, other]
- importance: One of [critical, important, reference]
- page_references: Array of page numbers where it appears (estimate if needed)
- frequency: Approximate occurrence count
- confidence: Confidence score 0.0-1.0

Return ONLY valid JSON in format: {"terms": [...]}"""
                    },
                    {
                        "role": "user",
                        "content": f"Extract key terms from this document:\n\n{text_content[:20000]}"
                    }
                ],
                max_completion_tokens=3000
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Parse response - check if content exists
            if not response.choices or not response.choices[0].message.content:
                logger.error("Empty response from GPT-5 API for key terms")
                logger.debug(f"Full response: {response}")
                return False, None, "Empty response from AI model"

            result_text = response.choices[0].message.content.strip()

            # Log the raw response for debugging
            if not result_text:
                logger.error("Key terms response content is empty after stripping")
                return False, None, "Empty response content from AI model"

            logger.debug(f"Raw key terms response (first 200 chars): {result_text[:200]}")

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            data = json.loads(result_text)
            terms = data.get('terms', [])

            # Add model version to each term
            for term in terms:
                term['model_version'] = self.MODEL

            logger.info(f"Extracted {len(terms)} key terms from document in {generation_time}ms")

            return True, terms, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse key terms response: {e}")
            logger.error(f"Key terms text that failed to parse: {result_text[:500] if 'result_text' in locals() else 'N/A'}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error extracting key terms: {e}")
            return False, None, str(e)

    def generate_dynamic_action(
        self,
        text_content: str,
        action_type: str,
        user_input: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Generate dynamic AI actions (amendments, risk analysis, compliance checks, etc.)

        Args:
            text_content: Document text
            action_type: Type of action (amendment, risk-analysis, compliance-check, etc.)
            user_input: Optional user input for actions like amendment

        Returns:
            Tuple of (success, result_dict, error_message)
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        # Action-specific prompts
        action_prompts = {
            'amendment': {
                'system': """You are a legal document amendment expert. Generate a professional amendment based on the user's requested changes.

Return JSON with:
- title: Amendment title
- sections: Array of sections with {heading, content, type}
- metadata: {effectiveDate, partiesAffected, changesSummary}

Return ONLY valid JSON.""",
                'user_prefix': f"Original document:\n{text_content[:10000]}\n\nRequested changes: {{user_input}}\n\nGenerate amendment:"
            },
            'risk-analysis': {
                'system': """You are a risk analysis expert. Analyze the document for potential risks and concerns.

Return JSON with:
- title: "Risk Analysis Report"
- summary: Overall risk summary
- riskScore: Overall score 0-100
- sections: Array with risks categorized by severity
- recommendations: Array of mitigation recommendations

Return ONLY valid JSON.""",
                'user_prefix': f"Analyze risks in this document:\n{text_content[:15000]}"
            },
            'compliance-check': {
                'system': """You are a compliance checking expert. Analyze the document for compliance with regulations and standards.

Return JSON with:
- title: "Compliance Check Report"
- summary: Overall compliance summary
- complianceScore: Overall score 0-100
- sections: Array of compliance findings
- recommendations: Array of compliance improvements

Return ONLY valid JSON.""",
                'user_prefix': f"Check compliance in this document:\n{text_content[:15000]}"
            },
            'extract-clauses': {
                'system': """You are a clause extraction expert. Extract and categorize important clauses from the document.

Return JSON with:
- title: "Extracted Clauses"
- sections: Array of clause categories with items
- metadata: {totalClauses, documentType}

Return ONLY valid JSON.""",
                'user_prefix': f"Extract clauses from this document:\n{text_content[:15000]}"
            }
        }

        if action_type not in action_prompts:
            return False, None, f"Unknown action type: {action_type}"

        try:
            start_time = time.time()

            prompt_config = action_prompts[action_type]
            user_message = prompt_config['user_prefix'].replace('{user_input}', user_input or '')

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": prompt_config['system']
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ],
                max_completion_tokens=5000
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            result_data = json.loads(result_text)
            result_data['generation_time_ms'] = generation_time
            result_data['model_version'] = self.MODEL

            logger.info(f"Generated {action_type} action in {generation_time}ms")

            return True, result_data, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse {action_type} response: {e}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error generating {action_type}: {e}")
            return False, None, str(e)

    def generate_document(
        self,
        prompt: str,
        source_texts: List[str],
        document_type: str = "Generated Document"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Generate a new document based on source documents and user prompt

        Args:
            prompt: User's generation prompt
            source_texts: List of source document texts
            document_type: Type of document to generate

        Returns:
            Tuple of (success, generated_doc_dict, error_message)
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        try:
            start_time = time.time()

            # Combine source texts
            combined_sources = "\n\n---SOURCE DOCUMENT---\n\n".join(source_texts[:5])  # Limit to 5 sources

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert document generator. Create a professional {document_type} based on the provided source documents and user requirements.

The generated document should be:
- Well-structured with clear sections
- Professional and appropriate for the document type
- Based on information from source documents
- In markdown format

Return JSON with:
- title: Document title
- content: Full document content in markdown
- word_count: Approximate word count

Return ONLY valid JSON."""
                    },
                    {
                        "role": "user",
                        "content": f"""Source documents:
{combined_sources}

User request: {prompt}

Generate the {document_type}:"""
                    }
                ],
                max_completion_tokens=10000
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            result_data = json.loads(result_text)
            result_data['generation_time_ms'] = generation_time
            result_data['model_version'] = self.MODEL

            logger.info(f"Generated document in {generation_time}ms")

            return True, result_data, None

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse generated document response: {e}")
            return False, None, f"Failed to parse AI response: {str(e)}"
        except Exception as e:
            logger.error(f"Error generating document: {e}")
            return False, None, str(e)

    def analyze_document_complete(
        self,
        text_content: str,
        filename: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Complete document analysis: classification + metadata + summary + entities

        Args:
            text_content: Full document text
            filename: Original filename

        Returns:
            Tuple of (success, complete_analysis_dict, error_message)
        """
        if not self.openai_available:
            return False, None, "Document Intelligence not available."

        try:
            results = {}

            # 1. Classification
            success, classification, error = self.classify_document(text_content, filename)
            if success:
                results['classification'] = classification
            else:
                logger.warning(f"Classification failed: {error}")

            # 2. Metadata extraction
            doc_type = classification.get('document_type') if classification else None
            success, metadata, error = self.extract_metadata(text_content, doc_type)
            if success:
                results['metadata'] = metadata
            else:
                logger.warning(f"Metadata extraction failed: {error}")

            # 3. Summary
            success, summary, error = self.generate_summary(text_content, max_length=150)
            if success:
                results['summary'] = summary
            else:
                logger.warning(f"Summary generation failed: {error}")

            # 4. Entity extraction
            success, entities, error = self.extract_entities(text_content)
            if success:
                results['entities'] = entities
            else:
                logger.warning(f"Entity extraction failed: {error}")

            if results:
                logger.info(f"Complete document analysis finished with {len(results)} components")
                return True, results, None
            else:
                return False, None, "All analysis components failed"

        except Exception as e:
            logger.error(f"Error in complete document analysis: {e}")
            return False, None, str(e)


# Singleton instance
document_intelligence_service = DocumentIntelligenceService()


# Convenience functions
def is_intelligence_available() -> bool:
    """Check if Document Intelligence service is available"""
    return document_intelligence_service.is_available()


def classify_document(text_content: str, filename: Optional[str] = None) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """Classify document type"""
    return document_intelligence_service.classify_document(text_content, filename)


def analyze_document(text_content: str, filename: Optional[str] = None) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """Complete document analysis"""
    return document_intelligence_service.analyze_document_complete(text_content, filename)
