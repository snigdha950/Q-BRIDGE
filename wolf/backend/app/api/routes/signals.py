from fastapi import APIRouter, Request
from typing import List
from app.models.schemas import Signal
from app.services.market_data import build_market_signals
from app.core.middleware import limiter, RATE_LIMITING_AVAILABLE

router = APIRouter()

async def signals_handler(request: Request):
    return await build_market_signals()

if RATE_LIMITING_AVAILABLE:
    @router.get("", response_model=List[Signal])
    @limiter.limit("10/minute")
    async def get_signals(request: Request):
        return await signals_handler(request)
else:
    @router.get("", response_model=List[Signal])
    async def get_signals(request: Request):
        return await signals_handler(request)
