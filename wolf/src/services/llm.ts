const apiKey = import.meta.env.VITE_HF_API_KEY;

if (!apiKey) {
  console.warn("VITE_HF_API_KEY not set. LLM queries will not work.");
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const hfApiKey = import.meta.env.VITE_HF_API_KEY;
const MODEL_NAME = "meta-llama/Meta-Llama-3-8B";
const LLM_UNAVAILABLE_UNTIL_KEY = "q_belief_net_hf_llm_unavailable_until";
const LLM_UNAVAILABLE_REASON_KEY = "q_belief_net_hf_llm_unavailable_reason";
const LLM_HARD_LOCK_KEY = "q_belief_net_hf_llm_hard_lock";
const LEGACY_KEYS = [
  "q_belief_net_llm_unavailable_until",
  "q_belief_net_llm_unavailable_reason",
  "q_belief_net_llm_hard_lock",
];

let llmUnavailableUntil = 0;
let llmUnavailableReason = "";
let llmHardLocked = false;

function buildApiUrl(path: string): string {
  if (!apiBaseUrl) return path;
  return `${apiBaseUrl}${path}`;
}

function readStoredCooldown(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }

  const hardLock = window.localStorage.getItem(LLM_HARD_LOCK_KEY);
  const storedUntil = window.localStorage.getItem(LLM_UNAVAILABLE_UNTIL_KEY);
  const storedReason = window.localStorage.getItem(LLM_UNAVAILABLE_REASON_KEY);
  const parsedUntil = storedUntil ? Number(storedUntil) : 0;

  llmHardLocked = hardLock === "true";

  if (llmHardLocked) {
    llmUnavailableUntil = Number.POSITIVE_INFINITY;
    llmUnavailableReason = storedReason || "Hugging Face quota exhausted";
    return;
  }

  if (Number.isFinite(parsedUntil) && parsedUntil > Date.now()) {
    llmUnavailableUntil = parsedUntil;
    llmUnavailableReason = storedReason || "Hugging Face quota exhausted";
  }
}

function storeCooldown(until: number, reason: string, hardLock = false): void {
  llmUnavailableUntil = hardLock ? Number.POSITIVE_INFINITY : until;
  llmUnavailableReason = reason;
  llmHardLocked = hardLock;

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LLM_UNAVAILABLE_UNTIL_KEY, String(llmUnavailableUntil));
  window.localStorage.setItem(LLM_UNAVAILABLE_REASON_KEY, reason);
  window.localStorage.setItem(LLM_HARD_LOCK_KEY, String(hardLock));
}

readStoredCooldown();

function extractTickers(question: string): string[] {
  const matches = question.toUpperCase().match(/\b[A-Z]{2,5}\b/g) ?? [];
  return [...new Set(matches)].slice(0, 3);
}

function buildFallbackResponse(question: string): string {
  const tickers = extractTickers(question);
  const lowered = question.toLowerCase();

  if (tickers.length > 0) {
    const tickerList = tickers.join(", ");
    return `I’m currently using a local fallback because the Hugging Face model is unavailable. For ${tickerList}, check recent price momentum, sector rotation, and any fresh earnings or guidance changes before drawing a conclusion.`;
  }

  if (lowered.includes("fall") || lowered.includes("drop") || lowered.includes("down")) {
    return "I’m currently using a local fallback because the Hugging Face model is unavailable. A reasonable starting point is to look for weak guidance, macro pressure, sector weakness, or a sentiment shift driving the move. If you want, I can still open the relevant stock or market view.";
  }

  if (lowered.includes("ai") || lowered.includes("tech") || lowered.includes("semiconductor")) {
    return "I’m currently using a local fallback because the Hugging Face model is unavailable. For AI and tech names, watch for relative strength versus the sector, earnings revisions, and whether momentum is broadening or narrowing. If you want, I can still route you to the trending or signals view.";
  }

  return "I’m currently using a local fallback because the Hugging Face model is unavailable. I can still help interpret the market at a high level, but live model responses are unavailable right now. Try asking about a ticker, sector, or why a stock is moving.";
}

export async function queryMarketLLM(question: string): Promise<string> {
  if (!apiKey) {
    return "LLM API key not configured. Please set VITE_HF_API_KEY in your frontend env file.";
  }

  if (llmHardLocked || llmUnavailableUntil > Date.now()) {
    return buildFallbackResponse(question);
  }

  try {
    const systemPrompt = `You are an expert market analyst specializing in stock beliefs, sentiment analysis, and market intelligence. 
You help traders understand:
- Why stocks are moving (belief-driven analysis)
- Market sentiment and narrative shifts
- Signal interpretations and market signals
- Portfolio risk and belief-weighted positions
- Sector momentum and conviction levels

Keep responses concise (2-3 sentences max), actionable, and grounded in market data concepts like belief scores, sentiment, velocity, and narrative momentum.
For ticker symbols, provide specific analysis. For general questions, give strategic market insights.`;

    const response = await fetch(buildApiUrl('/api/llm'), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        api_key: hfApiKey,
        model: MODEL_NAME,
        system_prompt: systemPrompt,
      }),
    });

    const payload = await response.json() as { response?: string; error?: string };

    if (!response.ok) {
      const errorMessage = typeof payload === "object" && payload && "error" in payload ? payload.error || "Unknown model error" : `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return payload.response?.trim() || "Unable to generate response. Please try again.";
  } catch (error) {
    const status = (error as { status?: number; code?: number; message?: string })?.status ?? (error as { code?: number })?.code;
    const message = (error as { message?: string })?.message ?? "";
    const isQuotaError = status === 429 || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit");

    if (isQuotaError) {
      storeCooldown(Number.POSITIVE_INFINITY, "Hugging Face quota exhausted", true);
      console.warn("Hugging Face quota exhausted; switching to local fallback until manually reset.");
      return buildFallbackResponse(question);
    }

    console.warn("LLM query error; using local fallback:", error);
    storeCooldown(Date.now() + 60_000, "Hugging Face unavailable", false);
    return buildFallbackResponse(question);
  }
}

export function isLLMConfigured(): boolean {
  return !!apiKey;
}

export function getLLMStatus(): string {
  if (!apiKey) {
    return "not-configured";
  }

  if (llmHardLocked) {
    return llmUnavailableReason || "quota-exhausted";
  }

  if (llmUnavailableUntil > Date.now()) {
    return llmUnavailableReason || "temporarily-unavailable";
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LLM_UNAVAILABLE_UNTIL_KEY);
    window.localStorage.removeItem(LLM_UNAVAILABLE_REASON_KEY);
  }

  return "available";
}

export function resetLLMFallback(): void {
  llmUnavailableUntil = 0;
  llmUnavailableReason = "";
  llmHardLocked = false;

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LLM_UNAVAILABLE_UNTIL_KEY);
  window.localStorage.removeItem(LLM_UNAVAILABLE_REASON_KEY);
  window.localStorage.removeItem(LLM_HARD_LOCK_KEY);
}
