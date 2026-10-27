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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Basic health check route
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    app: 'APIForge',
    aiConfigured: hasKey,
    model: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
    timestamp: new Date().toISOString()
  });
});


// Verify API Key on demand
app.post('/api/verify-key', async (req, res) => {
  const { apiKey, model } = req.body || {};
  const result = await verifyApiKey(apiKey, model);
  res.json(result);
});

// Mount Routes
app.use('/api/demo', demoApiRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/run-tests', runnerRoutes);
app.use('/api/explain-failure', explainRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const isRunningTests = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
if (!isRunningTests) {
  app.listen(PORT, () => {
    console.log(`🚀 APIForge server running on http://localhost:${PORT}`);
  });
}

export default app;
