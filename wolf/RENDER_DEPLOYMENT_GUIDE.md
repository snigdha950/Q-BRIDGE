# Render Deployment Configuration Guide

## Environment Variables Required

### 1. **RAPIDAPI_KEY** (Required for Live Market Data)
- **Purpose:** RapidAPI key for Yahoo Finance API integration
- **Where to Get:** https://rapidapi.com/apidojo/api/yahoo-finance-api
- **Steps:**
  1. Sign up/Login to RapidAPI
  2. Subscribe to "Yahoo Finance API"
  3. Go to your Dashboard → API Keys section
  4. Copy your key
- **Render Setup:**
  1. Dashboard → Select Backend Service → Environment
  2. Add: `RAPIDAPI_KEY` = `<your_key>`
  3. Save (auto-redeploy triggered)
- **Impact:** Without this, all trending stock data falls back to mock data

### 2. **YOUTUBE_API_KEY** (Optional for YouTube Signals)
- **Purpose:** Google YouTube Data API v3 for fetching stock video signals
- **Where to Get:** https://console.cloud.google.com/
- **Steps:**
  1. Create a GCP project or use existing
  2. Enable "YouTube Data API v3"
  3. Create API Key (restrict to YouTube Data API)
  4. Copy key
- **Important:** Avoid hardcoding API keys with quota restrictions or revoked keys
- **Render Setup:**
  1. Dashboard → Select Backend Service → Environment
  2. Add: `YOUTUBE_API_KEY` = `<your_key>`
  3. Save (auto-redeploy triggered)
- **Impact:** Without this, YouTube signal requests are skipped (graceful degradation)
- **If You See 403 Forbidden:**
  - Key may be restricted to specific domains (check Google Cloud Console)
  - Remove the key entirely and rely on Reddit/StockTwits signals only
  - API quota may be exhausted

### 3. **ALLOWED_ORIGINS** (For CORS)
- **Purpose:** Whitelist frontend domains to prevent CORS errors
- **Format:** Comma-separated or JSON array
- **Example Comma Format:**
  ```
  ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.vercel.app,https://app.yourdomain.com
  ```
- **Example JSON Format:**
  ```
  ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.vercel.app"]
  ```
- **Render Setup:**
  1. Dashboard → Select Backend Service → Environment
  2. Add: `ALLOWED_ORIGINS` = your Vercel frontend URL
  3. Save

### 4. **Optional: Webshare Residential Proxies** (For YouTube Transcript Scraping)
- **Purpose:** Bypass IP bans when scraping YouTube transcripts
- **Steps:**
  1. Sign up to https://webshare.io/
  2. Get credentials from dashboard
- **Render Setup:**
  1. Add: `WEBSHARE_USERNAME` = `<your_username>`
  2. Add: `WEBSHARE_PASSWORD` = `<your_password>`
  3. Save

### 5. **Optional: Reddit/StockTwits Tokens**
- **Purpose:** Authenticated access to Reddit/StockTwits APIs (currently not required)
- **Render Setup:**
  1. Add if you want: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `STOCKTWITS_TOKEN`
  2. Save

## Troubleshooting

### "Falling back to mock trending data for [TICKER]"
- **Cause:** `RAPIDAPI_KEY` not set or invalid
- **Fix:** Add/verify `RAPIDAPI_KEY` in Render Environment
- **Verify:** Check logs for "Successfully fetched [TICKER] chart from RapidAPI"

### "Request failed for https://www.googleapis.com/youtube/v3/search: 403"
- **Cause:** YouTube API key is restricted, revoked, or quota exceeded
- **Fix:** Option A - Remove `YOUTUBE_API_KEY` entirely (graceful fallback)
  - Option B - Get new valid key from Google Cloud Console
  - Option C - Check Google Cloud Console for domain restrictions / quota limits
- **Note:** Backend logs the warning but continues (Reddit signals still work)

### WebSocket Connection Issues
- **Cause:** Usually not env var related; check backend logs for connection errors
- **Fix:** Verify `ALLOWED_ORIGINS` includes frontend domain
- **Verify:** Check logs for "[WebSocket] Client ... connected"

### Service Won't Start
- **Check:** Render Build Logs for Python/dependency errors
- **Common:** Missing `faiss-cpu` in `backend/requirements.txt`
- **Fix:** Ensure `requirements.txt` has all dependencies, commit, and Render will auto-rebuild

## Deployment Workflow

1. **Local Development:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your LOCAL keys (or leave empty for mock data)
   python -m venv venv
   source venv/Scripts/activate  # Windows: venv\Scripts\activate
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --reload
   ```

2. **Production (Render):**
   - Commit code to main branch
   - Render auto-deploys from git
   - Add/update environment variables in Render Dashboard
   - Render auto-redeploys when env vars change

3. **Monitor:**
   - Check Render logs for "service is live" message
   - Verify no "Falling back to mock" warnings (if you want live data)
   - Check WebSocket connection count (should be > 0 if frontend connected)

## Security Best Practices

- **Never commit `.env` files** to git (already in `.gitignore`)
- **Never hardcode API keys** in source code
- **Rotate keys regularly** if compromised
- **Use environment-specific keys** (dev keys vs prod keys)
- **Restrict API key permissions** to minimum scope in provider console
- **Monitor API usage** to detect quota issues early
