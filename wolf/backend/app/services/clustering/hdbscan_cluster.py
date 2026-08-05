import numpy as np
import time
from typing import List, Dict, Any
from app.core.logging import logger

try:
    import hdbscan
except Exception:
    hdbscan = None

class IncrementalClusteringEngine:
    def __init__(self):
        self.min_cluster_size = 5
        self.metric = 'euclidean'

    def cluster_recent_data(self, vectors: np.ndarray, metadata: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if len(vectors) < self.min_cluster_size:
            logger.info(f"[Clustering] Not enough data to cluster (need {self.min_cluster_size}, got {len(vectors)})")
            return []

        if hdbscan is None:
            logger.warning("hdbscan unavailable; using single-cluster fallback.")
            sentiment_counts = {"bullish": 0, "bearish": 0, "neutral": 0}
            narratives = []
            for item in metadata:
                narratives.append(item.get("narrative", ""))
                sentiment = item.get("sentiment", "neutral")
                if sentiment not in sentiment_counts:
                    sentiment = "neutral"
                sentiment_counts[sentiment] += 1

            narrative_counts = {}
            for narrative in narratives:
                narrative_counts[narrative] = narrative_counts.get(narrative, 0) + 1
            top_narrative = max(narrative_counts, key=narrative_counts.get) if narrative_counts else ""

            return [{
                "cluster_id": 0,
                "top_narrative": top_narrative,
                "size": len(narratives),
                "centroid": np.mean(vectors, axis=0).tolist(),
                "sentiment_distribution": sentiment_counts,
                "timestamp": time.time()
            }]

        clusterer = hdbscan.HDBSCAN(min_cluster_size=self.min_cluster_size, metric=self.metric)
        labels = clusterer.fit_predict(vectors)

        clusters_dict = {}
        discarded_noise = 0

        for i, label in enumerate(labels):
            if label == -1:
                discarded_noise += 1
                continue

            if label not in clusters_dict:
                clusters_dict[label] = {
                    "cluster_id": int(label),
                    "narratives": [],
                    "vectors": [],
                    "sentiments": []
                }
            
            clusters_dict[label]["narratives"].append(metadata[i].get("narrative", ""))
            clusters_dict[label]["vectors"].append(vectors[i])
            clusters_dict[label]["sentiments"].append(metadata[i].get("sentiment", "neutral"))

        clusters = []
        for label, data in clusters_dict.items():
            vectors_arr = np.array(data["vectors"])
            centroid = np.mean(vectors_arr, axis=0)
            
            # Count sentiments
            sentiment_counts = {"bullish": 0, "bearish": 0, "neutral": 0}
            for s in data["sentiments"]:
                if s in sentiment_counts:
                    sentiment_counts[s] += 1
                else:
                    sentiment_counts["neutral"] += 1

            # Find top narrative (most frequent or just the first one for simplicity if not doing full frequency analysis)
            # For a robust "most frequent", we can use a simple count
            narrative_counts = {}
            for n in data["narratives"]:
                narrative_counts[n] = narrative_counts.get(n, 0) + 1
            top_narrative = max(narrative_counts, key=narrative_counts.get) if narrative_counts else ""

            clusters.append({
                "cluster_id": data["cluster_id"],
                "top_narrative": top_narrative,
                "size": len(data["narratives"]),
                "centroid": centroid.tolist(),
                "sentiment_distribution": sentiment_counts,
                "timestamp": time.time()
            })

        logger.info(f"[Clustering] Clusters formed: {len(clusters)}")
        logger.info(f"[Noise] Discarded: {discarded_noise}")

        return clusters

clustering_engine = IncrementalClusteringEngine()
