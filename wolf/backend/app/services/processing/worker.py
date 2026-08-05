import asyncio
import json
import time
from app.core.logging import logger
from app.services.ingestion.queue import queue_client
from app.services.processing.llm import process_batch
from app.services.processing.preprocess import clean_text

async def processing_worker():
    """Pulls batches from ingestion queue, processes them, and pushes to enriched queue."""
    logger.info("Starting LLM processing worker...")
    
    while True:
        try:
            if not queue_client.is_connected:
                await asyncio.sleep(5)
                continue
                
            batch = []
            # Try to get up to 50 items per call as requested
            for _ in range(50):
                item_json = await queue_client.redis_client.rpop(queue_client.queue_name)
                if not item_json:
                    break
                
                item = json.loads(item_json)
                batch.append(item)
                
            if not batch:
                await asyncio.sleep(5)
                continue
                
            logger.info(f"[Ingestion Received] Processing batch of {len(batch)} items...")
            
            # Step 1: Send ORIGINAL raw text to LLM
            llm_results = await process_batch(batch)
            
            valid_items = 0
            for item, llm_output in zip(batch, llm_results):
                # Step 4: Error Handling - Fallback if LLM fails
                if not llm_output or "narrative" not in llm_output:
                    logger.warning(f"[LLM Failure] Skipping item from {item.get('source', 'unknown')}")
                    continue
                    
                logger.debug(f"[LLM Success] Extracted belief for item from {item.get('source', 'unknown')}")
                
                # Step 2: Preprocess ONLY the narrative
                narrative = llm_output["narrative"]
                cleaned_narrative = clean_text(narrative)
                logger.debug("[Preprocessing Complete] Cleaned narrative.")
                
                # Step 3: Add Safety Filter
                if len(cleaned_narrative.split()) < 3:
                    logger.warning(f"[Low Signal] Discarding narrative (too short): {cleaned_narrative}")
                    continue
                    
                # Step 3: Construct enriched payload
                enriched_item = {
                    "raw_text": item.get("text", ""),
                    "narrative": narrative,
                    "cleaned_narrative": cleaned_narrative,
                    "sentiment": llm_output.get("sentiment", "neutral"),
                    "confidence": llm_output.get("confidence", 0.0),
                    "entities": llm_output.get("entities", []),
                    "topic": llm_output.get("topic", "unknown"),
                    "source": item.get("source", "unknown"),
                    "meta": item.get("meta", {}),
                    "timestamp": item.get("timestamp", int(time.time()))
                }
                
                # Step 4: Push to next queue
                await queue_client.redis_client.lpush("belief_enriched_queue", json.dumps(enriched_item))
                valid_items += 1
                
            logger.info(f"[Pushed to Next Queue] Successfully processed and stored {valid_items}/{len(batch)} enriched items.")
            
        except Exception as e:
            logger.error(f"Error in processing worker: {e}")
            await asyncio.sleep(5)
