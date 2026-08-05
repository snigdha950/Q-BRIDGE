import numpy as np
from typing import List
from functools import lru_cache
import hashlib
from app.core.logging import logger

try:
    from sentence_transformers import SentenceTransformer
    import torch
except Exception:
    SentenceTransformer = None
    torch = None

class EmbeddingService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.device = "cpu"
        self.model = None
        if SentenceTransformer is not None and torch is not None:
            try:
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                self.model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
            except Exception as exc:
                logger.warning(f"SentenceTransformer unavailable; using hash embeddings fallback: {exc}")
        self.cache = {}  # Simple in-memory cache, could be replaced with Redis

    def _get_hash(self, text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def generate_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        if self.model is None:
            embeddings = []
            for text in texts:
                digest = hashlib.md5(text.encode('utf-8')).digest()
                vector = np.frombuffer(digest * 24, dtype=np.uint8)[:384].astype(np.float32)
                vector = vector / (np.linalg.norm(vector) or 1e-10)
                embeddings.append(vector)
            return np.array(embeddings)

        embeddings = []
        texts_to_compute = []
        indices_to_compute = []

        # Check cache
        for i, text in enumerate(texts):
            h = self._get_hash(text)
            if h in self.cache:
                embeddings.append(self.cache[h])
            else:
                embeddings.append(None)
                texts_to_compute.append(text)
                indices_to_compute.append(i)

        # Compute missing
        if texts_to_compute:
            computed_embeddings = self.model.encode(texts_to_compute, convert_to_numpy=True)
            
            # L2 Normalize
            norms = np.linalg.norm(computed_embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            computed_embeddings = computed_embeddings / norms

            for i, idx in enumerate(indices_to_compute):
                emb = computed_embeddings[i]
                embeddings[idx] = emb
                self.cache[self._get_hash(texts_to_compute[i])] = emb

        return np.array(embeddings)

embedding_service = EmbeddingService()
