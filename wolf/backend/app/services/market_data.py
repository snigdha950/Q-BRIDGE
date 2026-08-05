from __future__ import annotations

import asyncio
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

import aiohttp

from app.core.config import settings
from app.core.logging import logger
from app.services.mock_data import generate_mock_stock_data, generate_mock_trending_data

# RapidAPI endpoints for Yahoo Finance
RAPIDAPI_CHART_URL = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-chart"
RAPIDAPI_PROFILE_URL = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/get-fundamentals"
RAPIDAPI_SEARCH_URL = "https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete"

# Fallback direct URLs (in case RapidAPI fails)
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
YAHOO_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"
STOCKTWITS_STREAM_URL = "https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json"
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

def _get_rapidapi_headers() -> dict[str, str]:
    """Get headers for RapidAPI requests"""
    host = settings.RAPIDAPI_HOST or "apidojo-yahoo-finance-v1.p.rapidapi.com"
    return {
        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
        "X-RapidAPI-Host": host,
        "User-Agent": "Mozilla/5.0",
    } if settings.RAPIDAPI_KEY else {}

DEFAULT_TICKERS = [
    ticker.strip().upper()
    for ticker in settings.MARKET_DATA_TICKERS.split(",")
    if ticker.strip()
]


@dataclass
class SocialInsight:
    source: str
    title: str
    description: str
    impact: str
    timestamp: str


async def _fetch_json(
    session: aiohttp.ClientSession,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    timeout: int = 15,
    log_failure: bool = True,
) -> dict[str, Any] | list[Any] | None:
    try:
        async with session.get(url, headers=headers, params=params, timeout=timeout) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "json" in content_type or url.endswith(".json"):
                return await response.json()
            text = await response.text()
            return json.loads(text)
    except Exception as exc:
        if log_failure:
            logger.warning("Request failed for %s: %s", url, exc)
        return None


async def _session() -> aiohttp.ClientSession:
    timeout = aiohttp.ClientTimeout(total=20)
    return aiohttp.ClientSession(timeout=timeout)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


async def fetch_yahoo_chart(ticker: str) -> dict[str, Any] | None:
    async with await _session() as session:
        headers = _get_rapidapi_headers()

        if headers.get("X-RapidAPI-Key"):
            payload = await _fetch_json(
                session,
                RAPIDAPI_CHART_URL,
                params={"symbol": ticker, "region": "US", "interval": "1d", "range": "1mo"},
                headers=headers,
                log_failure=False,
            )
            if payload:
                logger.info(f"Successfully fetched {ticker} chart from RapidAPI")
        else:
            logger.info(f"Skipping chart fetch for {ticker}: RapidAPI key not configured")
            payload = None

    if not payload or not isinstance(payload, dict):
        return None

    result = (payload.get("chart") or {}).get("result") or []
    if not result:
        return None

    chart = result[0]
    timestamps = chart.get("timestamp") or []
    indicators = (chart.get("indicators") or {}).get("quote") or []
    if not timestamps or not indicators:
        return None

    prices = indicators[0].get("close") or []
    points = []
    for ts, price in zip(timestamps, prices):
        if price is None:
            continue
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        points.append({"date": dt.strftime("%b %d"), "price": price})
    return {"chart": chart, "points": points}


async def fetch_yahoo_profile(ticker: str) -> dict[str, Any] | None:
    async with await _session() as session:
        headers = _get_rapidapi_headers()

        if headers.get("X-RapidAPI-Key"):
            payload = await _fetch_json(
                session,
                RAPIDAPI_PROFILE_URL,
                params={
                    "symbol": ticker,
                    "region": "US",
                    "lang": "en-US",
                    "modules": "price,assetProfile,summaryProfile,defaultKeyStatistics",
                },
                headers=headers,
                log_failure=False,
            )
            if payload:
                logger.info(f"Successfully fetched {ticker} profile from RapidAPI")
        else:
            logger.info(f"Skipping profile fetch for {ticker}: RapidAPI key not configured")
            payload = None

    if not payload or not isinstance(payload, dict):
        return None

    if "quoteSummary" not in payload and any(key in payload for key in ("assetProfile", "summaryProfile", "fundProfile")):
        return payload

    result = (payload.get("quoteSummary") or {}).get("result") or []
    if not result:
        return None

    return result[0]


