import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Filter, ArrowUpDown, WandSparkles } from 'lucide-react';
import { useAppStore, TrendingStock } from '@/src/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Trending() {
  const { trendingStocks, isLoadingTrending, fetchTrending, setActiveTicker } = useAppStore();
  
  const [sortBy, setSortBy] = useState<'belief_desc' | 'belief_asc' | 'velocity_desc' | 'velocity_asc'>('belief_desc');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [marketCapFilter, setMarketCapFilter] = useState<string>('all');
  const [nlQuery, setNlQuery] = useState('');

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const filteredAndSortedStocks = useMemo(() => {
    let result = [...trendingStocks];

    // Filter
    if (sectorFilter !== 'all') {
      result = result.filter(stock => stock.sector === sectorFilter);
    }
    if (marketCapFilter !== 'all') {
      result = result.filter(stock => stock.marketCap === marketCapFilter);
    }

    if (nlQuery.trim()) {
      const q = nlQuery.toLowerCase();

      if (q.includes('bullish')) {
        result = result.filter((stock) => stock.sentiment === 'bullish');
      }
      if (q.includes('bearish')) {
        result = result.filter((stock) => stock.sentiment === 'bearish');
      }

      const hasHighBelief = q.includes('high belief') || q.includes('belief > 80') || q.includes('strong belief');
      if (hasHighBelief) {
        result = result.filter((stock) => stock.beliefScore >= 80);
      }

      const hasHighVelocity = q.includes('high velocity') || q.includes('momentum') || q.includes('fast');
      if (hasHighVelocity) {
        result = result.filter((stock) => stock.velocity >= 3);
      }

      if (q.includes('semi') || q.includes('semiconductor') || q.includes('tech')) {
        result = result.filter((stock) => stock.sector.toLowerCase().includes('tech'));
      }

      if (q.includes('mega cap') || q.includes('large cap')) {
        result = result.filter((stock) => stock.marketCap === 'Mega' || stock.marketCap === 'Large');
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'belief_desc': return b.beliefScore - a.beliefScore;
        case 'belief_asc': return a.beliefScore - b.beliefScore;
        case 'velocity_desc': return b.velocity - a.velocity;
        case 'velocity_asc': return a.velocity - b.velocity;
        default: return 0;
      }
    });

    return result;
  }, [trendingStocks, sortBy, sectorFilter, marketCapFilter]);

  const uniqueSectors = useMemo(() => Array.from(new Set(trendingStocks.map(s => s.sector))), [trendingStocks]);
  const uniqueMarketCaps = useMemo(() => Array.from(new Set(trendingStocks.map(s => s.marketCap))), [trendingStocks]);

  const quickQueries = [
    'bullish high velocity',
    'bearish high belief',
    'semiconductor momentum',
    'mega cap bullish',
  ];

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Trending Signals</h1>
          <p className="text-muted-foreground">Top 20 assets by belief velocity in the last 24h.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg px-3 h-10 backdrop-blur-sm w-full lg:w-auto lg:min-w-[26rem]">
            <WandSparkles className="w-4 h-4 text-teal-400" />
            <Input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="Ask: bullish semis with high velocity"
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg p-1 backdrop-blur-sm w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full sm:w-32 h-8 border-0 bg-transparent focus:ring-0 shadow-none">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {uniqueSectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border/50" />
            <Select value={marketCapFilter} onValueChange={setMarketCapFilter}>
              <SelectTrigger className="w-full sm:w-32 h-8 border-0 bg-transparent focus:ring-0 shadow-none">
                <SelectValue placeholder="Market Cap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Caps</SelectItem>
                {uniqueMarketCaps.map(cap => (
                  <SelectItem key={cap} value={cap}>{cap}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg p-1 backdrop-blur-sm w-full sm:w-auto">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground ml-2" />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-full sm:w-40 h-8 border-0 bg-transparent focus:ring-0 shadow-none">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="belief_desc">Highest Belief</SelectItem>
                <SelectItem value="belief_asc">Lowest Belief</SelectItem>
                <SelectItem value="velocity_desc">Highest Velocity</SelectItem>
                <SelectItem value="velocity_asc">Lowest Velocity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {quickQueries.map((q) => (
            <button
              key={q}
              onClick={() => setNlQuery(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoadingTrending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="glass-panel border-white/5 bg-card/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20"
        >
          {filteredAndSortedStocks.map((stock, index) => (
            <motion.div
              key={stock.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => setActiveTicker(stock.ticker)}
            >
              <Card className="glass-panel border-white/5 hover:border-teal-500/30 transition-all duration-300 bg-card/30 overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg tracking-tight">{stock.ticker}</h3>
                      <p className="text-xs text-muted-foreground truncate max-w-30">{stock.name}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`flex items-center gap-1 ${
                        stock.velocity > 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {stock.velocity > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stock.velocity)}%
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">Belief Score</span>
                        <span className="text-3xl font-semibold tracking-tighter leading-none">
                          {stock.beliefScore}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {stock.sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
                      </Badge>
                    </div>
                    <Progress 
                      value={stock.beliefScore} 
                      className="h-1.5 bg-white/10" 
                      indicatorClassName={stock.sentiment === 'bullish' ? 'bg-teal-400' : 'bg-rose-400'}
                    />
                  </div>

                  <div className="h-16 w-full mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stock.sparkline}>
                        <YAxis domain={['dataMin', 'dataMax']} hide />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={stock.velocity > 0 ? '#34d399' : '#fb7185'} 
                          strokeWidth={2} 
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded">
                      {stock.sector}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded">
                      {stock.marketCap} Cap
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filteredAndSortedStocks.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No trending signals match your filters.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
