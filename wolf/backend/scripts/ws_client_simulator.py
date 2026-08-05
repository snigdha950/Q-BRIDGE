import websockets
import asyncio
import json

async def simulate_client(id):
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Client {id} connected")

            for _ in range(30):
                msg = await websocket.recv()
                data = json.loads(msg)
                if data.get("type") != "heartbeat" and data.get("type") != "latency_test":
                    print(f"Client {id} received: {data.get('type')}")

            await asyncio.sleep(5)
    except Exception as e:
        print(f"Client {id} error: {e}")

async def main():
    tasks = [simulate_client(i) for i in range(50)]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