async def fetch_yahoo_search(ticker: str) -> dict[str, Any] | None:
    async with await _session() as session:
        headers = _get_rapidapi_headers()

        if headers.get("X-RapidAPI-Key"):
            payload = await _fetch_json(
                session,
                RAPIDAPI_SEARCH_URL,
                params={"region": "US", "q": ticker},
                headers=headers,
                log_failure=False,
            )
        else:
            payload = await _fetch_json(
                session,
                YAHOO_SEARCH_URL,
                params={"q": ticker, "quotesCount": 1, "newsCount": 0},
                headers={"User-Agent": "Mozilla/5.0"},
            )
    if not payload or not isinstance(payload, dict):
        return None

    if "quotes" not in payload and "news" not in payload and any(key in payload for key in ("symbol", "shortname", "longname")):
        return payload

    quotes = payload.get("quotes") or []
    return quotes[0] if quotes else None


async def fetch_stocktwits_insights(ticker: str) -> list[SocialInsight]:
    async with await _session() as session:
        payload = await _fetch_json(
            session,
            STOCKTWITS_STREAM_URL.format(ticker=ticker),
            headers={"User-Agent": settings.REDDIT_USER_AGENT or "Q-Belief Net/1.0"},
            log_failure=False,
        )
    if not payload or not isinstance(payload, dict):
        return []

    messages = payload.get("messages") or []
    insights: list[SocialInsight] = []
    for message in messages[:5]:
        body = (message or {}).get("body") or ""
        if not body:
            continue
        user = (message.get("user") or {}).get("username") or "stocktwits"
        created_at = message.get("created_at") or ""
        insights.append(
            SocialInsight(
                source="Stocktwits",
                title=f"{ticker} chatter from @{user}",
                description=body[:160],
                impact="medium",
                timestamp=created_at or "recent",
            )
        )
    return insights


async def fetch_reddit_insights(ticker: str) -> list[SocialInsight]:
    async with await _session() as session:
        payload = await _fetch_json(
            session,
            REDDIT_SEARCH_URL,
            params={"q": f"{ticker} stock", "limit": 5, "sort": "hot", "t": "week"},
            headers={"User-Agent": settings.REDDIT_USER_AGENT or "Q-Belief Net/1.0"},
            log_failure=False,
        )
    if not payload or not isinstance(payload, dict):
        return []

    posts = ((payload.get("data") or {}).get("children") or [])[:5]
    insights: list[SocialInsight] = []
    for post in posts:
        data = post.get("data") or {}
        title = data.get("title") or ""
        if not title:
            continue
        subreddit = data.get("subreddit") or "reddit"
        score = _safe_int(data.get("score"), 0)
        insights.append(
            SocialInsight(
                source="Reddit",
                title=f"r/{subreddit}: {title[:90]}",
                description=f"Score {score} | {data.get('url', '')}".strip(),
                impact="medium" if score > 50 else "low",
                timestamp="recent",
            )
        )
    return insights


async def fetch_youtube_insights(ticker: str) -> list[SocialInsight]:
    if not settings.YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY is not configured; skipping YouTube signals for %s", ticker)
        return []

    async with await _session() as session:
        payload = await _fetch_json(
            session,
            YOUTUBE_SEARCH_URL,
            params={
                "part": "snippet",
                "q": f"{ticker} stock",
                "type": "video",
                "maxResults": 5,
                "order": "viewCount",
                "key": settings.YOUTUBE_API_KEY,
            },
        )

    if not payload or not isinstance(payload, dict):
        return []

    items = payload.get("items") or []
    insights: list[SocialInsight] = []
    for item in items:
        snippet = item.get("snippet") or {}
        title = snippet.get("title") or ""
        if not title:
            continue
        channel = snippet.get("channelTitle") or "YouTube"
        published_at = snippet.get("publishedAt") or "recent"
        insights.append(
            SocialInsight(
                source="YouTube",
                title=title[:90],
                description=f"{channel} | {snippet.get('description', '')[:140]}",
                impact="medium",
                timestamp=published_at,
            )
        )
    return insights


