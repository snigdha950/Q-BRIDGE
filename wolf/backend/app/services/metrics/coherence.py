import math
from typing import List

def compute_coherence(clusters: List[dict]) -> float:
    if not clusters:
        return 0.0
        
    total_narratives = sum(c.get("size", 0) for c in clusters)
    if total_narratives == 0:
        return 0.0
        
    entropy = 0.0
    for c in clusters:
        p_i = c.get("size", 0) / total_narratives
        if p_i > 0:
            entropy -= p_i * math.log(p_i)
            
    num_clusters = len(clusters)
    if num_clusters <= 1:
        return 1.0 # Perfect coherence
        
    h_norm = entropy / math.log(num_clusters)
    coherence = 1.0 - h_norm
    return max(0.0, min(1.0, coherence))
