import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  Eye, 
  Bell, 
  FileText, 
  Wallet,
  Settings,
  Search,
  ArrowRight,
  Sparkles,
  BarChart3,
  Cpu,
  MessageSquare,
  Send,
  Menu,
  X,
  Loader
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore, ViewState } from '@/src/store';
import { getLLMStatus, isLLMConfigured, queryMarketLLM, resetLLMFallback } from '@/src/services/llm';

const Trending = lazy(() => import('@/src/components/Trending').then((mod) => ({ default: mod.Trending })));
const StockDetail = lazy(() => import('@/src/components/StockDetail').then((mod) => ({ default: mod.StockDetail })));
const Signals = lazy(() => import('@/src/components/Signals').then((mod) => ({ default: mod.Signals })));
const Alerts = lazy(() => import('@/src/components/Alerts').then((mod) => ({ default: mod.Alerts })));
const Watchlist = lazy(() => import('@/src/components/Watchlist').then((mod) => ({ default: mod.Watchlist })));
const Reports = lazy(() => import('@/src/components/Reports').then((mod) => ({ default: mod.Reports })));
const Portfolio = lazy(() => import('@/src/components/Portfolio').then((mod) => ({ default: mod.Portfolio })));
const SettingsView = lazy(() => import('@/src/components/SettingsView').then((mod) => ({ default: mod.SettingsView })));

const MENU_ITEMS: { icon: any; label: string; view: ViewState }[] = [
  { icon: TrendingUp, label: 'Trending', view: 'trending' },
  { icon: Activity, label: 'Market Signals', view: 'signals' },
  { icon: Eye, label: 'Watchlist', view: 'watchlist' },
  { icon: Bell, label: 'Alerts', view: 'alerts' },
  { icon: FileText, label: 'Reports', view: 'reports' },
  { icon: Wallet, label: 'Portfolio', view: 'portfolio' },
  { icon: Settings, label: 'Settings', view: 'settings' },
];

const SUGGESTIONS = [
  {
    icon: BarChart3,
    title: 'Belief score of NVDA',
    description: 'Analyze current market sentiment vs actual price',
    color: 'text-teal-400'
  },
  {
    icon: TrendingUp,
    title: 'Trending stocks',
    description: 'Discover what the market is focusing on right now',
    color: 'text-emerald-400'
  },
  {
    icon: Cpu,
    title: 'Semiconductor signals',
    description: 'Deep dive into the semiconductor sector beliefs',
    color: 'text-cyan-400'
  },
  {
    icon: MessageSquare,
    title: 'Sentiment analysis',
    description: 'Extract beliefs from recent earnings calls',
    color: 'text-green-400'
  }
];

