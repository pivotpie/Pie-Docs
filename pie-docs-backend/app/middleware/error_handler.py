"""
Global error handler middleware for FastAPI
Handles exceptions and returns consistent error responses
"""
import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import Union
import sys

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base class for API errors"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(APIError):
    """Validation error"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class AuthenticationError(APIError):
    """Authentication error"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(APIError):
    """Authorization error"""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class NotFoundError(APIError):
    """Resource not found error"""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ConflictError(APIError):
    """Conflict error"""
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, status.HTTP_409_CONFLICT)


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    logger.error(f"API Error: {exc.message}", extra={
        "status_code": exc.status_code,
        "details": exc.details,
        "path": request.url.path,
        "method": request.method
    })

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "status_code": exc.status_code,
            "details": exc.details,
            "path": request.url.path
        }
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation errors from Pydantic"""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })

    logger.warning(f"Validation error: {errors}", extra={
        "path": request.url.path,
        "method": request.method
    })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "details": {
                "errors": errors
            },
            "path": request.url.path
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    logger.warning(f"HTTP Exception: {exc.detail}", extra={
        "status_code": exc.status_code,
        "path": request.url.path,
        "method": request.method
    })

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    # Get exception details
    exc_type, exc_value, exc_traceback = sys.exc_info()
    tb_str = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))

    logger.error(f"Unhandled exception: {str(exc)}", extra={
        "exception_type": type(exc).__name__,
        "traceback": tb_str,
        "path": request.url.path,
        "method": request.method
    })

    # In development, return detailed error
    if logger.level == logging.DEBUG:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "details": {
                    "exception": str(exc),
                    "type": type(exc).__name__,
                    "traceback": tb_str
                },
                "path": request.url.path
            }
        )

    # In production, return generic error
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "An unexpected error occurred. Please try again later.",
            "path": request.url.path
        }
    )


def setup_error_handlers(app):
    """Setup all error handlers for the app"""
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("Error handlers configured")