async def fetch_social_insights(ticker: str) -> list[SocialInsight]:
    results = await asyncio.gather(
        fetch_youtube_insights(ticker),
        fetch_reddit_insights(ticker),
        fetch_stocktwits_insights(ticker),
        return_exceptions=True,
    )

    insights: list[SocialInsight] = []
    for result in results:
        if isinstance(result, Exception):
            logger.warning("Social insight fetch failed for %s: %s", ticker, result)
            continue
        insights.extend(result)
    return insights


def _bucket_social_insights(insights: list[SocialInsight], source: str, limit: int = 2) -> list[SocialInsight]:
    return [insight for insight in insights if insight.source == source][:limit]


async def fetch_stock_summary(ticker: str) -> dict[str, Any] | None:
    chart_task = fetch_yahoo_chart(ticker)
    profile_task = fetch_yahoo_profile(ticker)
    search_task = fetch_yahoo_search(ticker)
    chart, profile, search = await asyncio.gather(chart_task, profile_task, search_task)

    if not chart and not profile and not search:
        return None

    points = (chart or {}).get("points") or []
    if len(points) < 2:
        return None

    first_close = _safe_float(points[0]["price"])
    last_close = _safe_float(points[-1]["price"])
    change_pct = ((last_close - first_close) / first_close * 100.0) if first_close else 0.0
    velocity = round(change_pct / max(len(points) - 1, 1), 2)
    belief = int(_clamp(50 + (change_pct * 1.8) + (velocity * 6)))
    sentiment = "bullish" if change_pct >= 0 else "bearish"

    quote_type = (search or {}).get("quoteType") or {}
    if not isinstance(quote_type, dict):
        quote_type = {}
    price_info = (profile or {}).get("price") or {}
    asset_profile = (profile or {}).get("assetProfile") or {}
    stats = (profile or {}).get("defaultKeyStatistics") or {}
    market_cap = price_info.get("marketCap") or stats.get("marketCap") or {}
    sector = asset_profile.get("sector") or "Technology"
    long_name = price_info.get("longName") or (search.get("longname") if isinstance(search, dict) else None)
    short_name = price_info.get("shortName") or quote_type.get("shortName") or f"{ticker} Inc."

    return {
        "ticker": ticker.upper(),
        "name": long_name or short_name or f"{ticker.upper()} Corporation",
        "beliefScore": belief,
        "sentiment": sentiment,
        "velocity": velocity,
        "sector": sector,
        "marketCap": _market_cap_label(_safe_float(market_cap.get("raw") if isinstance(market_cap, dict) else market_cap)),
        "sparkline": [
            {"time": index, "value": round(_safe_float(point["price"]), 2)}
            for index, point in enumerate(points[-20:])
        ],
        "priceChangePct": round(change_pct, 2),
        "lastPrice": round(last_close, 2),
        "source": "Yahoo Finance",
    }


def _market_cap_label(value: float) -> str:
    if value >= 200_000_000_000:
        return "Mega"
    if value >= 10_000_000_000:
        return "Large"
    if value >= 2_000_000_000:
        return "Mid"
    return "Small"


async def build_trending_stocks(tickers: Iterable[str] | None = None) -> list[dict[str, Any]]:
    universe = list(tickers or DEFAULT_TICKERS)
    if not universe:
        return generate_mock_trending_data()

    tasks = [fetch_stock_summary(ticker) for ticker in universe]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    stocks: list[dict[str, Any]] = []
    for index, result in enumerate(results):
        ticker = universe[index]
        if isinstance(result, Exception) or not result:
            logger.warning("Falling back to mock trending data for %s", ticker)
            fallback = next((stock for stock in generate_mock_trending_data() if stock["ticker"] == ticker), None)
            if fallback:
                stocks.append(fallback)
            continue

        stock = dict(result)
        stock.update({
            "id": str(index),
            "name": stock.get("name") or f"{ticker} Inc.",
        })
        stocks.append(stock)

    if not stocks:
        return generate_mock_trending_data()

    return sorted(stocks, key=lambda item: item.get("beliefScore", 0), reverse=True)


