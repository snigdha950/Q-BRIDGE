from pydantic import BaseModel, Field
from typing import List, Optional

class SparklinePoint(BaseModel):
    time: int
    value: float

class TrendingStock(BaseModel):
    id: str
    ticker: str
    name: str
    beliefScore: int = Field(..., ge=0, le=100)
    sentiment: str
    velocity: float
    sector: str
    marketCap: str
    sparkline: List[SparklinePoint]

class Metrics(BaseModel):
    coherence: str
    velocity: str
    fragility: str

class ChartDataPoint(BaseModel):
    date: str
    price: str
    belief: str

class Cluster(BaseModel):
    label: str
    dominance: int
    color: str

class Node(BaseModel):
    id: str
    label: str
    x: int
    y: int
    size: int

class Edge(BaseModel):
    source: str
    target: str

class Network(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class TimelineEvent(BaseModel):
    time: str
    event: str
    sentiment: str

class StockDetail(BaseModel):
    ticker: str
    name: str
    beliefScore: int
    signal: str
    metrics: Metrics
    chartData: List[ChartDataPoint]
    clusters: List[Cluster]
    network: Network
    timeline: List[TimelineEvent]

class Signal(BaseModel):
    id: str
    type: str
    title: str
    description: str
    impact: str
    timestamp: str

class Alert(BaseModel):
    id: str
    ticker: str
    message: str
    severity: str
    time: str
