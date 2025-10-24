// Vercel Serverless Function: Send Email via Resend
// Endpoint: /api/send-email

export default async function handler(req, res) {
  // Basic CORS handling (same-origin requests usually don't need this, but it's safe)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { to, subject, html, from } = body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const fromAddress = from || 'no-reply@your-domain.com';

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress, to, subject, html })
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).json({ error: text });
    }
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch {
      return res.status(200).send(text);
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Email send failed' });
  }
}
