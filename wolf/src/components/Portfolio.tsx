import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, Trash2, DollarSign, Scale } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Holding = {
  ticker: string;
  shares: number;
  avgCost: number;
};

const STORAGE_KEY = 'qb-portfolio-holdings';

export function Portfolio() {
  const { trendingStocks, fetchTrending } = useAppStore();
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    if (trendingStocks.length === 0) {
      fetchTrending();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHoldings(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  }, [fetchTrending, trendingStocks.length]);

  const persist = (next: Holding[]) => {
    setHoldings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save portfolio:', error);
    }
  };

  const addHolding = () => {
    const cleanTicker = ticker.trim().toUpperCase();
    const parsedShares = Number(shares);
    const parsedAvgCost = Number(avgCost);
    if (!cleanTicker || Number.isNaN(parsedShares) || Number.isNaN(parsedAvgCost) || parsedShares <= 0 || parsedAvgCost <= 0) {
      return;
    }

    const existing = holdings.find((h) => h.ticker === cleanTicker);
    if (existing) {
      const totalShares = existing.shares + parsedShares;
      const weightedCost = ((existing.avgCost * existing.shares) + (parsedAvgCost * parsedShares)) / totalShares;
      persist(holdings.map((h) => (h.ticker === cleanTicker ? { ...h, shares: totalShares, avgCost: weightedCost } : h)));
    } else {
      persist([...holdings, { ticker: cleanTicker, shares: parsedShares, avgCost: parsedAvgCost }]);
    }

    setTicker('');
    setShares('');
    setAvgCost('');
  };

  const removeHolding = (tickerToRemove: string) => {
    persist(holdings.filter((h) => h.ticker !== tickerToRemove));
  };

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const stock = trendingStocks.find((s) => s.ticker === h.ticker);
      const belief = stock?.beliefScore ?? 50;
      const impliedPrice = h.avgCost * (belief / 50);
      const pnl = (impliedPrice - h.avgCost) * h.shares;
      return {
        ...h,
        belief,
        impliedPrice,
        marketValue: impliedPrice * h.shares,
        pnl,
      };
    });
  }, [holdings, trendingStocks]);

  const totals = useMemo(() => {
    const invested = rows.reduce((acc, r) => acc + r.avgCost * r.shares, 0);
    const value = rows.reduce((acc, r) => acc + r.marketValue, 0);
    return {
      invested,
      value,
      pnl: value - invested,
    };
  }, [rows]);

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-6xl mx-auto overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Portfolio Mode</h1>
        <p className="text-muted-foreground">Position tracking, weighted belief exposure, and implied P/L.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass-panel border-white/5 bg-card/30"><CardContent className="p-5"><div className="text-xs text-muted-foreground mb-1">Invested</div><div className="text-3xl font-semibold">${totals.invested.toFixed(2)}</div></CardContent></Card>
        <Card className="glass-panel border-white/5 bg-card/30"><CardContent className="p-5"><div className="text-xs text-muted-foreground mb-1">Belief-Adjusted Value</div><div className="text-3xl font-semibold">${totals.value.toFixed(2)}</div></CardContent></Card>
        <Card className="glass-panel border-white/5 bg-card/30"><CardContent className="p-5"><div className="text-xs text-muted-foreground mb-1">Implied P/L</div><div className={`text-3xl font-semibold ${totals.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${totals.pnl.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card className="glass-panel border-white/5 bg-card/30 mb-5">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-teal-400" />Add Position</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} />
          <Input placeholder="Shares" value={shares} onChange={(e) => setShares(e.target.value)} />
          <Input placeholder="Avg Cost" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} />
          <Button onClick={addHolding} className="bg-teal-500 hover:bg-teal-600 text-white"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pb-20">
        {rows.map((row) => (
          <Card key={row.ticker} className="glass-panel border-white/5 bg-card/30">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-lg">{row.ticker}</p>
                <p className="text-xs text-muted-foreground">{row.shares} shares at ${row.avgCost.toFixed(2)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-400 border-teal-500/20"><Scale className="w-3 h-3 mr-1" />Belief {row.belief}</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5"><DollarSign className="w-3 h-3 mr-1" />Value ${row.marketValue.toFixed(2)}</Badge>
                <Badge className={row.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}>
                  P/L {row.pnl >= 0 ? '+' : ''}{row.pnl.toFixed(2)}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" onClick={() => removeHolding(row.ticker)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No positions yet. Add your first holding above.</div>
        )}
      </div>
    </div>
  );
}
