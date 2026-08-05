import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Siren, Filter, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const severityClass: Record<string, string> = {
  high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export function Alerts() {
  const { alerts, isLoadingAlerts, fetchAlerts } = useAppStore();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [ruleTicker, setRuleTicker] = useState('');
  const [ruleCondition, setRuleCondition] = useState('belief > 80');
  const [rules, setRules] = useState<Array<{ id: string; ticker: string; condition: string }>>([]);

  const RULES_STORAGE_KEY = 'qb-custom-alert-rules';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RULES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRules(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load custom rules:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!alerts.length) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const top = alerts.find((a) => a.severity === 'high') ?? alerts[0];
    if (top) {
      new Notification(`Alert: ${top.ticker}`, { body: top.message });
    }
  }, [alerts]);

  const filtered = useMemo(() => {
    if (severityFilter === 'all') return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const persistRules = (next: Array<{ id: string; ticker: string; condition: string }>) => {
    setRules(next);
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save custom rules:', error);
    }
  };

  const addRule = () => {
    const t = ruleTicker.trim().toUpperCase();
    const c = ruleCondition.trim();
    if (!t || !c) return;
    persistRules([...rules, { id: `${Date.now()}`, ticker: t, condition: c }]);
    setRuleTicker('');
  };

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-6xl mx-auto overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Alerts Center</h1>
          <p className="text-muted-foreground">Threshold and anomaly alerts across your tracked names.</p>
        </div>
        <div className="flex items-center gap-2 bg-card/50 border border-border/50 rounded-lg p-1 backdrop-blur-sm">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          <Select value={severityFilter} onValueChange={(v: any) => setSeverityFilter(v)}>
            <SelectTrigger className="w-40 h-8 border-0 bg-transparent focus:ring-0 shadow-none">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="border-white/10 bg-white/5 hover:bg-white/10"
          onClick={async () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              await Notification.requestPermission();
            }
          }}
        >
          <Bell className="w-4 h-4 mr-1" /> Enable Browser Notifications
        </Button>
      </motion.div>

      <Card className="glass-panel border-white/5 bg-card/30 mb-6">
        <CardHeader>
          <CardTitle className="text-base">Custom Alert Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Ticker (e.g. NVDA)" value={ruleTicker} onChange={(e) => setRuleTicker(e.target.value)} />
            <Input placeholder="Condition (e.g. belief > 80)" value={ruleCondition} onChange={(e) => setRuleCondition(e.target.value)} />
            <Button onClick={addRule} className="bg-teal-500 hover:bg-teal-600 text-white"><Plus className="w-4 h-4 mr-1" />Add Rule</Button>
          </div>

          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-3 text-sm rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <span>
                  <span className="text-teal-400 mr-2">{rule.ticker}</span>
                  <span className="text-muted-foreground">{rule.condition}</span>
                </span>
                <button className="text-muted-foreground hover:text-rose-400" onClick={() => persistRules(rules.filter((r) => r.id !== rule.id))}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoadingAlerts ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-panel border-white/5 bg-card/30">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-20">
          {filtered.map((alert, index) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="glass-panel border-white/5 bg-card/30 hover:border-teal-500/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Siren className="w-4 h-4 text-teal-400" />
                      {alert.ticker}
                    </span>
                    <Badge className={severityClass[alert.severity] ?? severityClass.medium}>{alert.severity}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.time}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No alerts match your filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
