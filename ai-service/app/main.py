import time
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config.settings import config
from app.utils.logger import logger
from app.api.middleware import correlation_id_middleware, global_exception_handler

app = FastAPI(title="ShopSphere AI Service")

# Register Exception Handler
@app.exception_handler(Exception)
async def custom_exception_handler(request: Request, exc: Exception):
    response_dict = await global_exception_handler(request, exc)
    return JSONResponse(
        status_code=response_dict["status_code"],
        content=response_dict["content"]
    )

# Middlewares (defined in reverse execution order)
# The last added middleware runs first. 
# Therefore, correlation_id must be added last so it executes first.

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    logger.info(
        "HTTP Request",
        extra={
            "meta": {
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_seconds": round(duration, 4)
            },
            "correlation_id": correlation_id
        }
    )
    return response

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    return await correlation_id_middleware(request, call_next)


@app.on_event("startup")
async def startup_event():
    logger.info(
        "AI Service starting up",
        extra={
            "meta": {
                "port": config["port"],
                "env": config["env"]
            }
        }
    )

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("AI Service shutting down gracefully")

@app.get("/health")
async def health_check():
    """
    Minimal health check endpoint as per API contract.
    Returns liveness status of the AI service.
    """
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=config["port"], reload=False)
