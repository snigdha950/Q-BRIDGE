import asyncio
from app.core.logging import logger
from app.services.ingestion.queue import queue_client
from app.services.ingestion.sources import (
    fetch_reddit, 
    fetch_twitter, 
    fetch_news, 
    fetch_youtube
)

async def run_ingestion_cycle():
    logger.info("Starting data ingestion cycle...")
    
    # Run all fetchers concurrently
    tasks = [
        fetch_reddit(),
        fetch_twitter(),
        fetch_news(),
        fetch_youtube()
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_pushed = 0
    for source_results in results:
        if isinstance(source_results, Exception):
            logger.error(f"Ingestion task failed: {source_results}")
            continue
            
        for item in source_results:
            await queue_client.push(item)
            total_pushed += 1
            
    logger.info(f"Ingestion cycle complete. Pushed {total_pushed} items to queue.")

async def ingestion_worker():
    """Runs the ingestion cycle every 5 minutes."""
    while True:
        try:
            await run_ingestion_cycle()
        except Exception as e:
            logger.error(f"Error in ingestion worker: {e}")
        
        # Wait 5 minutes (300 seconds)
        logger.info("Ingestion worker sleeping for 5 minutes...")
        await asyncio.sleep(300)
