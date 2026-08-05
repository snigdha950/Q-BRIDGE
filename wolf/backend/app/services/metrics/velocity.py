import numpy as np
from typing import List, Dict

def compute_velocity(current_clusters: List[dict], previous_clusters: List[dict]) -> dict:
    if not previous_clusters or not current_clusters:
        return {"frequency_velocity": 0.0, "embedding_drift": 0.0}
        
    total_current_size = sum(c.get("size", 0) for c in current_clusters)
    total_prev_size = sum(c.get("size", 0) for c in previous_clusters)
    
    # Frequency velocity: rate of change of total active narratives
    # Assuming dt = 1 (time step)
    frequency_velocity = float(total_current_size - total_prev_size)
    
    # Embedding drift: average movement of centroids
    # Global centroid drift
    try:
        curr_global_centroid = np.mean([c["centroid"] for c in current_clusters], axis=0)
        prev_global_centroid = np.mean([c["centroid"] for c in previous_clusters], axis=0)
        drift = float(np.linalg.norm(curr_global_centroid - prev_global_centroid))
    except Exception:
        drift = 0.0
        
    return {
        "frequency_velocity": frequency_velocity,
        "embedding_drift": drift
    }
