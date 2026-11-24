import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import demoApiRoutes from './routes/demoApi.js';
import analyzeRoutes from './routes/analyze.js';
import runnerRoutes from './routes/runner.js';
import explainRoutes from './routes/explain.js';
import { verifyApiKey } from './services/gemmaService.js';
import { analyzeLimiter, explainLimiter, verifyKeyLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : DEFAULT_DEV_ORIGINS;

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server, node:test) with no Origin header
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: '1mb' }));

// Basic health check route
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    app: 'APIForge',
    aiConfigured: hasKey,
    model: process.env.GEMMA_MODEL || 'gemini-3.5-flash-lite',
    timestamp: new Date().toISOString()
  });
});


// Verify API Key on demand
app.post('/api/verify-key', verifyKeyLimiter, async (req, res) => {
  const { apiKey, model } = req.body || {};
  const result = await verifyApiKey(apiKey, model);
  res.json(result);
});

// Mount Routes
app.use('/api/demo', demoApiRoutes);
app.use('/api/analyze', analyzeLimiter, analyzeRoutes);
app.use('/api/run-tests', runnerRoutes);
app.use('/api/explain-failure', explainLimiter, explainRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
if (!hasGeminiKey) {
  console.warn('⚠️  GEMINI_API_KEY is not set. AI test generation and failure explanations will fall back to offline mode or fail. Set GEMINI_API_KEY in server/.env or your environment.');
}

const isRunningTests = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
if (!isRunningTests) {
  app.listen(PORT, () => {
    console.log(`🚀 APIForge server running on http://localhost:${PORT}`);
  });
}

export default app;
