module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, chatId, botName, role, botId, content, category } = req.body;

  if (!token) return res.status(400).json({ error: 'Set a Telegram Bot Token first' });
  if (!chatId) return res.status(400).json({ error: 'Set a Chat ID for this bot first' });

  const emoji = { monica: '👩‍💼', dwight: '🕵️', kelly: '💅', ross: '🔬', pam: '🎨', rachel: '💼' };
  const icon = emoji[botId] || '🤖';

  const isTest = category === 'test';
  const tag = isTest ? '🧪 Test' : category === 'coordination' ? '🤝 Coordination' : '📋 Update';
  const body = isTest
    ? `✅ Test message — Telegram delivery is working!`
    : content;

  const msg = `${icon} <b>${botName}</b>  ·  ${role}\n\n${body}\n\n<i>${tag}</i>`;

  const payload = JSON.stringify({
    chat_id: chatId,
    text: msg,
    parse_mode: 'HTML'
  });

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('Telegram API error:', data);
      return res.status(resp.status).json({ error: data.description || 'Telegram API error' });
    }

    return res.status(200).json({ success: true, message: 'Message sent' });
  } catch (err) {
    console.error('Telegram send error:', err.message);
    return res.status(500).json({ error: 'Failed to send to Telegram' });
  }
}
