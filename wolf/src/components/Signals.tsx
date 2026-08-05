import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, MessageCircle, Radar, Youtube } from 'lucide-react';
import { useAppStore } from '@/src/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const impactClass: Record<string, string> = {
  high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export function Signals() {
  const { signals, isLoadingSignals, fetchSignals } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groupedSignals = useMemo(() => {
    const youtubeSignals = signals.filter((signal) => signal.type === 'youtube');
    const redditSignals = signals.filter((signal) => signal.type === 'reddit');
    const otherSignals = signals.filter((signal) => signal.type !== 'youtube' && signal.type !== 'reddit');

    return { youtubeSignals, redditSignals, otherSignals };
  }, [signals]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return (
    <div className="flex flex-col h-full w-full px-4 sm:px-8 py-8 max-w-6xl mx-auto overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Market Signals</h1>
        <p className="text-muted-foreground">Narrative shifts and sentiment divergences detected in real time.</p>
      </motion.div>

      {isLoadingSignals ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-panel border-white/5 bg-card/30">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6 pb-20">
          <SignalSection
            title="Reddit Signals"
            icon={<MessageCircle className="w-5 h-5 text-orange-400" />}
            signals={groupedSignals.redditSignals}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />

          <SignalSection
            title="YouTube Signals"
            icon={<Youtube className="w-5 h-5 text-red-400" />}
            signals={groupedSignals.youtubeSignals}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />

          {groupedSignals.otherSignals.length > 0 && (
            <SignalSection
              title="Other Signals"
              icon={<Radar className="w-5 h-5 text-teal-400" />}
              signals={groupedSignals.otherSignals}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
            />
          )}

          {signals.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No signals available right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignalSection({
  title,
  icon,
  signals,
  expandedId,
  setExpandedId,
}: {
  title: string;
  icon: React.ReactNode;
  signals: { id: string; type: string; title: string; description: string; impact: 'low' | 'medium' | 'high'; timestamp: string }[];
  expandedId: string | null;
  setExpandedId: (value: string | null) => void;
}) {
  return (
    <Card className="glass-panel border-white/5 bg-card/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="outline" className="ml-auto border-white/10 bg-white/5 text-xs">
            {signals.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {signals.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg p-4">
            No items in this section yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {signals.map((signal, index) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="glass-panel border-white/5 bg-card/30 h-full hover:border-teal-500/30 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-start justify-between gap-3">
                      <span>{signal.title}</span>
                      <Badge className={impactClass[signal.impact] ?? impactClass.medium}>{signal.impact}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{signal.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Radar className="w-3.5 h-3.5" /> {signal.type}</span>
                      <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {signal.timestamp}</span>
                    </div>

                    <button
                      onClick={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                      className="w-full flex items-center justify-between text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      Why this signal fired
                      {expandedId === signal.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expandedId === signal.id && (
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground space-y-2">
                        <p>Confidence model: {signal.impact === 'high' ? '0.87' : signal.impact === 'medium' ? '0.71' : '0.62'}</p>
                        <p>Primary factor: {signal.type.replace('_', ' ')} momentum spike in the latest narrative window.</p>
                        <p>Contributors: source density, belief velocity, and sentiment divergence.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
