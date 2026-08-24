"""
Centralized configuration validation for the AI Service.
Loads the project-level .env file and validates required settings.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv


# Project root: shopsphere-ai/
# Load the shared project-level .env file.
ENV_FILE = Path(__file__).resolve().parents[3] / ".env"

load_dotenv(ENV_FILE)


def validate_env():
    required_vars = [
        "PYTHON_ENV",
        "AI_SERVICE_PORT",
    ]

    missing = [var for var in required_vars if not os.environ.get(var)]

    if missing:
        print(
            f"[FATAL] Missing required environment variables: {', '.join(missing)}",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        port = int(os.environ["AI_SERVICE_PORT"])
    except ValueError:
        print(
            "[FATAL] AI_SERVICE_PORT must be a valid integer",
            file=sys.stderr,
        )
        sys.exit(1)

    return {
        "env": os.environ["PYTHON_ENV"],
        "port": port,
    }


config = validate_env()