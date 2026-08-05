import asyncio

from fastapi import APIRouter, Request
from typing import List
from app.models.schemas import TrendingStock
from app.services.market_data import build_trending_stocks
from app.services.mock_data import generate_mock_trending_data
from app.core.middleware import limiter, RATE_LIMITING_AVAILABLE

router = APIRouter()

if RATE_LIMITING_AVAILABLE:
    @router.get("", response_model=List[TrendingStock])
    @limiter.limit("10/minute")
    async def get_trending(request: Request):
        try:
            return await asyncio.wait_for(build_trending_stocks(), timeout=4.0)
        except asyncio.TimeoutError:
            return generate_mock_trending_data()
else:
    @router.get("", response_model=List[TrendingStock])
    async def get_trending(request: Request):
        try:
            return await asyncio.wait_for(build_trending_stocks(), timeout=4.0)
        except asyncio.TimeoutError:
            return generate_mock_trending_data()
