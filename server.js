const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Ensure fetch is available across Node versions
const doFetch = global.fetch
  ? global.fetch
  : (url, opts) => import('node-fetch').then(({ default: f }) => f(url, opts));

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Proxy to OpenRouter (Qwen)
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { model, prompt, design } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    const systemPrompt = `You are an expert space habitat engineer AI assistant embedded in a 2D base design tool. Given a JSON design (modules, corridors, environment, crew, duration), provide:
1) Key risks and violations (concise bullets)
2) Concrete fixes (prioritized actions)
3) Sizing verdicts per module type (Too small / OK / Oversized with brief reason)
4) Resource sufficiency (food, water, O2, exercise, radiation) and what to add or resize.
Be practical, specific, and brief. Output simple markdown with short bullets.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${prompt || 'Analyze this space base design and advise improvements.'}\n\nDesign JSON:\n\n${JSON.stringify(design, null, 2)}` }
    ];

    const response = await doFetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'qwen/qwen3-235b-a22b:free',
        messages,
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return res.json({ content });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'AI analysis failed' });
  }
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`AI proxy listening on http://localhost:${PORT}`));