interface HomeViewProps {
  onNavigate: (view: ViewState) => void;
  onOpenTicker: (ticker: string) => void;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

function buildChatReply(query: string, onNavigate: (view: ViewState) => void, onOpenTicker: (ticker: string) => void) {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  const tickerMatch = trimmed.toUpperCase().match(/\b[A-Z]{1,5}\b/);
  if (tickerMatch) {
    const ticker = tickerMatch[0];
    onOpenTicker(ticker);
    return `Opening ${ticker}. I’m pulling the latest belief score, signal, and chart context now.`;
  }

  if (normalized.includes('trend')) {
    onNavigate('trending');
    return 'Taking you to Trending so you can scan what the market is focusing on right now.';
  }

  if (normalized.includes('signal') || normalized.includes('sentiment')) {
    onNavigate('signals');
    return 'Opening Market Signals. That view shows the strongest narrative shifts and explainability.';
  }

  if (normalized.includes('watchlist')) {
    onNavigate('watchlist');
    return 'Opening your Watchlist so you can track the names you care about.';
  }

  if (normalized.includes('alert')) {
    onNavigate('alerts');
    return 'Opening Alerts. You can review live alerts or build a new one from there.';
  }

  if (normalized.includes('portfolio')) {
    onNavigate('portfolio');
    return 'Opening Portfolio so you can review belief-weighted holdings and risk.';
  }

  if (normalized.includes('report')) {
    onNavigate('reports');
    return 'Opening Reports for summary metrics, backtesting, and exports.';
  }

  return 'I can open a ticker, trending stocks, signals, alerts, watchlist, reports, or portfolio. Ask me about any ticker like NVDA or TSLA.';
}

function HomeView({ onNavigate, onOpenTicker }: HomeViewProps) {
  const { trendingStocks, fetchTrending } = useAppStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const llmStatus = getLLMStatus();
  const llmFallbackActive = llmStatus !== 'available' && llmStatus !== 'not-configured';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: isLLMConfigured() 
        ? (llmFallbackActive
          ? 'Hugging Face is currently rate-limited, so I\'m using a local market-analysis fallback. Ask about a ticker, trend, or signal and I\'ll still help.'
          : 'Ask me about market insights, stock analysis, trends, signals, or any ticker. I\'ll provide intelligent market analysis.')
        : 'Ask me about a ticker, a sector, or what the market believes right now. I can open the right view for you.'
    }
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (trendingStocks.length === 0) {
      fetchTrending();
    }
  }, [fetchTrending, trendingStocks.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setShowSuggestions(false);
    setMessages((current) => [
      ...current,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '', isLoading: true },
    ]);
    setIsLoading(true);

    try {
      const response = await queryMarketLLM(trimmed);
      setMessages((current) => {
        const updated = [...current];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: response,
          isLoading: false,
        };
        return updated;
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((current) => {
        const updated = [...current];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Error processing your question. Please try again.',
          isLoading: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (title: string) => {
    setInput(title.includes('NVDA') 
      ? `What's the current market belief and sentiment on ${title.split(' ')[title.split(' ').length - 1]}?`
      : `Analyze ${title.toLowerCase()} for me`);
  };

  const hasMessages = messages.length > 1;

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      {!hasMessages ? (
        // Landing state
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full pb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-3 sm:mb-4 text-foreground/90">
              Track what the market believes <br className="hidden sm:block" />
              <span className="text-gradient">before price reacts.</span>
            </h1>
          </motion.div>

          {/* Main Input */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-2xl relative group mb-8 sm:mb-12"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-teal-500/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative glass-panel rounded-2xl p-2 flex items-center gap-2">
              <div className="pl-3 sm:pl-4 text-muted-foreground">
                <Search className="w-5 h-5" />
              </div>
              <Input 
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isLoading) {
                    handleSend();
                  }
                }}
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-base sm:text-lg h-12 sm:h-14 placeholder:text-muted-foreground/70 disabled:opacity-50"
                placeholder="Why is TSLA falling? What's the market sentiment on AI stocks?"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isLoading}
                className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 mr-1"
                aria-label="Submit market question"
              >
                {isLoading ? <Loader className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" /> : <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />}
              </Button>
            </div>
          </motion.div>

          {/* Suggestion Cards */}
          {showSuggestions && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {SUGGESTIONS.map((suggestion) => (
                <motion.button
                  key={suggestion.title}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion.title)}
                  className="cursor-pointer text-left"
                >
                  <Card className="glass-panel border-white/5 hover:border-teal-500/30 transition-colors group h-full bg-card/30">
                    <CardContent className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                      <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${suggestion.color} flex-shrink-0`}>
                        <suggestion.icon className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-xs sm:text-sm text-foreground/90 mb-1 group-hover:text-teal-400 transition-colors line-clamp-2">
                          {suggestion.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {suggestion.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        // Chat state
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-4 sm:px-6 md:px-8 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                      message.role === 'user'
                        ? 'bg-teal-500 text-white border-teal-400/30'
                        : 'bg-white/5 text-foreground border-white/10'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Analyzing market insights...</span>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Section */}
          <div className="border-t border-white/5 bg-background/50 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isLoading) {
                      handleSend();
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Ask about market trends, signals, or any ticker..."
                  className="h-10 sm:h-11 border-white/10 bg-black/20 focus-visible:ring-teal-500/50 disabled:opacity-50 text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={handleSend}
                disabled={isLoading}
                className="h-10 sm:h-11 px-3 sm:px-4 bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Status and Actions */}
            <div className="px-4 sm:px-6 md:px-8 py-2 flex items-center justify-between gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                {llmFallbackActive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      resetLLMFallback();
                      setMessages((current) => [...current]);
                    }}
                    className="h-7 px-2 text-xs text-teal-300 hover:text-teal-200 hover:bg-teal-500/10"
                  >
                    Retry Hugging Face
                  </Button>
                ) : null}
              </div>
              <Badge variant="secondary" className="bg-teal-500/10 text-teal-400 border-teal-500/20 text-xs">
                {llmFallbackActive ? 'Local fallback' : trendingStocks.length > 0 ? 'Live context ready' : 'Loading context'}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { activeView, setActiveView, wsConnected, setActiveTicker, connectWebSocket, hydrateWatchlist } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    hydrateWatchlist();
    connectWebSocket();

    return () => {
      useAppStore.getState().disconnectWebSocket();
    };
  }, [connectWebSocket, hydrateWatchlist]);

  const activeViewLabel = useMemo(() => {
    if (activeView === 'home') {
      return 'Home';
    }
    return MENU_ITEMS.find((item) => item.view === activeView)?.label ?? 'Q-Belief Net';
  }, [activeView]);

  const onViewSelect = (view: ViewState) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const onTickerSelect = (ticker: string) => {
    setActiveTicker(ticker);
    setMobileMenuOpen(false);
  };

  return (
    <div className="relative flex h-dvh min-h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Left Sidebar (Desktop) */}
      <motion.aside 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 hidden md:flex w-64 shrink-0 border-r border-border/50 bg-background/50 backdrop-blur-xl flex-col"
      >
        <div 
          className="p-6 flex items-center gap-3 cursor-pointer" 
          onClick={() => onViewSelect('home')}
        >
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight hover:text-teal-400 transition-colors">Q-Belief Net</span>
        </div>

        <ScrollArea className="flex-1 px-4 py-2">
          <nav className="space-y-1">
            {MENU_ITEMS.map((item, index) => {
              const isActive = activeView === item.view;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => onViewSelect(item.view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-teal-500/10 text-teal-400' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </motion.button>
              );
            })}
          </nav>
        </ScrollArea>
      </motion.aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-30 w-72 border-r border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <button
                type="button"
                className="flex items-center gap-3"
                onClick={() => onViewSelect('home')}
              >
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-lg tracking-tight">Q-Belief Net</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100%-65px)] px-4 py-3">
              <nav className="space-y-1">
                {MENU_ITEMS.map((item) => {
                  const isActive = activeView === item.view;
                  return (
                    <button
                      key={item.label}
                      onClick={() => onViewSelect(item.view)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-500/10 text-teal-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </motion.aside>
        </>
      )}

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 gap-3 shrink-0 border-b border-border/30 md:border-b-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="md:hidden text-sm font-medium truncate">{activeViewLabel}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
              <span className="text-xs text-muted-foreground hidden sm:inline">{wsConnected ? 'Live' : 'Static'}</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20 transition-colors">
              Belief Pro
            </Badge>
            <Avatar className="w-8 h-8 border border-border/50 cursor-pointer hover:ring-2 ring-teal-500/50 transition-all">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>QN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Dynamic View Area */}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading view...</div>}>
          {activeView === 'home' && <HomeView onNavigate={onViewSelect} onOpenTicker={onTickerSelect} />}
          {activeView === 'trending' && <Trending />}
          {activeView === 'signals' && <Signals />}
          {activeView === 'watchlist' && <Watchlist />}
          {activeView === 'alerts' && <Alerts />}
          {activeView === 'reports' && <Reports />}
          {activeView === 'portfolio' && <Portfolio />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'stock' && <StockDetail />}
        </Suspense>
      </main>
    </div>
  );
}
