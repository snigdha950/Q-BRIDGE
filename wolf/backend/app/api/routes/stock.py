from fastapi import APIRouter, Request
from app.models.schemas import StockDetail
from app.services.market_data import build_stock_detail
from app.core.middleware import limiter, RATE_LIMITING_AVAILABLE

router = APIRouter()

if RATE_LIMITING_AVAILABLE:
    @router.get("/{ticker}", response_model=StockDetail)
    @limiter.limit("20/minute")
    async def get_stock_detail(request: Request, ticker: str):
        return await build_stock_detail(ticker)
else:
    @router.get("/{ticker}", response_model=StockDetail)
    async def get_stock_detail(request: Request, ticker: str):
        return await build_stock_detail(ticker)
