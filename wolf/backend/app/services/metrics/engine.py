from app.services.metrics.coherence import compute_coherence
from app.services.metrics.velocity import compute_velocity
from app.services.metrics.fragility import compute_fragility
import time

def compute_metrics(current_clusters: list[dict], previous_clusters: list[dict]) -> dict:
    coherence = compute_coherence(current_clusters)
    velocity = compute_velocity(current_clusters, previous_clusters)
    fragility = compute_fragility(current_clusters)
    
    return {
        "timestamp": time.time(),
        "coherence": coherence,
        "velocity": velocity,
        "fragility": fragility
    }
