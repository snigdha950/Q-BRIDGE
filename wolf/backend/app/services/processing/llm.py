import asyncio
import json
import aiohttp
from typing import List, Dict, Any, Optional
from app.core.logging import logger

HF_API_KEY = "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"
# Using the OpenAI compatible endpoint for HF
HF_API_URL = "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-70B-Instruct/v1/chat/completions"

PROMPT_TEMPLATE = """You are a financial belief extraction engine.

Analyze the following text and extract:
- Core belief (1 sentence)
- Sentiment (bullish, bearish, neutral)
- Mentioned stocks
- Topic category

Text:
{input_text}

Return JSON only in the following format:
{
  "narrative": "core belief summary",
  "sentiment": "bullish | bearish | neutral",
  "confidence": 0.9,
  "entities": ["TSLA", "NVDA"],
  "topic": "earnings | macro | product | regulation"
}"""

async def process_text(session: aiohttp.ClientSession, text: str, semaphore: asyncio.Semaphore, retries: int = 3) -> Optional[Dict[str, Any]]:
    prompt = PROMPT_TEMPLATE.format(input_text=text)
    
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "meta-llama/Llama-3.2-70B-Instruct",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 200,
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    
    async with semaphore:
        for attempt in range(retries):
            try:
                async with session.post(HF_API_URL, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data['choices'][0]['message']['content']
                        # Clean up markdown if present
                        if content.startswith("```json"):
                            content = content[7:-3]
                        elif content.startswith("```"):
                            content = content[3:-3]
                        return json.loads(content)
                    elif response.status == 429:
                        logger.warning("Rate limited by HF API. Retrying...")
                        await asyncio.sleep(2 ** attempt)
                    else:
                        error_text = await response.text()
                        logger.error(f"HF API Error: {response.status} - {error_text}")
                        await asyncio.sleep(2 ** attempt)
            except asyncio.TimeoutError:
                logger.warning(f"Timeout on attempt {attempt + 1}")
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"Error processing text: {e}")
                await asyncio.sleep(2 ** attempt)
                
    return None

async def process_batch(items: List[Dict[str, Any]]) -> List[Optional[Dict[str, Any]]]:
    # Limit concurrent API calls to avoid hitting rate limits too hard
    semaphore = asyncio.Semaphore(10)
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for item in items:
            tasks.append(process_text(session, item.get("text", ""), semaphore))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        final_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Task failed with exception: {result}")
                final_results.append(None)
            else:
                final_results.append(result)
                
        return final_results
