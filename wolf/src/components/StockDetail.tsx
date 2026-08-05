import { useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Activity, Network, TrendingUp, TrendingDown, Clock, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function StockDetail() {
  const { activeTicker, stockData, isLoadingStock, fetchStock, setActiveView, wsConnected } = useAppStore();

  useEffect(() => {
    if (activeTicker) {
      fetchStock(activeTicker);
    }
  }, [activeTicker, fetchStock]);

  if (!activeTicker) return null;

  if (isLoadingStock || !stockData) {
    return (
      <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto overflow-y-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <button 
            onClick={() => setActiveView('trending')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Trending
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">{stockData.name}</h1>
            <Badge variant="outline" className="text-lg px-3 py-1 bg-card/50 backdrop-blur-sm border-white/10">
              {stockData.ticker}
            </Badge>
          </div>
        </div>

        <div className="flex items-end gap-6 bg-card/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground mb-1">Belief Score</span>
            <span className="text-5xl font-semibold tracking-tighter leading-none text-gradient">
              {stockData.beliefScore}
            </span>
          </div>
          <div className="h-12 w-px bg-border/50" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground mb-1">Signal</span>
            <div className={`flex items-center gap-2 text-lg font-medium ${stockData.signal === 'Bullish' ? 'text-teal-400' : 'text-rose-400'}`}>
              {stockData.signal === 'Bullish' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {stockData.signal}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        
        {/* Main Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="glass-panel border-white/5 bg-card/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                Belief vs Price Divergence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stockData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="price" stroke="#94a3b8" fillOpacity={1} fill="url(#colorPrice)" name="Price ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="belief" stroke="#2dd4bf" strokeWidth={3} dot={false} name="Belief Index" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Metrics Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-6"
        >
          <Card className="glass-panel border-white/5 bg-card/30 flex-1">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Network Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Coherence</span>
                  <span className="text-sm font-medium">{stockData.metrics.coherence}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${stockData.metrics.coherence}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">How unified the market narrative is.</p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Velocity</span>
                  <span className="text-sm font-medium">{stockData.metrics.velocity}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(parseFloat(stockData.metrics.velocity) + 2) * 10}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Rate of change in belief formation.</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Fragility</span>
                  <span className="text-sm font-medium">{stockData.metrics.fragility}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: `${stockData.metrics.fragility}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Risk of sudden narrative collapse.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Narrative Clusters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-panel border-white/5 bg-card/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Narrative Clusters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {stockData.clusters.map((cluster, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                      style={{ backgroundColor: `${cluster.color}20`, color: cluster.color, border: `1px solid ${cluster.color}40` }}
                    >
                      {cluster.dominance}%
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{cluster.label}</h4>
                      <div className="h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${cluster.dominance}%`, backgroundColor: cluster.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Network Graph Visualization (Mock) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-panel border-white/5 bg-card/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-400" />
                Belief Graph
              </CardTitle>
            </CardHeader>
            <CardContent className="relative h-[250px] w-full overflow-hidden bg-black/20 rounded-xl border border-white/5">
              {/* Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {stockData.network.edges.map((edge, i) => {
                  const source = stockData.network.nodes.find(n => n.id === edge.source);
                  const target = stockData.network.nodes.find(n => n.id === edge.target);
                  if (!source || !target) return null;
                  return (
                    <line 
                      key={i}
                      x1={`${source.x}%`} 
                      y1={`${source.y}%`} 
                      x2={`${target.x}%`} 
                      y2={`${target.y}%`} 
                      stroke="rgba(255,255,255,0.1)" 
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
              {/* Nodes */}
              {stockData.network.nodes.map((node) => (
                <div 
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div 
                    className="rounded-full bg-teal-500/20 border border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                    style={{ width: node.size, height: node.size }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {node.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sentiment Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-panel border-white/5 bg-card/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Sentiment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-white/10 ml-3 space-y-6">
                {stockData.timeline.map((item, i) => (
                  <div key={i} className="relative pl-6">
                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                      item.sentiment === 'bullish' ? 'bg-teal-400' : 
                      item.sentiment === 'bearish' ? 'bg-rose-400' : 'bg-slate-400'
                    }`} />
                    <div className="text-xs text-muted-foreground mb-1">{item.time}</div>
                    <div className="text-sm font-medium">{item.event}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
