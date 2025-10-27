"""
LLM Service - Handles text generation using various LLM providers
Supports OpenAI, Anthropic, and local models
"""

from typing import List, Dict, Any, Optional
import logging
from app.config import settings
import os

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.provider = os.getenv('LLM_PROVIDER', 'none').lower()
        self.model = None
        self.client = None

        # Initialize the appropriate LLM provider
        if self.provider == 'openai':
            self._init_openai()
        elif self.provider == 'anthropic':
            self._init_anthropic()
        elif self.provider == 'ollama':
            self._init_ollama()
        else:
            logger.info("No LLM provider configured. Using template-based responses.")

    def _init_openai(self):
        """Initialize OpenAI client"""
        try:
            from openai import OpenAI
            api_key = settings.OPENAI_API_KEY or os.getenv('OPENAI_API_KEY')

            if not api_key:
                logger.warning("OpenAI API key not found. LLM features will be limited.")
                self.provider = 'none'
                return

            self.client = OpenAI(api_key=api_key)
            self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')  # Cost-effective default
            logger.info(f"OpenAI LLM initialized with model: {self.model}")
        except ImportError:
            logger.error("OpenAI package not installed. Run: pip install openai")
            self.provider = 'none'
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI: {e}")
            self.provider = 'none'

    def _init_anthropic(self):
        """Initialize Anthropic Claude client"""
        try:
            from anthropic import Anthropic
            api_key = os.getenv('ANTHROPIC_API_KEY')

            if not api_key:
                logger.warning("Anthropic API key not found.")
                self.provider = 'none'
                return

            self.client = Anthropic(api_key=api_key)
            self.model = os.getenv('ANTHROPIC_MODEL', 'claude-3-haiku-20240307')
            logger.info(f"Anthropic LLM initialized with model: {self.model}")
        except ImportError:
            logger.error("Anthropic package not installed. Run: pip install anthropic")
            self.provider = 'none'
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic: {e}")
            self.provider = 'none'

    def _init_ollama(self):
        """Initialize Ollama for local LLM"""
        try:
            import requests
            # Test Ollama connection
            response = requests.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                self.model = os.getenv('OLLAMA_MODEL', 'llama3.2')
                logger.info(f"Ollama LLM initialized with model: {self.model}")
            else:
                logger.warning("Ollama server not responding")
                self.provider = 'none'
        except Exception as e:
            logger.error(f"Failed to initialize Ollama: {e}")
            self.provider = 'none'

    def generate_rag_response(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        max_tokens: int = 500
    ) -> str:
        """
        Generate a response using RAG context

        Args:
            query: User's question
            context_chunks: Relevant document chunks retrieved
            max_tokens: Maximum response length

        Returns:
            Generated response string
        """
        if not context_chunks:
            return "I couldn't find relevant information to answer your query. Please try rephrasing or ask about different topics."

        # Build context from chunks
        context = self._build_context(context_chunks)

        # Generate response based on provider
        if self.provider == 'openai':
            return self._generate_openai(query, context, max_tokens)
        elif self.provider == 'anthropic':
            return self._generate_anthropic(query, context, max_tokens)
        elif self.provider == 'ollama':
            return self._generate_ollama(query, context, max_tokens)
        else:
            # Fallback to template-based response
            return self._generate_template_response(query, context_chunks)

    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Build context string from document chunks"""
        context_parts = []

        for i, chunk in enumerate(chunks[:5]):  # Top 5 chunks
            title = chunk.get('title', 'Unknown Document')
            content = chunk.get('chunk_content', chunk.get('content', ''))
            similarity = chunk.get('similarity', 0)

            context_parts.append(
                f"[Document: {title}] (Relevance: {similarity:.2f})\n{content}\n"
            )

        return "\n---\n".join(context_parts)

    def _generate_openai(self, query: str, context: str, max_tokens: int) -> str:
        """Generate response using OpenAI"""
        try:
            system_prompt = """You are a helpful document assistant. Answer questions based strictly on the provided context.
