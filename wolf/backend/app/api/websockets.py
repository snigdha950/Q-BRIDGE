from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
import time
import uuid
from typing import Set, Dict, Any
from app.services.market_data import build_trending_stocks, build_stock_detail
from app.core.logging import logger
import redis.asyncio as redis
import os
from app.core.config import settings

router = APIRouter()

_redis_url = None
if settings and getattr(settings, 'REDIS_URL', None):
    _redis_url = settings.REDIS_URL
else:
    _redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')

redis_client = redis.from_url(_redis_url, decode_responses=True)
redis_connected = False

message_history = []
MAX_HISTORY = 1000
global_message_id = 0

class ClientConnection:
    def __init__(self, websocket: WebSocket):
        self.id = str(uuid.uuid4())
        self.websocket = websocket
        self.queue = asyncio.Queue(maxsize=100)
        self.dropped_messages = 0
        self.messages_sent = 0
        self.unacked_messages = {}
        self._send_task = None

    async def start(self):
        self._send_task = asyncio.create_task(self._send_loop())

    async def stop(self):
        if self._send_task:
            self._send_task.cancel()

    async def _send_loop(self):
        while True:
            try:
                msg = await self.queue.get()
                await self.websocket.send_json(msg)
                self.messages_sent += 1
                if "id" in msg:
                    self.unacked_messages[msg["id"]] = msg
                await asyncio.sleep(0.1)  # Throttling: max 10 messages/sec per client
            except asyncio.CancelledError:
                break
            except Exception as e:
                # If send fails, the receive loop will catch the disconnect
                break

    def enqueue(self, msg: dict):
        if self.queue.full():
            try:
                self.queue.get_nowait()  # Drop oldest
                self.dropped_messages += 1
            except asyncio.QueueEmpty:
                pass
        try:
            self.queue.put_nowait(msg)
        except asyncio.QueueFull:
            pass

connected_clients: Set[ClientConnection] = set()

async def local_broadcast(data: dict):
    for client in list(connected_clients):
        client.enqueue(data)

async def publish_message(data: dict):
    global global_message_id
    global_message_id += 1
    data["id"] = global_message_id
    
    message_history.append(data)
    if len(message_history) > MAX_HISTORY:
        message_history.pop(0)

    try:
        if redis_connected:
            await redis_client.publish("ws_updates", json.dumps(data))
        else:
            await local_broadcast(data)
    except Exception as e:
        logger.warning(f"Redis publish failed, falling back to local broadcast: {e}")
        await local_broadcast(data)

# Backward compatibility for existing tests
async def broadcast(data: dict):
    await publish_message(data)

async def redis_listener():
    global redis_connected
    while True:
        try:
            await redis_client.ping()
            redis_connected = True
            pubsub = redis_client.pubsub()
            await pubsub.subscribe("ws_updates")
            logger.info("Subscribed to Redis ws_updates channel")
            
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await local_broadcast(data)
        except Exception as e:
            redis_connected = False
            logger.error(f"Redis listener error: {e}")
            await asyncio.sleep(5)

last_metrics_time = time.time()
last_messages_sent = 0

async def memory_safety_task():
    global last_metrics_time, last_messages_sent
    while True:
        await asyncio.sleep(30)
        current_time = time.time()
        
        total_sent = sum(c.messages_sent for c in connected_clients)
        sent_since_last = total_sent - last_messages_sent
        elapsed = current_time - last_metrics_time
        
        msgs_per_sec = sent_since_last / elapsed if elapsed > 0 else 0
        
        last_messages_sent = total_sent
        last_metrics_time = current_time
        
        total_dropped = sum(c.dropped_messages for c in connected_clients)
        
        logger.info(f"[Metrics] Active clients: {len(connected_clients)} | "
                    f"Msgs sent/sec: {msgs_per_sec:.2f} | "
                    f"Total dropped: {total_dropped}")

async def latency_test_task():
    while True:
        await asyncio.sleep(10)
        await publish_message({
            "type": "latency_test",
            "ts": time.time() * 1000
        })

async def heartbeat_task():
    while True:
        await asyncio.sleep(10)
        for client in list(connected_clients):
            client.enqueue({"type": "heartbeat"})

async def background_task():
    """Simulate real-time data updates"""
    while True:
        await asyncio.sleep(5)
        
        # Broadcast trending updates
        trending_data = await build_trending_stocks()
        import random
        updated_trending = random.sample(trending_data, min(3, len(trending_data))) if trending_data else []
        await publish_message({
            "type": "trending_update",
            "data": updated_trending
        })

        # Broadcast stock updates
        stock_data = await build_stock_detail("NVDA")
        await publish_message({
            "type": "stock_update",
            "data": stock_data
        })

@router.websocket("/ws")
@router.websocket("/ws/")
@router.websocket("/ws/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client = ClientConnection(websocket)
    connected_clients.add(client)
    await client.start()
    connect_time = time.time()
    logger.info(f"[WebSocket] Client {client.id} connected at {connect_time}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "ack":
                    msg_id = message.get("id")
                    if msg_id in client.unacked_messages:
                        del client.unacked_messages[msg_id]
                
                elif msg_type == "resume":
                    last_id = message.get("last_message_id", 0)
                    for msg in message_history:
                        if msg.get("id", 0) > last_id:
                            client.enqueue(msg)
                            
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WebSocket Error] {e}")
    finally:
        await client.stop()
        if client in connected_clients:
            connected_clients.remove(client)
        duration = time.time() - connect_time
        logger.info(f"[WebSocket] Client {client.id} disconnected. Duration: {duration:.2f}s")
