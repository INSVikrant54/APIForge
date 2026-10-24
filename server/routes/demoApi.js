import express from 'express';
import { demoStore } from '../services/demoStore.js';

const router = express.Router();

// GET /api/demo/mode - Retrieve current mode and state
router.get('/mode', (req, res) => {
  res.json(demoStore.getMode());
});

// POST /api/demo/mode - Toggle or set mode (safe or vulnerable)
router.post('/mode', (req, res) => {
  const { mode } = req.body;
  try {
    const updated = demoStore.setMode(mode);
    res.json({
      success: true,
      ...updated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/demo/reset - Reset demo database
router.post('/reset', (req, res) => {
  res.json(demoStore.reset());
});

// POST /api/demo/orders - Demo Order Endpoint
router.post('/orders', (req, res) => {
  const result = demoStore.createOrder(req.body || {});
  res.status(result.status).json(result.body);
});

// GET /api/demo/orders - List existing demo orders
router.get('/orders', (req, res) => {
  res.json({
    orders: demoStore.orders,
    count: demoStore.orders.length,
    mode: demoStore.mode
  });
});

export default router;
