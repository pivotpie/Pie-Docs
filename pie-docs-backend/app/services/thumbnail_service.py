"""
TASK-BE-002: Thumbnail Generation Service
Priority: P0
Description: Generates thumbnails for documents (PDFs, images)
Estimated Time: 2 hours
Dependencies: TASK-BE-001
"""

import os
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import io
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

# Thumbnail settings
THUMBNAIL_SIZE = (300, 400)  # Width x Height
THUMBNAIL_QUALITY = 85
THUMBNAIL_FORMAT = 'JPEG'

# Try to import PDF libraries
try:
    import fitz  # PyMuPDF
    PDF_SUPPORT = True
except ImportError:
    logger.warning("PyMuPDF not installed. PDF thumbnail generation will be limited.")
    PDF_SUPPORT = False


class ThumbnailService:
    """
    Service for generating thumbnails from various document types
    Supports: Images (JPEG, PNG, GIF, etc.), PDFs
    """

    def __init__(self, size: Tuple[int, int] = THUMBNAIL_SIZE, quality: int = THUMBNAIL_QUALITY):
        """
        Initialize thumbnail service

        Args:
            size: Thumbnail dimensions (width, height)
            quality: JPEG quality (1-100)
        """
        self.size = size
        self.quality = quality

    def generate_from_image(
        self,
        image_path: Path,
        output_path: Path
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate thumbnail from image file

        Args:
            image_path: Path to source image
            output_path: Path where thumbnail should be saved

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Open and convert image
            with Image.open(image_path) as img:
                # Convert to RGB if necessary (for PNG with transparency, etc.)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Create thumbnail (maintains aspect ratio)
                img.thumbnail(self.size, Image.Resampling.LANCZOS)

                # Ensure output directory exists
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Save thumbnail
                img.save(output_path, THUMBNAIL_FORMAT, quality=self.quality, optimize=True)

                logger.info(f"Image thumbnail generated: {output_path}")
                return True, None

        except Exception as e:
            error_msg = f"Failed to generate image thumbnail: {e}"
            logger.error(error_msg)
            return False, error_msg

    def generate_from_pdf(
        self,
        pdf_path: Path,
        output_path: Path,
        page_number: int = 0
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate thumbnail from PDF file (first page by default)

        Args:
            pdf_path: Path to source PDF
            output_path: Path where thumbnail should be saved
            page_number: Page number to generate thumbnail from (0-indexed)

        Returns:
            Tuple of (success, error_message)
        """
        if not PDF_SUPPORT:
            return self._generate_pdf_placeholder(output_path)

        try:
            # Open PDF
            pdf_document = fitz.open(pdf_path)

            # Check if page exists
            if page_number >= len(pdf_document):
                page_number = 0

            # Get page
            page = pdf_document[page_number]

            # Calculate zoom to fit thumbnail size
            # Get page dimensions
            page_rect = page.rect
            page_width = page_rect.width
            page_height = page_rect.height

            # Calculate zoom factor to fit within thumbnail size
            zoom_x = self.size[0] / page_width
            zoom_y = self.size[1] / page_height
            zoom = min(zoom_x, zoom_y) * 2  # *2 for better quality

            # Create matrix for transformation
            mat = fitz.Matrix(zoom, zoom)

            # Render page to image
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Convert to PIL Image
            img_data = pix.tobytes("jpeg")
            img = Image.open(io.BytesIO(img_data))

            # Resize to exact thumbnail size (in case it's larger)
            img.thumbnail(self.size, Image.Resampling.LANCZOS)

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Save thumbnail
            img.save(output_path, THUMBNAIL_FORMAT, quality=self.quality, optimize=True)

            # Close PDF
            pdf_document.close()

            logger.info(f"PDF thumbnail generated: {output_path}")
            return True, None

        except Exception as e:
            error_msg = f"Failed to generate PDF thumbnail: {e}"
            logger.error(error_msg)
            return self._generate_pdf_placeholder(output_path)

    def _generate_pdf_placeholder(
        self,
        output_path: Path
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate a placeholder thumbnail for PDFs when PDF support is unavailable

        Args:
            output_path: Path where placeholder should be saved

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Create a simple placeholder image
            img = Image.new('RGB', self.size, color=(240, 240, 240))
            draw = ImageDraw.Draw(img)

            # Draw PDF icon/text
            try:
                # Try to use a font
                font = ImageFont.truetype("arial.ttf", 40)
            except:
                # Fallback to default font
                font = ImageFont.load_default()

            # Draw text
            text = "PDF"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            position = (
                (self.size[0] - text_width) // 2,
                (self.size[1] - text_height) // 2
            )

            draw.text(position, text, fill=(100, 100, 100), font=font)

            # Draw border
            draw.rectangle(
                [(10, 10), (self.size[0] - 10, self.size[1] - 10)],
                outline=(200, 200, 200),
                width=3
            )

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Save placeholder
            img.save(output_path, THUMBNAIL_FORMAT, quality=self.quality, optimize=True)

            logger.info(f"PDF placeholder thumbnail generated: {output_path}")
            return True, None

        except Exception as e:
            error_msg = f"Failed to generate PDF placeholder: {e}"
            logger.error(error_msg)
            return False, error_msg

    def generate_from_file(
        self,
        file_path: Path,
        output_path: Path,
        file_type: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate thumbnail from any supported file type

        Args:
            file_path: Path to source file
            output_path: Path where thumbnail should be saved
            file_type: File type (pdf, image, etc.) - auto-detected if None

        Returns:
            Tuple of (success, error_message)
        """
        # Auto-detect file type if not provided
        if file_type is None:
            file_extension = file_path.suffix.lower()
            if file_extension == '.pdf':
                file_type = 'pdf'
            elif file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
                file_type = 'image'
            else:
                return False, f"Unsupported file type: {file_extension}"

        # Generate thumbnail based on type
        if file_type == 'pdf':
            return self.generate_from_pdf(file_path, output_path)
        elif file_type == 'image':
            return self.generate_from_image(file_path, output_path)
        else:
            return False, f"Unsupported file type: {file_type}"

    def generate_placeholder(
        self,
        output_path: Path,
        text: str = "No Preview",
        background_color: Tuple[int, int, int] = (240, 240, 240),
        text_color: Tuple[int, int, int] = (100, 100, 100)
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate a generic placeholder thumbnail

        Args:
            output_path: Path where placeholder should be saved
            text: Text to display
            background_color: RGB background color
            text_color: RGB text color

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Create placeholder image
            img = Image.new('RGB', self.size, color=background_color)
            draw = ImageDraw.Draw(img)

            # Try to use a font
            try:
                font = ImageFont.truetype("arial.ttf", 30)
            except:
                font = ImageFont.load_default()

            # Draw text (centered)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            position = (
                (self.size[0] - text_width) // 2,
                (self.size[1] - text_height) // 2
            )

            draw.text(position, text, fill=text_color, font=font)

            # Draw border
            draw.rectangle(
                [(5, 5), (self.size[0] - 5, self.size[1] - 5)],
                outline=(200, 200, 200),
                width=2
            )

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Save placeholder
            img.save(output_path, THUMBNAIL_FORMAT, quality=self.quality, optimize=True)

            logger.info(f"Placeholder thumbnail generated: {output_path}")
            return True, None

        except Exception as e:
            error_msg = f"Failed to generate placeholder: {e}"
            logger.error(error_msg)
            return False, error_msg

    def get_dimensions(self, image_path: Path) -> Optional[Tuple[int, int]]:
        """
        Get dimensions of an image file

        Args:
            image_path: Path to image

        Returns:
            Tuple of (width, height) or None if failed
        """
        try:
            with Image.open(image_path) as img:
                return img.size
        except Exception as e:
            logger.error(f"Failed to get image dimensions: {e}")
            return None


# Singleton instance
thumbnail_service = ThumbnailService()


# Helper functions for convenience
def generate_thumbnail(
    file_path: Path,
    output_path: Path,
    file_type: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to generate thumbnail

    Args:
        file_path: Path to source file
        output_path: Path where thumbnail should be saved
        file_type: File type (auto-detected if None)

    Returns:
        Tuple of (success, error_message)
    """
    return thumbnail_service.generate_from_file(file_path, output_path, file_type)


def generate_pdf_thumbnail(
    pdf_path: Path,
    output_path: Path,
    page_number: int = 0
) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to generate PDF thumbnail

    Args:
        pdf_path: Path to PDF file
        output_path: Path where thumbnail should be saved
        page_number: Page to generate from (0-indexed)

    Returns:
        Tuple of (success, error_message)
    """
    return thumbnail_service.generate_from_pdf(pdf_path, output_path, page_number)


def generate_image_thumbnail(
    image_path: Path,
    output_path: Path
) -> Tuple[bool, Optional[str]]:
    """
    Convenience function to generate image thumbnail

    Args:
        image_path: Path to image file
        output_path: Path where thumbnail should be saved

    Returns:
        Tuple of (success, error_message)
    """
    return thumbnail_service.generate_from_image(image_path, output_path)