async def build_stock_detail(ticker: str) -> dict[str, Any]:
    summary = await fetch_stock_summary(ticker)
    if not summary:
        return generate_mock_stock_data(ticker)

    insights = await fetch_social_insights(ticker)
    chart_points = summary.get("sparkline") or []
    price_base = chart_points[0]["value"] if chart_points else summary.get("lastPrice", 0.0)
    belief = summary.get("beliefScore", 50)
    signal = "Bullish" if summary.get("sentiment") == "bullish" else "Bearish"

    chart_data = []
    for index, point in enumerate(chart_points[-30:] or []):
        price = _safe_float(point["value"])
        belief_value = _clamp(belief + math.sin(index / 4) * 4)
        chart_data.append(
            {
                "date": f"Day {index + 1}",
                "price": f"{price:.2f}",
                "belief": f"{belief_value:.1f}",
            }
        )

    if not chart_data:
        return generate_mock_stock_data(ticker)

    dominant_sector = summary.get("sector") or "Technology"
    momentum_label = f"{summary.get('velocity', 0):+.2f} avg momentum"
    trend_label = f"{summary.get('priceChangePct', 0):+.2f}% over 1 month"

    return {
        "ticker": summary["ticker"],
        "name": summary["name"],
        "beliefScore": belief,
        "signal": signal,
        "metrics": {
            "coherence": f"{_clamp(60 + (belief - 50) * 0.8):.1f}",
            "velocity": f"{summary.get('velocity', 0):+.2f}",
            "fragility": f"{_clamp(100 - belief):.1f}",
        },
        "chartData": chart_data,
        "clusters": sorted([
            {"label": f"Price trend: {trend_label}", "dominance": 88, "color": "#2dd4bf"},
            {"label": f"Sector focus: {dominant_sector}", "dominance": 72, "color": "#a78bfa"},
            {"label": f"Momentum: {momentum_label}", "dominance": 61, "color": "#facc15"},
            {"label": "Social chatter", "dominance": 44, "color": "#fb7185"},
        ], key=lambda item: item["dominance"], reverse=True),
        "network": {
            "nodes": [
                {"id": "1", "label": "Price Trend", "x": 50, "y": 30, "size": 24},
                {"id": "2", "label": dominant_sector, "x": 80, "y": 50, "size": 32},
                {"id": "3", "label": "Social Insight", "x": 20, "y": 60, "size": 18},
                {"id": "4", "label": "Momentum", "x": 50, "y": 80, "size": 28},
            ],
            "edges": [
                {"source": "1", "target": "2"},
                {"source": "2", "target": "4"},
                {"source": "1", "target": "3"},
            ],
        },
        "timeline": [
            *[
                {
                    "time": insight.timestamp,
                    "event": f"{insight.source}: {insight.title}",
                    "sentiment": "bullish" if insight.impact != "low" else "neutral",
                }
                for insight in insights[:4]
            ],
            {
                "time": "1m ago",
                "event": f"Yahoo Finance price snapshot: {summary.get('priceChangePct', 0):+.2f}%",
                "sentiment": summary.get("sentiment", "neutral"),
            },
        ],
    }


async def build_market_signals() -> list[dict[str, Any]]:
    tickers = DEFAULT_TICKERS[:8]
    signals: list[dict[str, Any]] = []

    for ticker in tickers:
        summary = await fetch_stock_summary(ticker)
        insights = await fetch_social_insights(ticker)
        if not summary and not insights:
            continue

        if summary:
            signals.append(
                {
                    "id": f"yahoo-{ticker}",
                    "type": "price_momentum",
                    "title": f"{ticker} price momentum from Yahoo Finance",
                    "description": f"{summary.get('name', ticker)} is showing a {summary.get('priceChangePct', 0):+.2f}% move over the last month.",
                    "impact": "high" if abs(summary.get("priceChangePct", 0)) >= 8 else "medium",
                    "timestamp": "live",
                }
            )

        for insight in [
            *_bucket_social_insights(insights, "Reddit", 2),
            *_bucket_social_insights(insights, "YouTube", 2),
            *_bucket_social_insights(insights, "Stocktwits", 1),
        ]:
            signals.append(
                {
                    "id": f"{insight.source.lower()}-{ticker}-{len(signals)}",
                    "type": insight.source.lower(),
                    "title": insight.title,
                    "description": insight.description,
                    "impact": insight.impact,
                    "timestamp": insight.timestamp,
                }
            )

    if not signals:
        return [
            {
                "id": "fallback-1",
                "type": "fallback",
                "title": "Using mock signals",
                "description": "Live sources are currently unavailable, so the dashboard is showing mock data.",
                "impact": "low",
                "timestamp": "now",
            }
        ]

    return signals[:12]
