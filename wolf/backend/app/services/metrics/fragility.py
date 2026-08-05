import numpy as np
from typing import List

def compute_fragility(clusters: List[dict]) -> float:
    if not clusters:
        return 0.0
        
    total_fragility = 0.0
    total_size = 0
    
    for c in clusters:
        sentiments = c.get("sentiment_distribution", {})
        bullish = sentiments.get("bullish", 0)
        neutral = sentiments.get("neutral", 0)
        bearish = sentiments.get("bearish", 0)
        
        size = bullish + neutral + bearish
        if size <= 1:
            continue
            
        # Convert to numerical values
        values = ([1] * bullish) + ([0] * neutral) + ([-1] * bearish)
        variance = np.var(values)
        
        # Weight by cluster size
        total_fragility += variance * size
        total_size += size
        
    if total_size == 0:
        return 0.0
        
    # Average fragility
    avg_fragility = float(total_fragility / total_size)
    return avg_fragility
