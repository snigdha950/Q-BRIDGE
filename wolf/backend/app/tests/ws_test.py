import asyncio
from app.api.websockets import broadcast

async def stress_broadcast_test():
    for i in range(100):
        await broadcast({
            "type": "test_update",
            "message": f"Update {i}"
        })
        await asyncio.sleep(0.1)  # rapid updates
