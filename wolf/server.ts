import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const pythonCommand = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

  // Start FastAPI backend
  console.log("Starting FastAPI backend...");
  const pythonProcess = spawn(pythonCommand, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: path.join(process.cwd(), 'backend'),
    stdio: 'inherit'
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err);
  });

  // Proxy API requests to FastAPI backend
  app.use('/api', createProxyMiddleware({ 
    target: 'http://localhost:8000', 
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`
  }));

  // Proxy WebSocket requests to FastAPI backend
  app.use('/ws', createProxyMiddleware({ 
    target: 'http://localhost:8000', 
    ws: true,
    changeOrigin: true,
    pathRewrite: (path) => (path === '/' ? '/ws' : path)
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
