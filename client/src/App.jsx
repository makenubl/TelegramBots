import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

/* ── helpers ── */
const wsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:3001`;
};

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const BOT_EMOJIS = {
  monica: '👩‍💼', dwight: '🕵️', kelly: '💅',
  ross: '🔬', pam: '🎨', rachel: '💼'
};

const BOT_COLORS = {
  monica: { bg: 'rgba(233,112,108,.12)', border: 'rgba(233,112,108,.35)', text: '#E9706C', glow: '0 0 24px rgba(233,112,108,.18)' },
  dwight: { bg: 'rgba(208,165,74,.12)',  border: 'rgba(208,165,74,.35)',  text: '#D0A54A', glow: '0 0 24px rgba(208,165,74,.18)' },
  kelly:  { bg: 'rgba(163,110,244,.12)', border: 'rgba(163,110,244,.35)', text: '#A36EF4', glow: '0 0 24px rgba(163,110,244,.18)' },
  ross:   { bg: 'rgba(111,168,220,.12)', border: 'rgba(111,168,220,.35)', text: '#6FA8DC', glow: '0 0 24px rgba(111,168,220,.18)' },
  pam:    { bg: 'rgba(247,160,114,.12)', border: 'rgba(247,160,114,.35)', text: '#F7A072', glow: '0 0 24px rgba(247,160,114,.18)' },
  rachel: { bg: 'rgba(95,191,138,.12)',  border: 'rgba(95,191,138,.35)',  text: '#5FBF8A', glow: '0 0 24px rgba(95,191,138,.18)' },
};

/* ── main app ── */
export default function App() {
  const [bots, setBots] = useState([]);
  const [activities, setActivities] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  const [tab, setTab] = useState('feed');
  const [tokenMasked, setTokenMasked] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const wsRef = useRef(null);
  const feedRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  // Tick every 10s so timeAgo updates
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer = null;

    function handleMessage(e) {
      const p = JSON.parse(e.data);
      if (p.type === 'init') {
        setBots(p.data.bots || []);
        setActivities(p.data.activities || []);
        if (p.data.telegramBotToken) setTokenMasked(p.data.telegramBotToken);
      }
      if (p.type === 'new_activity') {
        setActivities(prev => {
          // Deduplicate: skip if this id already exists
          if (prev.some(a => a.id === p.data.id)) return prev;
          return [p.data, ...prev].slice(0, 100);
        });
      }
      if (p.type === 'config_updated') {
        setBots(prev => prev.map(b => b.id === p.data.botId ? { ...b, config: p.data.config } : b));
      }
      if (p.type === 'token_updated') {
        setTokenMasked(p.data.masked);
      }
    }

    function connect() {
      if (disposed) return;
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!disposed) reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onmessage = handleMessage;
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const updateConfig = useCallback((botId, config) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'update_config', botId, config }));
    }
  }, []);

  const saveToken = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'set_token', token: tokenInput }));
      setTokenSaved(true);
      setTokenInput('');
      setTimeout(() => setTokenSaved(false), 2500);
    }
  }, [tokenInput]);

  const testBot = useCallback(async (botId) => {
    try {
      const res = await fetch(`/api/telegram/test/${botId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else alert('✅ Test message sent to Telegram!');
    } catch { alert('Failed to send test'); }
  }, []);

  const activeBots = useMemo(() => bots.filter(b => b.status === 'active').length, [bots]);
  const filteredActivities = useMemo(() => {
    if (!selectedBot) return activities;
    return activities.filter(a => a.botId === selectedBot);
  }, [activities, selectedBot]);

  // Map botId → avatar URL (respects custom DP if set)
  const avatarMap = useMemo(() => {
    const m = {};
    bots.forEach(b => { m[b.id] = b.config?.dpUrl || b.avatar; });
    return m;
  }, [bots]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activities.length]);

  return (
    <div className="app">
      {/* background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── header ── */}
      <header>
        <div className="header-left">
          <span className="logo-icon">🤖</span>
          <div>
            <h1>Life OS</h1>
            <p className="tagline">6 AI agents · Telegram · 24 / 7</p>
          </div>
        </div>
        <div className="header-right">
          <div className="kpi-row">
            <Kpi value={activeBots} label="Active" />
            <Kpi value={bots.length} label="Agents" />
            <Kpi value={activities.length} label="Msgs" />
          </div>
          <span className={`conn ${connected ? 'on' : 'off'}`}>
            <span className="conn-dot" />
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── telegram config bar ── */}
      <div className="tg-bar">
        <div className="tg-bar-left">
          <TelegramIcon size={16} />
          <span className="tg-bar-label">Telegram Bot Token</span>
          {tokenMasked && <span className="tg-bar-masked">{tokenMasked}</span>}
          {!tokenMasked && <span className="tg-bar-hint">Paste your token from @BotFather to enable real Telegram delivery</span>}
        </div>
        <div className="tg-bar-right">
          <input
            className="tg-bar-input"
            type="password"
            placeholder="Paste bot token…"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          <button className="tg-bar-btn" onClick={saveToken} disabled={!tokenInput}>
            {tokenSaved ? '✓ Set' : 'Set Token'}
          </button>
        </div>
      </div>

      {/* ── agent filter strip ── */}
      <div className="strip">
        <button className={`chip ${!selectedBot ? 'chip-on' : ''}`} onClick={() => setSelectedBot(null)}>All agents</button>
        {bots.map(b => {
          const on = selectedBot === b.id;
          return (
            <button
              key={b.id}
              className={`chip ${on ? 'chip-on' : ''}`}
              style={on ? { borderColor: BOT_COLORS[b.id]?.text, color: BOT_COLORS[b.id]?.text } : {}}
              onClick={() => setSelectedBot(on ? null : b.id)}
            >
              <span>{BOT_EMOJIS[b.id]}</span>
              {b.name.split(' ')[0]}
              <span className="chip-dot" />
            </button>
          );
        })}
      </div>

      {/* ── mobile tabs ── */}
      <div className="tabs">
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>Activity</button>
        <button className={tab === 'team' ? 'on' : ''} onClick={() => setTab('team')}>Agents</button>
      </div>

      {/* ── main ── */}
      <main>
        {/* feed */}
        <section className={`col-feed ${tab === 'feed' ? 'show' : ''}`}>
          <div className="sec-head">
            <h2><span className="pulse" />Live Activity</h2>
            {selectedBot && <button className="clear" onClick={() => setSelectedBot(null)}>Clear ✕</button>}
          </div>
          <div className="feed" ref={feedRef}>
            {filteredActivities.map((a, i) => (
              <FeedBubble key={a.id} a={a} newest={i === 0} now={now} avatar={avatarMap[a.botId]} />
            ))}
            {filteredActivities.length === 0 && <p className="empty">No activity yet…</p>}
          </div>
        </section>

        {/* team */}
        <section className={`col-team ${tab === 'team' ? 'show' : ''}`}>
          <div className="sec-head"><h2>Agent Profiles</h2></div>
          <div className="cards">
            {bots.map(b => <BotCard key={b.id} bot={b} onSave={updateConfig} onTest={testBot} hasToken={!!tokenMasked} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── tiny components ── */
function Kpi({ value, label }) {
  return (
    <div className="kpi">
      <span className="kpi-v">{value}</span>
      <span className="kpi-l">{label}</span>
    </div>
  );
}

function FeedBubble({ a, newest, now, avatar }) {
  const c = BOT_COLORS[a.botId] || {};
  return (
    <div className={`bubble ${newest ? 'bubble-new' : ''}`} style={{ '--accent': c.text }}>
      <div className="bubble-av" style={{ background: c.bg, borderColor: c.border }}>
        {avatar
          ? <img className="bubble-av-img" src={avatar} alt={a.botName} />
          : BOT_EMOJIS[a.botId]
        }
      </div>
      <div className="bubble-body">
        <div className="bubble-head">
          <strong style={{ color: c.text }}>{a.botName}</strong>
          <span className="bubble-role">{a.role}</span>
          <span className="bubble-time">{timeAgo(a.timestamp)}</span>
        </div>
        <p>{a.content}</p>
        <div className="bubble-tags">
          <span className={`btag ${a.category}`}>{a.category}</span>
          <span className="btag tg">
            <TelegramIcon />telegram
          </span>
        </div>
      </div>
    </div>
  );
}

function TelegramIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4, flexShrink: 0 }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.07-.2c-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.45 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .37z"/>
    </svg>
  );
}

