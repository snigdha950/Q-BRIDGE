from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.api.routes import trending, stock, signals, alerts, llm
from app.api.websockets import router as ws_router, background_task, memory_safety_task, latency_test_task, redis_listener, heartbeat_task
from app.core.config import settings
from app.core.middleware import add_middlewares
from app.core.logging import logger
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
import asyncio
import socket
import os

try:
    from app.services.ingestion.scheduler import ingestion_worker
except Exception as exc:
    logger.warning(f"Ingestion worker disabled: {exc}")
    ingestion_worker = None

try:
    from app.services.processing.worker import processing_worker
except Exception as exc:
    logger.warning(f"Processing worker disabled: {exc}")
    processing_worker = None

try:
    from app.services.processing.embedding_worker import embedding_worker_loop
except Exception as exc:
    logger.warning(f"Embedding worker disabled: {exc}")
    embedding_worker_loop = None

try:
    from app.services.processing.metrics_worker import metrics_worker_loop
except Exception as exc:
    logger.warning(f"Metrics worker disabled: {exc}")
    metrics_worker_loop = None

logger.info("Module imports completed successfully. Creating FastAPI app.")

app = FastAPI(
    title="Q-Belief Net API",
    description="Financial belief intelligence system API",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middlewares (logging, rate limiting)
add_middlewares(app)

# Include routers
app.include_router(trending.router, prefix="/api/trending", tags=["trending"])
app.include_router(stock.router, prefix="/api/stock", tags=["stock"])
app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(ws_router, tags=["websocket"])

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception from {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/")
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


def redis_is_available(redis_url: str | None = None, host: str = "localhost", port: int = 6379, timeout: float = 0.5) -> bool:
    try:
        # Prefer explicit REDIS_URL from settings or env when present
        from urllib.parse import urlparse

        url = redis_url or getattr(settings, 'REDIS_URL', None) or os.getenv('REDIS_URL')
        if url:
            parsed = urlparse(url)
            host = parsed.hostname or host
            port = parsed.port or port

        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Executing startup event...")
        redis_available = redis_is_available()
        logger.info(f"Redis available: {redis_available}")
        asyncio.create_task(background_task())
        if ingestion_worker:
            asyncio.create_task(ingestion_worker())
        if processing_worker and redis_available:
            asyncio.create_task(processing_worker())
        if embedding_worker_loop and redis_available:
            asyncio.create_task(embedding_worker_loop())
        if metrics_worker_loop and redis_available:
            asyncio.create_task(metrics_worker_loop())
        elif not redis_available:
            logger.info("Redis is unavailable; skipping processing, embedding, metrics, and Redis listener tasks.")
        asyncio.create_task(memory_safety_task())
        asyncio.create_task(latency_test_task())
        if redis_available:
            asyncio.create_task(redis_listener())
        asyncio.create_task(heartbeat_task())
    except Exception as e:
        logger.error("Startup event failed", exc_info=True)
        logger.info("App startup completed despite errors.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
