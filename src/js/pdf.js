/**
 * Sumukha Co-Op Society - PDF Statement Generation Engine (User Requirement 2)
 * Generates print-ready formal PDF statements for any selected month or individual member.
 */

import { formatCurrency, calculateTotals, calculateLoanAnalytics, getMemberCommitment } from './calculations.js';

export function exportMonthlyStatementPDF(targetMonth, data) {
  const totals = calculateTotals(data);
  const members = data.members || [];
  const contribs = (data.contribs || []).filter(c => c.month === targetMonth);
  const loans = data.loans || [];

  let monthLabel = targetMonth;
  try {
    monthLabel = new Date(targetMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch (e) {}

  const collectedThisMonth = contribs.reduce((sum, c) => sum + Number(c.amt || 0), 0);

  // Generate HTML for print/PDF
  const printableHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sumukha Society - ${monthLabel} Statement</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 13px; line-height: 1.4; }
        .statement-header { border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
        .brand-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
        .brand-sub { font-size: 13px; color: #555; margin-top: 2px; }
        .meta-box { text-align: right; font-size: 12px; color: #444; }
        .meta-box strong { font-size: 14px; color: #111; }
        .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
        .kpi-box { flex: 1; border: 1px solid #ddd; border-top: 3px solid #1e3a8a; border-radius: 6px; padding: 10px 14px; background: #fafafa; }
        .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; }
        .kpi-val { font-size: 18px; font-weight: 750; color: #111; margin-top: 2px; }
        h3 { font-size: 15px; margin: 18px 0 8px; color: #0f172a; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th, td { padding: 7px 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; color: #333; }
        .text-right { text-align: right; }
        .status-paid { color: #2563eb; font-weight: 600; }
        .status-due { color: #d9383a; font-weight: 600; }
        .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 15px; }
        .sig-box { width: 180px; text-align: center; border-top: 1px dashed #666; padding-top: 6px; font-size: 12px; color: #444; }
        @media print {
          body { padding: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="statement-header">
        <div>
          <h1 class="brand-title">SUMUKHA CO-OPERATIVE SOCIETY</h1>
          <div class="brand-sub">Monthly Financial Statement & Contribution Audit</div>
          <div class="brand-sub" style="font-size: 11px;">13 Members · Micro-Financing, Mutual Aid & Investments</div>
        </div>
        <div class="meta-box">
          <div>Statement Period:</div>
          <strong>${monthLabel}</strong>
          <div style="margin-top: 4px;">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-lbl">Month Collections</div>
          <div class="kpi-val">${formatCurrency(collectedThisMonth)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-lbl">Society Cash in Hand</div>
          <div class="kpi-val">${formatCurrency(totals.cashInHand)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-lbl">Active Loans Outstanding</div>
          <div class="kpi-val">${formatCurrency(totals.totalOutstandingLoans)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-lbl">Total Net Profit</div>
          <div class="kpi-val">${formatCurrency(totals.totalNetProfit)}</div>
        </div>
      </div>

      <h3>1. Member Contributions Audit (${monthLabel})</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Member Name</th>
            <th class="text-right">Monthly Commitment</th>
            <th class="text-right">Amount Paid</th>
            <th>Payment Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((m, idx) => {
            const match = contribs.find(c => c.m === m.id);
            const commitment = getMemberCommitment(m, data.monthly);
            const paid = match ? Number(match.amt) : 0;
            const isCleared = paid >= commitment;
            return `
              <tr>
                <td>${m.id}</td>
                <td><strong>${m.name}</strong></td>
                <td class="text-right">${formatCurrency(commitment)}</td>
                <td class="text-right">${formatCurrency(paid)}</td>
                <td>${match ? match.date : '—'}</td>
                <td>${isCleared ? '<span class="status-paid">PAID ✓</span>' : (paid > 0 ? `<span class="status-due">PARTIAL (${formatCurrency(paid)})</span>` : '<span class="status-due">DUE</span>')}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background: #f9f9f9; font-weight: bold;">
            <td colspan="2">TOTAL</td>
            <td class="text-right">${formatCurrency(members.reduce((s, m) => s + getMemberCommitment(m, data.monthly), 0))}</td>
            <td class="text-right">${formatCurrency(collectedThisMonth)}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <h3>2. Active Loans & Month Installments</h3>
      <table>
        <thead>
          <tr>
            <th>Borrower</th>
            <th class="text-right">Principal</th>
            <th>Issue Date</th>
            <th class="text-right">Monthly EMI</th>
            <th class="text-right">Balance Due</th>
            <th>Tenure Status</th>
          </tr>
        </thead>
        <tbody>
          ${loans.map(loan => {
            const borrower = members.find(m => m.id === loan.m);
            const analytics = calculateLoanAnalytics(loan);
            return `
              <tr>
                <td><strong>${borrower ? borrower.name : 'Member #' + loan.m}</strong></td>
                <td class="text-right">${formatCurrency(analytics.principalBorrowed)}</td>
                <td>${analytics.issueDate}</td>
                <td class="text-right">${formatCurrency(analytics.currentMonthlyPaying)}</td>
                <td class="text-right">${formatCurrency(analytics.outstandingPrincipal)}</td>
                <td>${analytics.monthsPaid} / ${analytics.tenure} Months Paid</td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="6" style="text-align:center; color:#777;">No active loans</td></tr>'}
        </tbody>
      </table>

      <div class="footer-signatures">
        <div class="sig-box">
          <div>Authorized Admin / President</div>
        </div>
        <div class="sig-box">
          <div>Treasurer / Secretary</div>
        </div>
        <div class="sig-box">
          <div>Society Seal</div>
        </div>
      </div>

      <div class="no-print" style="margin-top: 25px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 24px; font-size: 15px; font-weight: bold; background: #0f172a; color: #fff; border: 1px solid #d97706; border-radius: 6px; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>
      <script>
        window.addEventListener('DOMContentLoaded', () => {
          // Auto trigger print dialogue for rapid download
          setTimeout(() => { window.print(); }, 400);
        });
      </script>
    </body>
    </html>
  `;

  openPrintWindow(printableHTML, `Sumukha_Statement_${targetMonth}`);
}

export function exportMemberStatementPDF(memberId, data) {
  const member = (data.members || []).find(m => m.id === Number(memberId));
  if (!member) return alert('Member not found');

  const totals = calculateTotals(data);
  const myContribs = (data.contribs || []).filter(c => c.m === member.id);
  const totalContributed = myContribs.reduce((s, c) => s + Number(c.amt || 0), 0);
  const mySharePct = totals.totalContributions > 0 ? (totalContributed / totals.totalContributions) * 100 : 0;
  const myProfitShare = (mySharePct / 100) * totals.totalNetProfit;

  const myLoans = (data.loans || []).filter(l => l.m === member.id);

  const printableHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Member Statement - ${member.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 13px; line-height: 1.4; }
        .statement-header { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .kpi-row { display: flex; gap: 10px; margin-bottom: 16px; }
        .kpi-box { flex: 1; border: 1px solid #ddd; border-top: 3px solid #1e3a8a; border-radius: 6px; padding: 8px 12px; background: #fafafa; }
        .kpi-lbl { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; }
        .kpi-val { font-size: 16px; font-weight: 750; color: #111; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
        th, td { padding: 6px 8px; border: 1px solid #ddd; }
        th { background: #f1f5f9; font-weight: 700; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="statement-header">
        <div>
          <h1 class="brand-title">SUMUKHA CO-OPERATIVE SOCIETY</h1>
          <div>Member Personal Account Statement</div>
          <div style="font-size: 14px; font-weight: bold; margin-top: 4px;">${member.name} (Member #${member.id})</div>
          <div style="color: #666;">Email: ${member.email || 'N/A'} · Phone: ${member.phone || 'N/A'}</div>
        </div>
        <div style="text-align: right;">
          <div>Generated On:</div>
          <strong>${new Date().toLocaleDateString('en-IN')}</strong>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-box">
          <div class="kpi-lbl">Total Contributed</div>
          <div class="kpi-val">${formatCurrency(totalContributed)}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-lbl">Society Equity Share</div>
          <div class="kpi-val">${mySharePct.toFixed(1)}%</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-lbl">Est. Profit / Dividend</div>
          <div class="kpi-val" style="color: #2563eb;">${formatCurrency(myProfitShare)}</div>
        </div>
      </div>

      <h3>Contribution History</h3>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Payment Date</th>
            <th class="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${myContribs.map(c => `
            <tr>
              <td><strong>${c.month}</strong></td>
              <td>${c.date}</td>
              <td class="text-right">${formatCurrency(c.amt)}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No contributions recorded</td></tr>'}
        </tbody>
      </table>

      ${myLoans.length > 0 ? `
        <h3>Active Loan Records & Repayment Status</h3>
        ${myLoans.map(loan => {
          const a = calculateLoanAnalytics(loan);
          return `
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin-bottom: 12px; background: #fafafa;">
              <div style="font-weight: bold; font-size: 14px;">Loan Sanctioned: ${formatCurrency(a.principalBorrowed)} on ${a.issueDate}</div>
              <div style="color: #555; margin: 4px 0 8px;">Tenure: ${a.tenure} Months · Interest Rate: ${a.interestRatePct}%/mo · Monthly Principal: ${a.monthlyPrincipalPct}%</div>
              <div style="display: flex; gap: 14px; font-size: 12px;">
                <div><strong>Amount Paid:</strong> ${formatCurrency(a.totalPaid)}</div>
                <div><strong>Months Paid:</strong> ${a.monthsPaid} / ${a.tenure}</div>
                <div><strong>Months Remaining:</strong> ${a.monthsRemaining}</div>
                <div><strong>Outstanding Balance:</strong> ${formatCurrency(a.outstandingPrincipal)}</div>
              </div>
            </div>
          `;
        }).join('')}
      ` : ''}

      <div style="text-align: center; margin-top: 25px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: #fff; border: 1px solid #d97706; border-radius: 6px; cursor: pointer;">
          🖨️ Print / Save PDF
        </button>
      </div>
      <script>
        window.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.print(); }, 400); });
      </script>
    </body>
    </html>
  `;

  openPrintWindow(printableHTML, `Member_Statement_${member.name}`);
}

function openPrintWindow(htmlContent, title) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to open the PDF print dialog.');
    return;
  }
  win.document.open();
  win.document.write(htmlContent);
  win.document.close();
}
