import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Plus, X, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function Watchlist() {
  const {
    watchlist,
    hydrateWatchlist,
    toggleWatchlistTicker,
    trendingStocks,
    fetchTrending,
    setActiveTicker,
  } = useAppStore();

  const [tickerInput, setTickerInput] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const [activeGroup, setActiveGroup] = useState('Default');
  const [groups, setGroups] = useState<Record<string, string[]>>({ Default: [] });

  const GROUPS_STORAGE_KEY = 'qb-watchlist-groups';

  useEffect(() => {
    hydrateWatchlist();
    if (trendingStocks.length === 0) {
      fetchTrending();
    }

    try {
      const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setGroups(parsed);
          const keys = Object.keys(parsed);
          if (keys.length > 0) setActiveGroup(keys[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load watchlist groups:', error);
    }
  }, [hydrateWatchlist, trendingStocks.length, fetchTrending]);

  const watchlistData = useMemo(() => {
    return watchlist.map((ticker) => {
      const stock = trendingStocks.find((s) => s.ticker === ticker);
      return {
        ticker,
        name: stock?.name ?? `${ticker} (custom)` ,
        beliefScore: stock?.beliefScore ?? null,
        velocity: stock?.velocity ?? null,
        sentiment: stock?.sentiment ?? 'neutral',
      };
    });
  }, [watchlist, trendingStocks]);

  const addTicker = () => {
    const clean = tickerInput.trim().toUpperCase();
    if (!clean) return;
    toggleWatchlistTicker(clean);
    const next = {
      ...groups,
      [activeGroup]: Array.from(new Set([...(groups[activeGroup] ?? []), clean])),
    };
    setGroups(next);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
    setTickerInput('');
  };

  const filteredWatchlistData = watchlistData.filter((item) => {
    const g = groups[activeGroup] ?? [];
    if (activeGroup === 'All') return true;
    return g.includes(item.ticker);
  });

  const createGroup = () => {
    const name = groupInput.trim();
    if (!name || groups[name]) return;
    const next = { ...groups, [name]: [] };
    setGroups(next);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
    setActiveGroup(name);
    setGroupInput('');
  };

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-6xl mx-auto overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Watchlist</h1>
        <p className="text-muted-foreground">Pin tickers and jump directly into belief detail views.</p>
      </motion.div>

      <Card className="glass-panel border-white/5 bg-card/30 mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTicker();
            }}
            placeholder="Add ticker (e.g. NVDA)"
            className="bg-transparent"
          />
          <Button onClick={addTicker} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/5 bg-card/30 mb-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveGroup('All')}
              className={`text-xs px-2.5 py-1 rounded-full border ${activeGroup === 'All' ? 'border-teal-500/40 bg-teal-500/10 text-teal-400' : 'border-white/10 bg-white/5 text-muted-foreground'}`}
            >
              All
            </button>
            {Object.keys(groups).map((groupName) => (
              <button
                key={groupName}
                onClick={() => setActiveGroup(groupName)}
                className={`text-xs px-2.5 py-1 rounded-full border ${activeGroup === groupName ? 'border-teal-500/40 bg-teal-500/10 text-teal-400' : 'border-white/10 bg-white/5 text-muted-foreground'}`}
              >
                {groupName}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input value={groupInput} onChange={(e) => setGroupInput(e.target.value)} placeholder="Create watchlist group" />
            <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10" onClick={createGroup}>Create Group</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
        {filteredWatchlistData.map((item, index) => (
          <motion.div key={item.ticker} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="glass-panel border-white/5 bg-card/30 hover:border-teal-500/30 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{item.ticker}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                    onClick={() => toggleWatchlistTicker(item.ticker)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-2">
                  {item.beliefScore !== null && (
                    <Badge variant="secondary" className="bg-teal-500/10 text-teal-400 border-teal-500/20">
                      Belief {item.beliefScore}
                    </Badge>
                  )}
                  {item.velocity !== null && (
                    <Badge variant="outline" className="border-white/10 bg-white/5">
                      {item.velocity > 0 ? '+' : ''}{item.velocity}%
                    </Badge>
                  )}
                </div>
                <Button onClick={() => setActiveTicker(item.ticker)} className="w-full justify-between bg-white/5 hover:bg-white/10" variant="outline">
                  Open Detail <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredWatchlistData.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No tickers in this group yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
