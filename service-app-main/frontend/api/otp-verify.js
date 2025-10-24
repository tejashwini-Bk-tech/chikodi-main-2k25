// Vercel Serverless Function: Verify Twilio OTP
// Endpoint: /api/otp-verify

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!ACCOUNT_SID || !AUTH_TOKEN || !SERVICE_SID) {
    return res.status(500).json({ error: 'Twilio env vars not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { phone, code } = body;
    if (!phone || !code) return res.status(400).json({ error: 'phone and code are required' });

    const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');
    const form = new URLSearchParams({ To: phone, Code: code });

    const r = await fetch(`https://verify.twilio.com/v2/Services/${SERVICE_SID}/VerificationCheck`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });
    try {
      const data = JSON.parse(text);
      return res.status(200).json({ status: data.status, valid: data.status === 'approved' });
    } catch {
      return res.status(200).send(text);
    }
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'OTP verification failed' });
  }
}
