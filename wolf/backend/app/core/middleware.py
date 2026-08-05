from fastapi import FastAPI, Request
import time
from .logging import logger

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    logger.warning("slowapi not installed; rate limiting disabled")
    limiter = None
    RATE_LIMITING_AVAILABLE = False

def add_middlewares(app: FastAPI):
    # Rate limiting (optional)
    if RATE_LIMITING_AVAILABLE and limiter:
        app.state.limiter = limiter
        from slowapi.errors import RateLimitExceeded
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
        return response