function BotCard({ bot, onSave, onTest, hasToken }) {
  const [tid, setTid] = useState(bot.config?.telegramId || '');
  const [dp, setDp] = useState(bot.config?.dpUrl || '');
  const [saved, setSaved] = useState(false);
  const c = BOT_COLORS[bot.id] || {};

  useEffect(() => {
    setTid(bot.config?.telegramId || '');
    setDp(bot.config?.dpUrl || '');
  }, [bot.config]);

  const save = () => {
    onSave(bot.id, { telegramId: tid, dpUrl: dp });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const src = dp || bot.config?.dpUrl || bot.avatar;
  const hasChat = !!(bot.config?.telegramId);

  return (
    <div className="card" style={{ borderColor: c.border, boxShadow: c.glow }}>
      <div className="card-top" style={{ background: `linear-gradient(135deg, ${c.bg} 0%, transparent 60%)` }}>
        <div className="card-av-wrap">
          <img className="card-av" src={src} alt={bot.name} />
          <span className="card-ring" />
        </div>
        <div>
          <h3><span className="card-emoji">{BOT_EMOJIS[bot.id]}</span>{bot.name}</h3>
          <span className="card-role" style={{ color: c.text }}>{bot.role}</span>
          <span className="card-show">{bot.show}</span>
        </div>
      </div>
      <p className="card-q">"{bot.personality}"</p>

      {/* delivery status */}
      <div className="card-delivery">
        {hasToken && hasChat
          ? <span className="delivery-on">✅ Sending to Telegram</span>
          : <span className="delivery-off">⏸ Not delivering — {!hasToken ? 'set Bot Token above' : 'add Chat ID below'}</span>
        }
      </div>

      <div className="card-form">
        <label>
          <span>Telegram Chat ID <em>(messages will be sent here)</em></span>
          <input placeholder="e.g. 123456789 or @channel" value={tid} onChange={e => setTid(e.target.value)} />
        </label>
        <label>
          <span>Display Picture URL</span>
          <input placeholder="https://…" value={dp} onChange={e => setDp(e.target.value)} />
        </label>
        <div className="card-btns">
          <button onClick={save} style={{ background: c.text, flex: 1 }}>
            {saved ? '✓ Saved' : 'Save Config'}
          </button>
          {hasToken && hasChat && (
            <button className="test-btn" onClick={() => onTest(bot.id)}>
              Test 📨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
