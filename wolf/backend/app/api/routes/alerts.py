from fastapi import APIRouter, Request
from typing import List
from app.models.schemas import Alert
from app.core.middleware import limiter, RATE_LIMITING_AVAILABLE

router = APIRouter()

def get_alerts_data():
    return [
        {
            "id": "1",
            "ticker": "NVDA",
            "message": "Belief velocity crossed +5.0 threshold",
            "severity": "high",
            "time": "Just now"
        },
        {
            "id": "2",
            "ticker": "TSLA",
            "message": "Narrative fragility increased by 15% in last 24h",
            "severity": "medium",
            "time": "2 hours ago"
        }
    ]

if RATE_LIMITING_AVAILABLE:
    @router.get("", response_model=List[Alert])
    @limiter.limit("10/minute")
    async def get_alerts(request: Request):
        return get_alerts_data()
else:
    @router.get("", response_model=List[Alert])
    async def get_alerts(request: Request):
        return get_alerts_data()
