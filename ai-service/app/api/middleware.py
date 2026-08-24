"""
Middleware definitions for FastAPI.
(Definitions only. Application instantiation belongs to FOUNDATION-003)
"""
import uuid
import sys
from typing import Any, Dict
from app.utils.logger import logger

CORRELATION_ID_HEADER = "x-correlation-id"

async def correlation_id_middleware(request: Any, call_next: Any) -> Any:
    """
    Middleware to extract or generate a correlation ID.
    Intended for FastAPI's @app.middleware("http")
    """
    correlation_id = request.headers.get(CORRELATION_ID_HEADER)
    if not correlation_id:
        correlation_id = str(uuid.uuid4())
    
    request.state.correlation_id = correlation_id
    
    response = await call_next(request)
    
    response.headers[CORRELATION_ID_HEADER] = correlation_id
    return response

async def global_exception_handler(request: Any, exc: Exception) -> Dict[str, Any]:
    """
    Centralized error handler for unexpected exceptions.
    Returns a dict structure intended to be wrapped in a JSONResponse by the FastAPI app.
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    logger.error(
        str(exc), 
        extra={
            "correlation_id": correlation_id,
            "meta": {
                "path": request.url.path,
                "method": request.method
            }
        },
        exc_info=sys.exc_info()
    )
    
    return {
        "status_code": 500,
        "content": {
            "error": {
                "message": "Internal Server Error",
                "correlationId": correlation_id,
                "code": "INTERNAL_ERROR"
            }
        }
    }
