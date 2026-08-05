import json
import redis.asyncio as redis
from app.core.logging import logger

class DataQueue:
    def __init__(self):
        # Connect to Redis (fallback to mock if unavailable)
        self.redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)
        self.queue_name = "belief_ingestion_queue"
        self.is_connected = None

    async def push(self, data: dict):
        try:
            if self.is_connected is None:
                await self.redis_client.ping()
                self.is_connected = True
                
            await self.redis_client.lpush(self.queue_name, json.dumps(data))
            logger.debug(f"Pushed to Redis queue: {data['source']}")
        except Exception as e:
            if self.is_connected is not False:
                logger.warning(f"Redis unavailable, falling back to logger. Error: {e}")
                self.is_connected = False
            # Mock push if Redis is down
            logger.info(f"[Mock Queue Push] {data}")

queue_client = DataQueue()
