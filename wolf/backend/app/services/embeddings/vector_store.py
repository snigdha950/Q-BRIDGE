import faiss
import numpy as np
import os
import json
from typing import List, Dict, Any
from app.core.logging import logger

INDEX_FILE = "data/faiss_index.bin"
METADATA_FILE = "data/faiss_metadata.json"
EMBEDDING_DIM = 384
SAVE_INTERVAL = 500

class VectorStore:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStore, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.dim = EMBEDDING_DIM
        self.insert_count = 0
        
        os.makedirs("data", exist_ok=True)
        
        self.load_index()

    def load_index(self):
        if os.path.exists(INDEX_FILE) and os.path.exists(METADATA_FILE):
            try:
                self.index = faiss.read_index(INDEX_FILE)
                with open(METADATA_FILE, 'r') as f:
                    self.metadata = json.load(f)
                logger.info(f"[FAISS] Loaded index with {self.index.ntotal} vectors")
            except Exception as e:
                logger.error(f"[FAISS] Failed to load index: {e}")
                self._create_new_index()
        else:
            self._create_new_index()

    def _create_new_index(self):
        self.index = faiss.IndexFlatIP(self.dim)
        self.metadata = []
        logger.info("[FAISS] Created new IndexFlatIP")

    def save_index(self):
        try:
            faiss.write_index(self.index, INDEX_FILE)
            with open(METADATA_FILE, 'w') as f:
                json.dump(self.metadata, f)
            logger.info(f"[FAISS] Saved index with {self.index.ntotal} vectors")
        except Exception as e:
            logger.error(f"[FAISS] Failed to save index: {e}")

    def add_vectors(self, vectors: np.ndarray, metadata: List[Dict[str, Any]]):
        if len(vectors) != len(metadata):
            raise ValueError("Vectors and metadata must have the same length")
        
        if len(vectors) == 0:
            return

        self.index.add(vectors.astype(np.float32))
        self.metadata.extend(metadata)
        
        self.insert_count += len(vectors)
        if self.insert_count >= SAVE_INTERVAL:
            self.save_index()
            self.insert_count = 0

    def search(self, query_vector: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        if self.index.ntotal == 0:
            return []
            
        distances, indices = self.index.search(query_vector.astype(np.float32), k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                res = self.metadata[idx].copy()
                res['score'] = float(distances[0][i])
                results.append(res)
                
        return results

vector_store = VectorStore()