If the context doesn't contain enough information to answer the question, say so honestly.
Be concise but thorough. Cite specific documents when possible."""

            user_prompt = f"""Context from documents:
{context}

Question: {query}

Please provide a clear, accurate answer based on the context above."""

            # Build API call parameters
            # Use higher token limit for GPT-5-nano (tested working with 2000)
            completion_tokens = 2000 if self.model.startswith('gpt-5') else max_tokens

            api_params = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_completion_tokens": completion_tokens,
                "timeout": 30,  # Add timeout as used in successful test
            }

            # GPT-5 models only support temperature=1 (default), so exclude temperature parameter
            # GPT-4 and earlier models support custom temperature values
            if not self.model.startswith('gpt-5'):
                api_params["temperature"] = 0.3  # Lower temperature for more factual responses

            # Log what we're sending to the API
            logger.info(f"Calling OpenAI with model={self.model}, max_completion_tokens={completion_tokens}")
            logger.info(f"System prompt length: {len(system_prompt)}, User prompt length: {len(user_prompt)}")

            response = self.client.chat.completions.create(**api_params)

            # Extract and log the response
            content = response.choices[0].message.content
            logger.info(f"GPT-5-nano response length: {len(content) if content else 0}")
            logger.info(f"GPT-5-nano response preview: {content[:100] if content else 'NONE/EMPTY'}")

            if not content:
                logger.warning("GPT-5-nano returned empty/None content!")
                return "I found relevant information but couldn't generate a response. Please try rephrasing your question."

            return content.strip()
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            logger.exception(e)
            return self._generate_template_response(query, [])

    def _generate_anthropic(self, query: str, context: str, max_tokens: int) -> str:
        """Generate response using Anthropic Claude"""
        try:
            system_prompt = """You are a helpful document assistant. Answer questions based strictly on the provided context.
If the context doesn't contain enough information, say so honestly. Be concise but thorough."""

            prompt = f"""Context from documents:
{context}

Question: {query}

Please provide a clear answer based on the context above."""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
            )

            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            return self._generate_template_response(query, [])

    def _generate_ollama(self, query: str, context: str, max_tokens: int) -> str:
        """Generate response using local Ollama"""
        try:
            import requests

            prompt = f"""Context from documents:
{context}

Question: {query}

Answer the question based strictly on the context provided. Be concise and accurate."""

            response = requests.post(
                'http://localhost:11434/api/generate',
                json={
                    'model': self.model,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.3,
                        'num_predict': max_tokens
                    }
                },
                timeout=30
            )

            if response.status_code == 200:
                return response.json()['response'].strip()
            else:
                logger.error(f"Ollama returned status {response.status_code}")
                return self._generate_template_response(query, [])
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            return self._generate_template_response(query, [])

    def _generate_template_response(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Fallback template-based response generation
        Used when no LLM is available
        """
        if not chunks:
            return "I couldn't find relevant information in the documents to answer your query."

        # Build response from chunks
        response_parts = ["Based on the available documents:\n"]

        for i, chunk in enumerate(chunks[:3], 1):
            title = chunk.get('title', 'Unknown')
            content = chunk.get('chunk_content', chunk.get('content', ''))[:200]

            response_parts.append(f"{i}. From '{title}':\n   {content}...")

        response_parts.append(
            f"\n\nThis information is relevant to your query: '{query}'"
        )
        response_parts.append(
            "\n\nNote: For more accurate responses, configure an LLM provider (OpenAI, Anthropic, or Ollama)."
        )

        return "\n".join(response_parts)

    def is_available(self) -> bool:
        """Check if LLM is available and configured"""
        return self.provider != 'none' and self.client is not None

    def get_provider_info(self) -> Dict[str, Any]:
        """Get information about the current LLM provider"""
        return {
            'provider': self.provider,
            'model': self.model,
            'available': self.is_available(),
        }


# Global LLM service instance
llm_service = LLMService()
