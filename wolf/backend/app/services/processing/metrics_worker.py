import asyncio
import json
import time
from app.core.logging import logger
from app.services.metrics.engine import compute_metrics
import redis.asyncio as redis
import sqlite3
import os

redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

# Simple SQLite setup for time series
def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect("data/metrics.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS metrics
                 (timestamp REAL, coherence REAL, freq_velocity REAL, drift REAL, fragility REAL)''')
    conn.commit()
    conn.close()

init_db()

def store_metrics(metrics: dict):
    conn = sqlite3.connect("data/metrics.db")
    c = conn.cursor()
    c.execute("INSERT INTO metrics VALUES (?, ?, ?, ?, ?)",
              (metrics["timestamp"], 
               metrics["coherence"], 
               metrics["velocity"]["frequency_velocity"], 
               metrics["velocity"]["embedding_drift"], 
               metrics["fragility"]))
    conn.commit()
    conn.close()

async def metrics_worker_loop():
    logger.info("Starting Metrics Worker...")
    
    previous_clusters = []
    
    while True:
        try:
            # Pull all available clusters for the current window
            current_clusters = []
            while True:
                item = await redis_client.rpop("clustered_belief_queue")
                if item:
                    current_clusters.append(json.loads(item))
                else:
                    break
                    
            if not current_clusters:
                await asyncio.sleep(2)
                continue
                
            metrics = compute_metrics(current_clusters, previous_clusters)
            
            logger.info(f"[Metrics] Coherence: {metrics['coherence']:.2f}")
            logger.info(f"[Velocity] Drift: {metrics['velocity']['embedding_drift']:.2f}")
            logger.info(f"[Fragility] Score: {metrics['fragility']:.2f}")
            
            store_metrics(metrics)
            
            await redis_client.lpush("metrics_queue", json.dumps(metrics))
            
            previous_clusters = current_clusters
            
        except Exception as e:
            logger.error(f"Metrics worker error: {e}")
            await asyncio.sleep(5)
