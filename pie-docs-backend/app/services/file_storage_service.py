"""
TASK-BE-001: File Storage Service
Priority: P0 - CRITICAL
Description: Handles file storage operations (local/cloud)
Estimated Time: 3 hours
"""

import os
import shutil
from pathlib import Path
from typing import Optional, Tuple, BinaryIO
from datetime import datetime
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

# Storage configuration
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', 'uploads'))
THUMBNAIL_DIR = UPLOAD_DIR / 'thumbnails'
PREVIEW_DIR = UPLOAD_DIR / 'previews'
TEMP_DIR = UPLOAD_DIR / 'temp'

# Ensure directories exist
for directory in [UPLOAD_DIR, THUMBNAIL_DIR, PREVIEW_DIR, TEMP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


class FileStorageService:
    """
    Service for managing file storage operations
    Supports local filesystem (with future cloud storage options)
    """

    def __init__(self, storage_type: str = 'local'):
        """
        Initialize file storage service

        Args:
            storage_type: Type of storage (local, s3, azure)
        """
        self.storage_type = storage_type
        self.base_dir = UPLOAD_DIR

    def generate_file_path(
        self,
        document_id: UUID,
        original_filename: str,
        storage_type: str = 'document'
    ) -> Path:
        """
        Generate organized file path for document

        Structure: uploads/{storage_type}/{year}/{month}/{document_id}_{filename}

        Args:
            document_id: Document UUID
            original_filename: Original filename
            storage_type: Type of file (document, thumbnail, preview)

        Returns:
            Path object for file storage
        """
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')

        # Get file extension
        file_ext = Path(original_filename).suffix

        # Create filename: {document_id}_{timestamp}{ext}
        timestamp = now.strftime('%Y%m%d_%H%M%S')
        new_filename = f"{document_id}_{timestamp}{file_ext}"

        # Determine base directory
        if storage_type == 'thumbnail':
            base = THUMBNAIL_DIR
        elif storage_type == 'preview':
            base = PREVIEW_DIR
        else:
            base = self.base_dir

        # Create path: base/year/month/filename
        file_path = base / year / month / new_filename

        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        return file_path

    def save_file(
        self,
        file_content: BinaryIO,
        document_id: UUID,
        original_filename: str,
        storage_type: str = 'document'
    ) -> Tuple[str, int]:
        """
        Save file to storage

        Args:
            file_content: File-like object with file data
            document_id: Document UUID
            original_filename: Original filename
            storage_type: Type of file (document, thumbnail, preview)

        Returns:
            Tuple of (storage_path, file_size)

        Raises:
            IOError: If file save fails
        """
        try:
            # Generate storage path
            file_path = self.generate_file_path(
                document_id,
                original_filename,
                storage_type
            )

            # Save file
            logger.info(f"Saving file to: {file_path}")

            with open(file_path, 'wb') as f:
                shutil.copyfileobj(file_content, f)

            # Get file size
            file_size = file_path.stat().st_size

            # Return relative path from upload directory
            relative_path = str(file_path.relative_to(UPLOAD_DIR))

            logger.info(f"File saved successfully: {relative_path} ({file_size} bytes)")

            return relative_path, file_size

        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise IOError(f"Failed to save file: {e}")

    def save_uploaded_file(
        self,
        uploaded_file,
        document_id: UUID
    ) -> Tuple[str, int]:
        """
        Save uploaded file from FastAPI UploadFile

        Args:
            uploaded_file: FastAPI UploadFile object
            document_id: Document UUID

        Returns:
            Tuple of (storage_path, file_size)
        """
        return self.save_file(
            uploaded_file.file,
            document_id,
            uploaded_file.filename,
            storage_type='document'
        )

    def get_file_path(self, relative_path: str) -> Path:
        """
        Get absolute file path from relative path

        Args:
            relative_path: Relative path from upload directory

        Returns:
            Absolute Path object
        """
        return UPLOAD_DIR / relative_path

    def file_exists(self, relative_path: str) -> bool:
        """
        Check if file exists

        Args:
            relative_path: Relative path from upload directory

        Returns:
            True if file exists, False otherwise
        """
        file_path = self.get_file_path(relative_path)
        return file_path.exists() and file_path.is_file()

    def delete_file(self, relative_path: str) -> bool:
        """
        Delete file from storage

        Args:
            relative_path: Relative path from upload directory

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            file_path = self.get_file_path(relative_path)

            if file_path.exists():
                file_path.unlink()
                logger.info(f"File deleted: {relative_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {relative_path}")
                return False

        except Exception as e:
            logger.error(f"Failed to delete file {relative_path}: {e}")
            return False

    def delete_document_files(
        self,
        storage_path: Optional[str] = None,
        thumbnail_path: Optional[str] = None,
        preview_path: Optional[str] = None
    ) -> Tuple[bool, bool, bool]:
        """
        Delete all files associated with a document

        Args:
            storage_path: Main document file path
            thumbnail_path: Thumbnail file path
            preview_path: Preview file path

        Returns:
            Tuple of (document_deleted, thumbnail_deleted, preview_deleted)
        """
        doc_deleted = self.delete_file(storage_path) if storage_path else True
        thumb_deleted = self.delete_file(thumbnail_path) if thumbnail_path else True
        preview_deleted = self.delete_file(preview_path) if preview_path else True

        return doc_deleted, thumb_deleted, preview_deleted

    def get_file_size(self, relative_path: str) -> Optional[int]:
        """
        Get file size in bytes

        Args:
            relative_path: Relative path from upload directory

        Returns:
            File size in bytes, or None if file doesn't exist
        """
        try:
            file_path = self.get_file_path(relative_path)
            if file_path.exists():
                return file_path.stat().st_size
            return None
        except Exception as e:
            logger.error(f"Failed to get file size for {relative_path}: {e}")
            return None

    def move_file(
        self,
        source_path: str,
        dest_document_id: UUID,
        new_filename: Optional[str] = None
    ) -> str:
        """
        Move file to new location

        Args:
            source_path: Current relative path
            dest_document_id: New document ID
            new_filename: New filename (optional)

        Returns:
            New relative path

        Raises:
            IOError: If move fails
        """
        try:
            source_full_path = self.get_file_path(source_path)

            if not source_full_path.exists():
                raise FileNotFoundError(f"Source file not found: {source_path}")

            # Get original filename if not provided
            if new_filename is None:
                new_filename = source_full_path.name

            # Generate new path
            new_path = self.generate_file_path(
                dest_document_id,
                new_filename,
                storage_type='document'
            )

            # Move file
            shutil.move(str(source_full_path), str(new_path))

            # Return new relative path
            return str(new_path.relative_to(UPLOAD_DIR))

        except Exception as e:
            logger.error(f"Failed to move file: {e}")
            raise IOError(f"Failed to move file: {e}")

    def copy_file(
        self,
        source_path: str,
        dest_document_id: UUID,
        new_filename: Optional[str] = None
    ) -> str:
        """
        Copy file to new location

        Args:
            source_path: Current relative path
            dest_document_id: New document ID
            new_filename: New filename (optional)

        Returns:
            New relative path

        Raises:
            IOError: If copy fails
        """
        try:
            source_full_path = self.get_file_path(source_path)

            if not source_full_path.exists():
                raise FileNotFoundError(f"Source file not found: {source_path}")

            # Get original filename if not provided
            if new_filename is None:
                new_filename = source_full_path.name

            # Generate new path
            new_path = self.generate_file_path(
                dest_document_id,
                new_filename,
                storage_type='document'
            )

            # Copy file
            shutil.copy2(str(source_full_path), str(new_path))

            # Return new relative path
            return str(new_path.relative_to(UPLOAD_DIR))

        except Exception as e:
            logger.error(f"Failed to copy file: {e}")
            raise IOError(f"Failed to copy file: {e}")

    def get_storage_stats(self) -> dict:
        """
        Get storage statistics

        Returns:
            Dictionary with storage statistics
        """
        total_size = 0
        file_count = 0

        for file_path in UPLOAD_DIR.rglob('*'):
            if file_path.is_file():
                file_count += 1
                total_size += file_path.stat().st_size

        return {
            'total_files': file_count,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'total_size_gb': round(total_size / (1024 * 1024 * 1024), 2),
            'storage_type': self.storage_type,
            'base_directory': str(UPLOAD_DIR.absolute())
        }


# Singleton instance
file_storage_service = FileStorageService()


# Helper functions for convenience
def save_uploaded_file(uploaded_file, document_id: UUID) -> Tuple[str, int]:
    """Convenience function to save uploaded file"""
    return file_storage_service.save_uploaded_file(uploaded_file, document_id)


def get_file_path(relative_path: str) -> Path:
    """Convenience function to get file path"""
    return file_storage_service.get_file_path(relative_path)


def delete_file(relative_path: str) -> bool:
    """Convenience function to delete file"""
    return file_storage_service.delete_file(relative_path)


def file_exists(relative_path: str) -> bool:
    """Convenience function to check if file exists"""
    return file_storage_service.file_exists(relative_path)
