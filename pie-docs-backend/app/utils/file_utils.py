"""
TASK-BE-003: Checksum Calculation Utility
Priority: P0
Description: Calculate file checksums for duplicate detection and integrity
Estimated Time: 1 hour
Dependencies: None
"""

import hashlib
from pathlib import Path
from typing import Tuple, Optional, BinaryIO
import logging

logger = logging.getLogger(__name__)

# Chunk size for reading large files
CHUNK_SIZE = 8192  # 8KB


def calculate_md5(file_path: Path) -> str:
    """
    Calculate MD5 checksum of a file

    Args:
        file_path: Path to file

    Returns:
        MD5 checksum as hexadecimal string

    Raises:
        IOError: If file cannot be read
    """
    try:
        md5_hash = hashlib.md5()

        with open(file_path, 'rb') as f:
            # Read file in chunks to handle large files
            while chunk := f.read(CHUNK_SIZE):
                md5_hash.update(chunk)

        checksum = md5_hash.hexdigest()
        logger.debug(f"MD5 calculated for {file_path.name}: {checksum}")
        return checksum

    except Exception as e:
        logger.error(f"Failed to calculate MD5 for {file_path}: {e}")
        raise IOError(f"Failed to calculate MD5: {e}")


def calculate_sha256(file_path: Path) -> str:
    """
    Calculate SHA256 checksum of a file

    Args:
        file_path: Path to file

    Returns:
        SHA256 checksum as hexadecimal string

    Raises:
        IOError: If file cannot be read
    """
    try:
        sha256_hash = hashlib.sha256()

        with open(file_path, 'rb') as f:
            # Read file in chunks to handle large files
            while chunk := f.read(CHUNK_SIZE):
                sha256_hash.update(chunk)

        checksum = sha256_hash.hexdigest()
        logger.debug(f"SHA256 calculated for {file_path.name}: {checksum}")
        return checksum

    except Exception as e:
        logger.error(f"Failed to calculate SHA256 for {file_path}: {e}")
        raise IOError(f"Failed to calculate SHA256: {e}")


def calculate_checksums(file_path: Path) -> Tuple[str, str]:
    """
    Calculate both MD5 and SHA256 checksums

    Args:
        file_path: Path to file

    Returns:
        Tuple of (md5_checksum, sha256_checksum)

    Raises:
        IOError: If file cannot be read
    """
    try:
        md5_hash = hashlib.md5()
        sha256_hash = hashlib.sha256()

        with open(file_path, 'rb') as f:
            # Read file in chunks and update both hashes simultaneously
            while chunk := f.read(CHUNK_SIZE):
                md5_hash.update(chunk)
                sha256_hash.update(chunk)

        md5_checksum = md5_hash.hexdigest()
        sha256_checksum = sha256_hash.hexdigest()

        logger.debug(f"Checksums calculated for {file_path.name}")
        logger.debug(f"  MD5: {md5_checksum}")
        logger.debug(f"  SHA256: {sha256_checksum}")

        return md5_checksum, sha256_checksum

    except Exception as e:
        logger.error(f"Failed to calculate checksums for {file_path}: {e}")
        raise IOError(f"Failed to calculate checksums: {e}")


def calculate_checksums_from_stream(file_stream: BinaryIO) -> Tuple[str, str]:
    """
    Calculate checksums from a file stream (for uploaded files)

    Args:
        file_stream: Binary file stream

    Returns:
        Tuple of (md5_checksum, sha256_checksum)

    Note:
        This will consume the stream. Make sure to seek(0) if you need to read it again.
    """
    try:
        md5_hash = hashlib.md5()
        sha256_hash = hashlib.sha256()

        # Read stream in chunks
        file_stream.seek(0)  # Ensure we're at the beginning
        while chunk := file_stream.read(CHUNK_SIZE):
            md5_hash.update(chunk)
            sha256_hash.update(chunk)

        # Reset stream position for potential reuse
        file_stream.seek(0)

        md5_checksum = md5_hash.hexdigest()
        sha256_checksum = sha256_hash.hexdigest()

        logger.debug(f"Checksums calculated from stream")
        logger.debug(f"  MD5: {md5_checksum}")
        logger.debug(f"  SHA256: {sha256_checksum}")

        return md5_checksum, sha256_checksum

    except Exception as e:
        logger.error(f"Failed to calculate checksums from stream: {e}")
        raise IOError(f"Failed to calculate checksums: {e}")


def verify_checksum(file_path: Path, expected_checksum: str, algorithm: str = 'sha256') -> bool:
    """
    Verify file checksum matches expected value

    Args:
        file_path: Path to file
        expected_checksum: Expected checksum value
        algorithm: Hash algorithm ('md5' or 'sha256')

    Returns:
        True if checksum matches, False otherwise
    """
    try:
        if algorithm.lower() == 'md5':
            actual_checksum = calculate_md5(file_path)
        elif algorithm.lower() == 'sha256':
            actual_checksum = calculate_sha256(file_path)
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        matches = actual_checksum.lower() == expected_checksum.lower()

        if matches:
            logger.info(f"Checksum verification passed for {file_path.name}")
        else:
            logger.warning(f"Checksum verification failed for {file_path.name}")
            logger.warning(f"  Expected: {expected_checksum}")
            logger.warning(f"  Actual: {actual_checksum}")

        return matches

    except Exception as e:
        logger.error(f"Failed to verify checksum: {e}")
        return False


def get_file_info(file_path: Path) -> dict:
    """
    Get comprehensive file information including checksums

    Args:
        file_path: Path to file

    Returns:
        Dictionary with file information
    """
    try:
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Get file stats
        stat = file_path.stat()

        # Calculate checksums
        md5_checksum, sha256_checksum = calculate_checksums(file_path)

        return {
            'name': file_path.name,
            'path': str(file_path),
            'size_bytes': stat.st_size,
            'size_mb': round(stat.st_size / (1024 * 1024), 2),
            'created': stat.st_ctime,
            'modified': stat.st_mtime,
            'extension': file_path.suffix,
            'md5': md5_checksum,
            'sha256': sha256_checksum,
        }

    except Exception as e:
        logger.error(f"Failed to get file info: {e}")
        raise


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format

    Args:
        size_bytes: File size in bytes

    Returns:
        Formatted string (e.g., "1.5 MB", "234 KB")
    """
    if size_bytes == 0:
        return "0 Bytes"

    units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)

    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1

    return f"{size:.2f} {units[unit_index]}"


def get_mime_type_from_extension(extension: str) -> str:
    """
    Get MIME type from file extension

    Args:
        extension: File extension (with or without dot)

    Returns:
        MIME type string
    """
    # Remove leading dot if present
    ext = extension.lstrip('.').lower()

    mime_types = {
        # Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'rtf': 'application/rtf',

        # Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'tiff': 'image/tiff',
        'ico': 'image/x-icon',

        # Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',

        # Video
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'webm': 'video/webm',

        # Archives
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',

        # Other
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
    }

    return mime_types.get(ext, 'application/octet-stream')


def is_allowed_file_type(filename: str, allowed_extensions: list) -> bool:
    """
    Check if file type is allowed

    Args:
        filename: Filename to check
        allowed_extensions: List of allowed extensions (without dots)

    Returns:
        True if file type is allowed
    """
    extension = Path(filename).suffix.lstrip('.').lower()
    return extension in [ext.lstrip('.').lower() for ext in allowed_extensions]


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to remove dangerous characters

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    import re

    # Remove path components
    filename = Path(filename).name

    # Replace dangerous characters with underscores
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)

    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')

    # Ensure filename is not empty
    if not filename:
        filename = 'unnamed_file'

    return filename
