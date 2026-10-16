import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ message: 'Missing to, subject, or html in request body' });
  }

  const user = process.env.GMAIL_USER || 'sumukhasociety@gmail.com';
  const pass = process.env.GMAIL_APP_PASS || 'iixquxmsvjaqjcgx';

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const recipients = Array.isArray(to) ? to.join(', ') : to;

    const info = await transporter.sendMail({
      from: `"Sumukha Co-Op Society" <${user}>`,
      to: recipients,
      subject,
      html
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Vercel serverless email error:', error);
    return res.status(500).json({ message: error.message || 'Failed to dispatch email' });
  }
}
