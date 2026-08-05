import random

def generate_mock_trending_data():
    sectors = ['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy']
    marketCaps = ['Mega', 'Large', 'Mid', 'Small']
    tickers = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'META', 'AMZN', 'GOOGL', 'PLTR', 'SMCI', 'COIN', 'MARA', 'JPM', 'UNH', 'XOM', 'V', 'JNJ', 'WMT', 'PG', 'MA']
    
    data = []
    for i, ticker in enumerate(tickers):
        velocity = round(random.uniform(-2.0, 8.0), 1)
        sentiment = 'bullish' if velocity > 0 else 'bearish'
        
        last_val = 50
        sparkline = []
        for j in range(20):
            last_val = last_val + random.uniform(-5, 5) + (1 if velocity > 0 else -1)
            sparkline.append({"time": j, "value": last_val})
            
        data.append({
            "id": str(i),
            "ticker": ticker,
            "name": f"{ticker} Inc.",
            "beliefScore": random.randint(60, 100),
            "sentiment": sentiment,
            "velocity": velocity,
            "sector": random.choice(sectors),
            "marketCap": random.choice(marketCaps),
            "sparkline": sparkline
        })
    return data

def generate_mock_stock_data(ticker: str):
    is_bullish = random.random() > 0.3
    
    base_price = 150 + random.random() * 100
    base_belief = 50 + random.random() * 20
    
    chart_data = []
    for i in range(30):
        base_price += (random.random() * 10 - 4.5) * (1.1 if is_bullish else 0.9)
        base_belief += (random.random() * 8 - 3.5) * (1.1 if is_bullish else 0.9)
        chart_data.append({
            "date": f"Day {i + 1}",
            "price": f"{max(10, base_price):.2f}",
            "belief": f"{min(100, max(0, base_belief)):.1f}"
        })

    return {
        "ticker": ticker.upper(),
        "name": f"{ticker.upper()} Corporation",
        "beliefScore": int(base_belief),
        "signal": "Bullish" if is_bullish else "Bearish",
        "metrics": {
            "coherence": f"{random.uniform(50, 90):.1f}",
            "velocity": f"{random.uniform(-2, 8):.2f}",
            "fragility": f"{random.uniform(10, 40):.1f}",
        },
        "chartData": chart_data,
        "clusters": sorted([
            {"label": 'AI Infrastructure', "dominance": 85, "color": '#2dd4bf'},
            {"label": 'Margin Compression', "dominance": 45, "color": '#fb7185'},
            {"label": 'Retail Euphoria', "dominance": 60, "color": '#a78bfa'},
            {"label": 'Regulatory Risk', "dominance": 25, "color": '#facc15'}
        ], key=lambda x: x['dominance'], reverse=True),
        "network": {
            "nodes": [
                {"id": '1', "label": 'Earnings Beat', "x": 50, "y": 30, "size": 20},
                {"id": '2', "label": 'AI Demand', "x": 80, "y": 50, "size": 30},
                {"id": '3', "label": 'Supply Chain', "x": 20, "y": 60, "size": 15},
                {"id": '4', "label": 'Rate Cuts', "x": 50, "y": 80, "size": 25},
            ],
            "edges": [
                {"source": '1', "target": '2'},
                {"source": '2', "target": '4'},
                {"source": '1', "target": '3'},
            ]
        },
        "timeline": [
            {"time": '2h ago', "event": 'Unusual options activity detected', "sentiment": 'bullish'},
            {"time": '5h ago', "event": 'Analyst upgrade: Outperform', "sentiment": 'bullish'},
            {"time": '1d ago', "event": 'Supply chain rumors surface', "sentiment": 'bearish'},
            {"time": '2d ago', "event": 'CEO interview on CNBC', "sentiment": 'neutral'},
        ]
    }
