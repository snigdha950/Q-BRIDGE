import json
from typing import Annotated, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_ignore_empty=True, 
        extra="ignore"
    )

    PROJECT_NAME: str = "Q-Belief Net API"
    # Allow frontend domain (modify as needed for production)
    ALLOWED_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000", "http://localhost:5173"]
    RAPIDAPI_KEY: str | None = None
    RAPIDAPI_HOST: str = "apidojo-yahoo-finance-v1.p.rapidapi.com"
    YOUTUBE_API_KEY: str | None = None
    WEBSHARE_USERNAME: str | None = None
    WEBSHARE_PASSWORD: str | None = None
    REDDIT_CLIENT_ID: str | None = None
    REDDIT_CLIENT_SECRET: str | None = None
    REDDIT_USER_AGENT: str = "Q-Belief Net/1.0"
    STOCKTWITS_TOKEN: str | None = None
    MARKET_DATA_TICKERS: str = "NVDA,TSLA,AAPL,AMD,MSFT,META,AMZN,GOOGL,PLTR,SMCI,COIN,MARA,JPM,UNH,XOM,V,JNJ,WMT,PG,MA"
    REDIS_URL: str | None = None

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, list):
            return [origin.strip().rstrip("/") for origin in value if isinstance(origin, str) and origin.strip()]

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []

            # Accept JSON arrays in env, but gracefully fall back to comma-separated values.
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [
                            origin.strip().rstrip("/")
                            for origin in parsed
                            if isinstance(origin, str) and origin.strip()
                        ]
                except json.JSONDecodeError:
                    pass

            return [origin.strip().rstrip("/") for origin in stripped.split(",") if origin.strip()]

        return ["http://localhost:3000", "http://localhost:5173"]

settings = Settings()
