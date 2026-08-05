from __future__ import annotations

from typing import Any

import aiohttp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.logging import logger

router = APIRouter()

DEFAULT_MODEL = "meta-llama/Meta-Llama-3-8B"
CHAT_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"
HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions"


class LLMRequest(BaseModel):
    question: str = Field(min_length=1)
    api_key: str | None = None
    model: str = DEFAULT_MODEL
    system_prompt: str | None = None


class LLMResponse(BaseModel):
    response: str


@router.post("", response_model=LLMResponse)
async def generate_llm_response(payload: LLMRequest) -> LLMResponse:
    api_key = (payload.api_key or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="Hugging Face API key is required")

    system_prompt = payload.system_prompt or "You are an expert market analyst specializing in stock beliefs, sentiment analysis, and market intelligence."
    model = (payload.model or DEFAULT_MODEL).strip() or DEFAULT_MODEL
    if model == DEFAULT_MODEL:
        model = CHAT_MODEL

    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            HF_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": payload.question},
                ],
                "max_tokens": 256,
                "temperature": 0.7,
                "top_p": 0.95,
                "stream": False,
            },
        ) as response:
            try:
                data: Any = await response.json()
            except Exception:
                data = {"error": await response.text()}

            if response.status >= 400:
                error_message = data.get("error") if isinstance(data, dict) else None
                logger.warning("Hugging Face chat completion failed: %s", error_message or response.status)
                raise HTTPException(status_code=response.status, detail=error_message or "Hugging Face chat completion failed")

            if isinstance(data, dict):
                choices = data.get("choices")
                if isinstance(choices, list) and choices:
                    choice = choices[0] or {}
                    message = choice.get("message") if isinstance(choice, dict) else None
                    if isinstance(message, dict):
                        content = (message.get("content") or "").strip()
                        if content:
                            return LLMResponse(response=content)

                generated_text = (data.get("generated_text") or "").strip()
                if generated_text:
                    return LLMResponse(response=generated_text)

            return LLMResponse(response="Unable to generate response. Please try again.")