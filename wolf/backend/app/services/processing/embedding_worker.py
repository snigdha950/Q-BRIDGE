import asyncio
import json
import time
import numpy as np
from app.core.logging import logger
from app.services.embeddings.embedding_service import embedding_service
from app.services.embeddings.vector_store import vector_store
from app.services.clustering.hdbscan_cluster import clustering_engine
import redis.asyncio as redis

redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

BATCH_SIZE = 64
TIME_WINDOW_HOURS = 3

def deduplicate_batch(batch):
    unique_items = []
    seen_hashes = set()
    skipped = 0
    
    for item in batch:
        narrative = item.get("cleaned_narrative", "")
        if not narrative or len(narrative.split()) < 3:
            skipped += 1
            continue
            
        # Simple hash deduplication for exact matches
        h = hash(narrative)
        if h in seen_hashes:
            skipped += 1
            continue
            
        seen_hashes.add(h)
        unique_items.append(item)
        
    return unique_items, skipped

async def process_embedding_batch(batch):
    unique_items, skipped = deduplicate_batch(batch)
    logger.info(f"[Dedup] Skipped duplicates/short: {skipped}")
    
    if not unique_items:
        return
        
    texts = [item["cleaned_narrative"] for item in unique_items]
    
    # Generate embeddings
    logger.info(f"[Embedding] Batch size: {len(texts)}")
    embeddings = embedding_service.generate_embeddings_batch(texts)
    
    # Store in FAISS
    metadata = [
        {
            "narrative": item.get("narrative", ""),
            "cleaned_narrative": item.get("cleaned_narrative", ""),
            "sentiment": item.get("sentiment", "neutral"),
            "source": item.get("source", ""),
            "timestamp": time.time()
        }
        for item in unique_items
    ]
    
    vector_store.add_vectors(embeddings, metadata)
    logger.info(f"[FAISS] Total vectors: {vector_store.index.ntotal}")

    # Time-windowed clustering (run in background thread to avoid blocking)
    # We need to get recent data from vector store
    current_time = time.time()
    cutoff_time = current_time - (TIME_WINDOW_HOURS * 3600)
    
    recent_vectors = []
    recent_metadata = []
    
    # In a real system, we'd query a DB. Here we iterate metadata.
    # For performance, we just take the last N items or filter by timestamp.
    for i, meta in enumerate(vector_store.metadata):
        if meta.get("timestamp", 0) >= cutoff_time:
            # We need to reconstruct the vector from FAISS
            # FAISS IndexFlatIP allows reconstruct
            try:
                vec = vector_store.index.reconstruct(i)
                recent_vectors.append(vec)
                recent_metadata.append(meta)
            except Exception as e:
                logger.error(f"Failed to reconstruct vector {i}: {e}")
                
    if recent_vectors:
        recent_vectors_np = np.array(recent_vectors)
        
        # Run clustering in executor
        loop = asyncio.get_event_loop()
        clusters = await loop.run_in_executor(
            None, 
            clustering_engine.cluster_recent_data, 
            recent_vectors_np, 
            recent_metadata
        )
        
        # Push to clustered_belief_queue
        for cluster in clusters:
            await redis_client.lpush("clustered_belief_queue", json.dumps(cluster))

async def embedding_worker_loop():
    logger.info("Starting embedding worker loop")
    while True:
        try:
            batch = []
            # Try to get up to BATCH_SIZE items
            for _ in range(BATCH_SIZE):
                item_json = await redis_client.rpop("belief_enriched_queue")
                if item_json:
                    batch.append(json.loads(item_json))
                else:
                    break
                    
            if batch:
                await process_embedding_batch(batch)
            else:
                await asyncio.sleep(1) # Wait for more data
                
        except Exception as e:
            logger.error(f"Error in embedding worker: {e}")
            await asyncio.sleep(5)
