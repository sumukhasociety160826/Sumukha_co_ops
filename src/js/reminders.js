/**
 * Sumukha Co-Op Society - 3-Stage Automated Email Reminder Engine (User Requirement 4)
 * Triggers 7 days before, 3 days before, and 1 day before the monthly due date.
 */

import { formatCurrency, getCurrentMonth, getMemberCommitment } from './calculations.js';

export function getUnpaidMembers(targetMonth, data) {
  const members = data.members || [];
  const contribs = data.contribs || [];

  return members.map(m => {
    const commitment = getMemberCommitment(m, data.monthly);
    const existing = contribs.find(c => c.m === m.id && c.month === targetMonth);
    const paidAmt = existing ? Number(existing.amt) : 0;
    const isPaid = paidAmt >= commitment;
    const remainingDue = Math.max(0, commitment - paidAmt);

    return {
      id: m.id,
      name: m.name,
      email: m.email || `${m.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: m.phone || 'N/A',
      commitment,
      paidAmt,
      isPaid,
      remainingDue
    };
  }).filter(m => !m.isPaid);
}

export function generateReminderEmailTemplate({ memberName, targetMonth, stage, amountDue, societyName = 'Sumukha Co-Operative Society' }) {
  let monthLabel = targetMonth;
  try {
    monthLabel = new Date(targetMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch (e) {}

  let subject = '';
  let urgencyNotice = '';

  switch (stage) {
    case '7_day':
      subject = `[Advance Notice] ${societyName} - ${monthLabel} Monthly Contribution Due in 7 Days`;
      urgencyNotice = `<p style="color: #2c3e50;">This is a friendly advance notice that the monthly contribution for <strong>${monthLabel}</strong> is scheduled in <strong>7 days</strong>.</p>`;
      break;
    case '3_day':
      subject = `[Reminder] ${societyName} - Pending Contribution for ${monthLabel} Due in 3 Days`;
      urgencyNotice = `<p style="color: #e67e22; font-weight: bold;">Our records show your contribution for <strong>${monthLabel}</strong> is pending and due in <strong>3 days</strong>.</p>`;
      break;
    case '1_day':
      subject = `[Urgent Action Required] ${societyName} - Final Notice: ${monthLabel} Contribution Due Tomorrow`;
      urgencyNotice = `<p style="color: #d9383a; font-weight: bold;">This is your final notice. Your contribution for <strong>${monthLabel}</strong> is due tomorrow. Please initiate payment today to avoid society delay flags.</p>`;
      break;
    default:
      subject = `${societyName} - Monthly Contribution Reminder`;
      urgencyNotice = `<p>Your monthly contribution for ${monthLabel} is pending.</p>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a202c; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e3a8a); color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.4);">
        <h2 style="margin: 0; font-size: 22px; color: #fbbf24;">${societyName}</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Official Monthly Contribution Notice</p>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Dear <strong>${memberName}</strong>,</p>
        
        ${urgencyNotice}

        <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
          <div style="font-size: 13px; color: #718096; text-transform: uppercase;">Amount Due:</div>
          <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${formatCurrency(amountDue)}</div>
          <div style="font-size: 12px; color: #4a5568; margin-top: 4px;">Period: <strong>${monthLabel}</strong></div>
        </div>


        <div style="text-align: center; margin-top: 24px;">
          <a href="#" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block; border: 1px solid #d97706;">
            Open Your Member Portal →
          </a>
        </div>
      </div>

      <div style="text-align: center; color: #a0aec0; font-size: 11px; margin-top: 20px;">
        Sumukha Co-Operative Society · Transparent Member Mutual Aid & Micro-Financing
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateReminderPlainText({ memberName, targetMonth, stage, amountDue, societyName = 'Sumukha Co-Operative Society' }) {
  let monthLabel = targetMonth;
  try {
    monthLabel = new Date(targetMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch (e) {}

  let stageLabel = 'Notice';
  if (stage === '7_day') stageLabel = '7-Day Advance Notice';
  if (stage === '3_day') stageLabel = 'Pending Contribution Reminder';
  if (stage === '1_day') stageLabel = 'Urgent Notice: Due Tomorrow';

  return `Dear ${memberName},

This is an official ${stageLabel} from ${societyName}.

Our records show that your monthly contribution for ${monthLabel} is pending:
• Amount Due: ₹${Number(amountDue).toLocaleString('en-IN')}
• Period: ${monthLabel}

Please initiate the payment at your earliest convenience to keep your account current.

Warm regards,
Administration
${societyName}`;
}

export const DEFAULT_RESEND_API_KEY = import.meta.env?.VITE_RESEND_API_KEY || '';

export function getEmailServiceConfig() {
  try {
    const raw = localStorage.getItem('sumukha_email_service_cfg');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.apiKey || !parsed.apiKey.trim()) {
        parsed.apiKey = DEFAULT_RESEND_API_KEY;
      }
      return parsed;
    }
  } catch (e) {}
  return {
    provider: 'resend',
    apiKey: DEFAULT_RESEND_API_KEY,
    senderEmail: 'onboarding@resend.dev',
    senderName: 'Sumukha Co-Op Society'
  };
}

export function saveEmailServiceConfig(config) {
  localStorage.setItem('sumukha_email_service_cfg', JSON.stringify(config));
  return config;
}

export async function sendRealEmail({ to, subject, html, apiKey }) {
  // Primary: Official Society Gmail SMTP via /api/send-email (runs in Vite dev & Vercel serverless)
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Notice: /api/send-email not reachable, falling back to Resend API:', err);
  }

  // Fallback: Resend API
  const key = (apiKey && apiKey.trim()) || DEFAULT_RESEND_API_KEY;
  if (!key) {
    throw new Error('Email dispatch failed: No active email service configured.');
  }

  const endpoint = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? '/api/resend/emails'
    : 'https://api.resend.com/emails';

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        from: 'Sumukha Society <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });
  } catch (netErr) {
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          from: 'Sumukha Society <onboarding@resend.dev>',
          to: Array.isArray(to) ? to : [to],
          subject,
          html
        })
      });
    } catch (e) {
      throw new Error(`Network error while communicating with email provider: ${netErr.message}`);
    }
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = { message: `Server returned status ${response.status}` };
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Failed to dispatch email (Status: ${response.status})`;
    const err = new Error(errorMsg);
    err.statusCode = response.status;
    err.resendData = data;
    throw err;
  }

  return data;
}

export function openNativeMailClient(email, subject, body) {
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

export function openWhatsAppReminder(phone, message) {
  const digitsOnly = String(phone || '').replace(/[^0-9]/g, '');
  const formattedPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}
