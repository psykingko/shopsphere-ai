import logging
import json
from datetime import datetime
from typing import Any, Dict, Optional

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        
        # Add correlation ID if present in the record
        if hasattr(record, "correlation_id"):
            log_obj["correlationId"] = record.correlation_id
            
        # Add any extra dictionary attributes passed
        if hasattr(record, "meta") and isinstance(record.meta, dict):
            log_obj.update(record.meta)
            
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def setup_logger(name: str = "ai_service") -> logging.Logger:
    logger = logging.getLogger(name)
    
    # Avoid adding multiple handlers if already set up
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
