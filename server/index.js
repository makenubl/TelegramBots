const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const cors = require('cors');
const { generateBotMessage, getBotStatus, bots } = require('./bots');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store bot configurations (Telegram chat IDs, etc.)
let botConfigs = {};

// Global Telegram Bot Token (set via dashboard)
let telegramBotToken = '';

/* ── Telegram delivery ── */
function sendTelegram(chatId, text) {
  if (!telegramBotToken || !chatId) return;

  const payload = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  });

  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${telegramBotToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Telegram API error (${res.statusCode}):`, body);
      }
    });
  });

  req.on('error', (err) => console.error('Telegram send error:', err.message));
  req.write(payload);
  req.end();
}

function deliverToTelegram(activity) {
  const cfg = botConfigs[activity.botId];
  if (!cfg || !cfg.telegramId) return;

  const emoji = { monica: '👩‍💼', dwight: '🕵️', kelly: '💅', ross: '🔬', pam: '🎨', rachel: '💼' };
  const icon = emoji[activity.botId] || '🤖';
  const tag = activity.category === 'coordination' ? '🤝 Coordination' : '📋 Update';

  const msg = `${icon} <b>${activity.botName}</b>  ·  ${activity.role}\n\n${activity.content}\n\n<i>${tag}</i>`;
  sendTelegram(cfg.telegramId, msg);
}

// Activity log
let activityLog = [];
const MAX_LOG_SIZE = 200;
let activityCounter = 0;

function addActivity(activity) {
  activityCounter++;
  activityLog.unshift({
    ...activity,
    id: `${Date.now()}-${activityCounter}`,
    timestamp: new Date().toISOString()
  });
  if (activityLog.length > MAX_LOG_SIZE) {
    activityLog = activityLog.slice(0, MAX_LOG_SIZE);
  }
}

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Simulate bot activity
function simulateBotActivity() {
  const msg = generateBotMessage();
  addActivity(msg);
  broadcast({ type: 'new_activity', data: msg });
  deliverToTelegram(msg);

  // Occasionally generate coordination messages (bots talking to each other)
  if (Math.random() < 0.3) {
    setTimeout(() => {
      const coordination = generateBotMessage(true);
      addActivity(coordination);
      broadcast({ type: 'new_activity', data: coordination });
      deliverToTelegram(coordination);
    }, 2000 + Math.random() * 3000);
  }

  // Schedule next activity
  const interval = 3000 + Math.random() * 8000; // 3-11 seconds
  setTimeout(simulateBotActivity, interval);
}

// Generate initial activity burst
function generateInitialActivity() {
  const count = 15;
  for (let i = 0; i < count; i++) {
    const msg = generateBotMessage();
    msg.timestamp = new Date(Date.now() - (count - i) * 60000 * (1 + Math.random() * 5)).toISOString();
    addActivity(msg);
  }
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Dashboard client connected');

  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      bots: bots.map(b => ({
        ...b,
        status: getBotStatus(b.id),
        config: botConfigs[b.id] || {}
      })),
      activities: activityLog.slice(0, 50),
      telegramBotToken: telegramBotToken ? '••••' + telegramBotToken.slice(-6) : ''
    }
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'update_config') {
        botConfigs[parsed.botId] = {
          ...botConfigs[parsed.botId],
          ...parsed.config
        };
        broadcast({
          type: 'config_updated',
          data: { botId: parsed.botId, config: botConfigs[parsed.botId] }
        });
      }
      if (parsed.type === 'set_token') {
        telegramBotToken = parsed.token || '';
        const masked = telegramBotToken ? '••••' + telegramBotToken.slice(-6) : '';
        console.log(`🔑 Telegram Bot Token ${telegramBotToken ? 'set' : 'cleared'}`);
        broadcast({ type: 'token_updated', data: { masked } });
      }
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Dashboard client disconnected');
  });
});

// REST endpoints
app.get('/api/bots', (req, res) => {
  res.json(bots.map(b => ({
    ...b,
    status: getBotStatus(b.id),
    config: botConfigs[b.id] || {}
  })));
});

app.get('/api/activities', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(activityLog.slice(0, limit));
});

app.post('/api/bots/:id/config', (req, res) => {
  const { id } = req.params;
  botConfigs[id] = { ...botConfigs[id], ...req.body };
  broadcast({
    type: 'config_updated',
    data: { botId: id, config: botConfigs[id] }
  });
  res.json({ success: true, config: botConfigs[id] });
});

app.get('/api/stats', (req, res) => {
  const now = new Date();
  const last24h = activityLog.filter(a =>
    new Date(a.timestamp) > new Date(now - 24 * 60 * 60 * 1000)
  );
  res.json({
    totalMessages: activityLog.length,
    last24h: last24h.length,
    activeBots: bots.filter(b => getBotStatus(b.id) === 'active').length,
    totalBots: bots.length,
    uptime: process.uptime()
  });
});

// Set global Telegram Bot Token
app.post('/api/telegram/token', (req, res) => {
  telegramBotToken = req.body.token || '';
  const masked = telegramBotToken ? '••••' + telegramBotToken.slice(-6) : '';
  console.log(`🔑 Telegram Bot Token ${telegramBotToken ? 'set' : 'cleared'}`);
  broadcast({ type: 'token_updated', data: { masked } });
  res.json({ success: true, masked });
});

// Test Telegram delivery for a specific bot
app.post('/api/telegram/test/:botId', (req, res) => {
  const bot = bots.find(b => b.id === req.params.botId);
  const cfg = botConfigs[req.params.botId];
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  if (!telegramBotToken) return res.status(400).json({ error: 'Set a Telegram Bot Token first' });
  if (!cfg?.telegramId) return res.status(400).json({ error: 'Set a Chat ID for this bot first' });

  const emoji = { monica: '👩‍💼', dwight: '🕵️', kelly: '💅', ross: '🔬', pam: '🎨', rachel: '💼' };
  const icon = emoji[bot.id] || '🤖';
  const testMsg = `${icon} <b>${bot.name}</b>  ·  ${bot.role}\n\n✅ Test message — Telegram delivery is working!\n\n<i>🧪 Test</i>`;
  sendTelegram(cfg.telegramId, testMsg);
  res.json({ success: true, message: 'Test message sent' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🤖 Agent Dashboard Server running on port ${PORT}`);
  generateInitialActivity();
  setTimeout(simulateBotActivity, 2000);
});
