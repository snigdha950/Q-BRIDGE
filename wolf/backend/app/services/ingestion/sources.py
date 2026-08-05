import asyncio
import time
import aiohttp
import urllib.parse
from typing import List, Dict
from app.core.logging import logger
from app.core.config import settings
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.proxies import WebshareProxyConfig

# In a production environment, these would be initialized with real credentials
# import praw

async def fetch_reddit() -> List[Dict]:
    """Fetch posts from Reddit using PRAW (simulated async)."""
    results = []
    try:
        # Simulated async I/O for PRAW
        await asyncio.sleep(0.5)
        # Mock data
        results.append({
            "text": "Discussion: TSLA margins compressing but FSD v12 is a game changer.",
            "source": "reddit",
            "timestamp": int(time.time())
        })
    except Exception as e:
        logger.error(f"Reddit ingestion error: {e}")
    return results

async def fetch_twitter() -> List[Dict]:
    """Fetch tweets using snscrape/API (simulated async)."""
    results = []
    try:
        await asyncio.sleep(0.5)
        results.append({
            "text": "Unusual options activity detected on $NVDA ahead of earnings. #stocks",
            "source": "twitter",
            "timestamp": int(time.time())
        })
    except Exception as e:
        logger.error(f"Twitter ingestion error: {e}")
    return results

async def fetch_news() -> List[Dict]:
    """Fetch articles from News APIs using aiohttp."""
    results = []
    try:
        await asyncio.sleep(0.5)
        results.append({
            "text": "Federal Reserve signals potential rate cuts by Q3, markets rally.",
            "source": "news",
            "timestamp": int(time.time())
        })
    except Exception as e:
        logger.error(f"News ingestion error: {e}")
    return results

YOUTUBE_API_KEY = settings.YOUTUBE_API_KEY
YOUTUBE_QUERIES = ["stock news", "TSLA analysis", "NVDA earnings"]


def _build_youtube_item(*, title: str, channel: str, description: str, views: int, text: str | None = None) -> Dict:
    fallback_text = text or " | ".join(part for part in [title, channel, description] if part)
    return {
        "text": fallback_text,
        "source": "youtube",
        "meta": {
            "title": title,
            "channel": channel,
            "views": views,
            "description": description,
        },
    }

async def fetch_youtube() -> List[Dict]:
    """Fetch transcripts using YouTube Data API and youtube-transcript-api."""
    results = []
    try:
        if not YOUTUBE_API_KEY:
            logger.warning("YouTube API key is not configured; skipping YouTube ingestion.")
            return results

        # Use Webshare rotating residential proxies when configured to avoid
        # IP blocks from cloud provider addresses. If not configured, use
        # the default client (may be blocked on some hosts).
        proxy_config = None
        if settings.WEBSHARE_USERNAME and settings.WEBSHARE_PASSWORD:
            proxy_config = WebshareProxyConfig(
                proxy_username=settings.WEBSHARE_USERNAME,
                proxy_password=settings.WEBSHARE_PASSWORD,
            )

        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config) if proxy_config else YouTubeTranscriptApi()

        async with aiohttp.ClientSession() as session:
            for query in YOUTUBE_QUERIES:
                encoded_query = urllib.parse.quote(query)
                # 1. Fetch video IDs
                search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={encoded_query}&type=video&key={YOUTUBE_API_KEY}&maxResults=3"
                
                async with session.get(search_url) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error(f"YouTube API search error: {error_text}")
                        continue
                    search_data = await resp.json()

                video_ids = [item['id']['videoId'] for item in search_data.get('items', [])]
                if not video_ids:
                    continue

                # Fetch statistics to get view counts
                stats_url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={','.join(video_ids)}&key={YOUTUBE_API_KEY}"
                async with session.get(stats_url) as resp:
                    if resp.status == 200:
                        stats_data = await resp.json()
                        stats_map = {item['id']: int(item['statistics'].get('viewCount', 0)) for item in stats_data.get('items', [])}
                    else:
                        stats_map = {}

                for item in search_data.get('items', []):
                    video_id = item['id']['videoId']
                    title = item['snippet']['title']
                    channel = item['snippet']['channelTitle']
                    description = item['snippet'].get('description', '')
                    views = stats_map.get(video_id, 0)

                    metadata_only_item = _build_youtube_item(
                        title=title,
                        channel=channel,
                        description=description,
                        views=views,
                    )

                    # 2. Get transcripts (run in thread to avoid blocking async loop)
                    try:
                        transcript = await asyncio.to_thread(ytt_api.fetch, video_id)
                        # 3. Convert to text
                        text = " ".join([snippet.text for snippet in transcript])
                        
                        # 4. Push format
                        results.append(
                            _build_youtube_item(
                                title=title,
                                channel=channel,
                                description=description,
                                views=views,
                                text=text,
                            )
                        )
                        logger.info(f"Successfully ingested YouTube video: {title}")
                    except (TranscriptsDisabled, NoTranscriptFound):
                        logger.warning(f"No transcript available for video {video_id}; using metadata-only item")
                        results.append(metadata_only_item)
                    except Exception as e:
                        logger.warning(f"Error fetching transcript for {video_id}; using metadata-only item: {e}")
                        results.append(metadata_only_item)

    except Exception as e:
        logger.error(f"YouTube ingestion error: {e}")
        
    return results
