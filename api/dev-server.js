import http from 'http';
import nodemailer from 'nodemailer';

// Automatically load local .env in Node 20+
try {
  process.loadEnvFile();
} catch (e) {}

const user = process.env.GMAIL_USER || 'sumukhasociety@gmail.com';
const pass = process.env.GMAIL_APP_PASS;

if (!pass) {
  console.warn('[Notice] GMAIL_APP_PASS not detected in .env file.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass }
});

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Method Not Allowed' }));
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const { to, subject, html } = payload;

      if (!to || !subject || !html) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ message: 'Missing to, subject, or html' }));
      }

      const recipients = Array.isArray(to) ? to.join(', ') : to;

      const info = await transporter.sendMail({
        from: `"Sumukha Co-Op Society" <${user}>`,
        to: recipients,
        subject,
        html
      });

      console.log(`[Email Dispatched] To: ${recipients} | ID: ${info.messageId}`);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, messageId: info.messageId }));
    } catch (err) {
      console.error('[Email Error]:', err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ message: err.message || 'Failed to send email' }));
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Local Dev Email Server listening on http://localhost:${PORT}/api/send-email`);
});
