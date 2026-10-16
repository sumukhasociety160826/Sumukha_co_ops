/**
 * Sumukha Co-Op Society - Main Application Controller
 * Role-Based Access Control, Tab Routing & Interactive UI Engine
 */

import { state } from './state.js';
import {
  formatCurrency,
  getTodayDate,
  getCurrentMonth,
  getMemberCommitment,
  calculateTotals,
  calculateLoanAnalytics,
  calculateContributionsMatrix,
  calculateInvestmentsSummary
} from './calculations.js';
import { exportMonthlyStatementPDF, exportMemberStatementPDF } from './pdf.js';
import {
  getUnpaidMembers,
  generateReminderEmailTemplate,
  generateReminderPlainText,
  getEmailServiceConfig,
  saveEmailServiceConfig,
  sendRealEmail,
  openNativeMailClient,
  openWhatsAppReminder
} from './reminders.js';
import { getCloudConfig, saveCloudConfig } from './config.js';

let activeTab = 'Members';
let openLoanSchedules = {};

// Cache DOM Elements
const $ = (id) => document.getElementById(id);

export function initApp() {
  // Theme initialization
  const savedTheme = localStorage.getItem('sumukha_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Subscribe to state updates
  state.subscribe(() => {
    render();
  });

  // Initial render
  render();
}

function render() {
  updateRoleEnforcement();
  renderHeader();
  renderNavigation();
  renderActiveTab();
}

function updateRoleEnforcement() {
  const isAdmin = state.isAdmin();
  document.body.classList.toggle('role-admin', isAdmin);
  document.body.classList.toggle('role-member', !isAdmin);
}

function renderHeader() {
  const isAdmin = state.isAdmin();
  const currentMember = state.getCurrentMember();
  const activeAdmin = state.getActiveAdmin();

  const userBadge = $('user-badge');
  if (userBadge) {
    if (isAdmin) {
      userBadge.className = 'user-badge';
      userBadge.innerHTML = `<span>👑 ${escapeHTML(activeAdmin ? activeAdmin.name : 'Administrator')}</span>`;
    } else {
      userBadge.className = 'user-badge role-member';
      userBadge.innerHTML = `<span>👤 ${escapeHTML(currentMember ? currentMember.name : 'Society Member')}</span>`;
    }
    userBadge.style.cursor = 'pointer';
    userBadge.title = 'Switch account or portal view';
    userBadge.onclick = openLoginModal;
  }

  // Admin Quick Tools in Header
  let adminTools = $('header-admin-tools');
  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    if (!adminTools) {
      adminTools = document.createElement('div');
      adminTools.id = 'header-admin-tools';
      adminTools.style.display = 'inline-flex';
      adminTools.style.alignItems = 'center';
      adminTools.style.gap = '6px';
      headerActions.insertBefore(adminTools, $('user-badge'));
    }

    if (isAdmin) {
      adminTools.innerHTML = `
        <button class="btn-sm btn-gold" id="btn-change-pass" title="Change Admin Password">🔑 Password</button>
        <button class="btn-sm btn-gold" id="btn-export-backup" title="Download Society Backup JSON">💾 Backup</button>
        <button class="btn-sm btn-danger" id="btn-admin-logout" title="Exit Administrator Mode">🚪 Sign Out</button>
      `;
      $('btn-change-pass')?.addEventListener('click', openChangePasswordModal);
      $('btn-export-backup')?.addEventListener('click', exportBackupJSON);
      $('btn-admin-logout')?.addEventListener('click', () => {
        state.setRole('member', 1);
        activeTab = 'Members';
        render();
        alert('Signed out of Administrator session. Returned to Member Directory.');
      });
    } else {
      adminTools.innerHTML = `
        <button class="btn-sm btn-primary" id="btn-admin-signin" title="Administrator Sign In">🔐 Administrator Sign In</button>
      `;
      $('btn-admin-signin')?.addEventListener('click', () => openLoginModal('admin'));
    }
  }
}

function renderNavigation() {
  const nav = $('tab-nav');
  if (!nav) return;

  const tabs = [
    { id: 'Dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'Members', icon: '👥', label: 'Members' },
    { id: 'Contributions', icon: '💰', label: 'Contributions' },
    { id: 'Loans', icon: '📜', label: 'Loans & EMI' },
    { id: 'Investments', icon: '📈', label: 'Investments' },
    { id: 'Reminders', icon: '🔔', label: 'Reminders' }
  ];

  nav.innerHTML = tabs.map(tab => `
    <button class="tab-btn ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">
      <span>${tab.icon}</span> ${tab.label}
    </button>
  `).join('');

  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      render();
    });
  });
}

function renderActiveTab() {
  const container = $('main-content');
  if (!container) return;

  switch (activeTab) {
    case 'Dashboard':
      container.innerHTML = renderDashboardView();
      break;
    case 'Members':
      container.innerHTML = renderMembersView();
      break;
    case 'Contributions':
      container.innerHTML = renderContributionsView();
      break;
    case 'Loans':
      container.innerHTML = renderLoansView();
      break;
    case 'Investments':
      container.innerHTML = renderInvestmentsView();
      break;
    case 'Reminders':
      container.innerHTML = renderRemindersView();
      break;
  }

  attachViewListeners();
}

/* ==========================================================================
   VIEW BUILDERS
   ========================================================================== */

function renderDashboardView() {
  const t = calculateTotals(state.data);
  const currentMember = state.getCurrentMember();
  const isAdmin = state.isAdmin();

  // Highlight card for logged-in member
  let memberHighlightHTML = '';
  if (!isAdmin && currentMember) {
    const myContribs = (state.data.contribs || []).filter(c => c.m === currentMember.id);
    const myTotal = myContribs.reduce((s, c) => s + Number(c.amt || 0), 0);
    const myShare = t.totalContributions > 0 ? (myTotal / t.totalContributions) * 100 : 0;
    const myProfit = (myShare / 100) * t.totalNetProfit;
    const myLoan = (state.data.loans || []).find(l => l.m === currentMember.id && !l.closed);
    const myLoanAnalytics = myLoan ? calculateLoanAnalytics(myLoan) : null;

    memberHighlightHTML = `
      <div class="panel" style="border-left: 5px solid var(--primary); background: var(--surface-subtle); margin-bottom: 20px;">
        <div class="panel-header">
          <div class="panel-title">
            <span>👋 Welcome, ${escapeHTML(currentMember.name)}</span>
            <span class="badge badge-ok">Member #${currentMember.id}</span>
          </div>
          <button class="btn-sm btn-primary" onclick="window.exportMemberStatementPDF(${currentMember.id})">
            📄 Download My Account Statement
          </button>
        </div>
        <div class="kpi-grid" style="margin-bottom: 0;">
          <div class="kpi-card">
            <div class="label">My Total Contributed</div>
            <div class="value">${formatCurrency(myTotal)}</div>
            <div class="helper">Monthly commitment: ${formatCurrency(getMemberCommitment(currentMember, state.data.monthly))}</div>
          </div>
          <div class="kpi-card gold">
            <div class="label">My Society Share</div>
            <div class="value">${myShare.toFixed(1)}%</div>
            <div class="helper">Pro-rata equity</div>
          </div>
          <div class="kpi-card info">
            <div class="label">My Est. Profit Share</div>
            <div class="value ok">${formatCurrency(myProfit)}</div>
            <div class="helper">Accrued interest + gains</div>
          </div>
          <div class="kpi-card ${myLoanAnalytics && myLoanAnalytics.outstandingPrincipal > 0 ? 'danger' : ''}">
            <div class="label">My Loan Balance</div>
            <div class="value ${myLoanAnalytics && myLoanAnalytics.outstandingPrincipal > 0 ? 'bad' : 'ok'}">
              ${myLoanAnalytics ? formatCurrency(myLoanAnalytics.outstandingPrincipal) : '₹0'}
            </div>
            <div class="helper">${myLoanAnalytics ? `${myLoanAnalytics.monthsRemaining} installments left` : 'No active loans'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Member Summary Table
  const memberRows = state.data.members.map(m => {
    const totalContributed = (state.data.contribs || [])
      .filter(c => c.m === m.id)
      .reduce((sum, c) => sum + Number(c.amt || 0), 0);

    const activeLoans = (state.data.loans || []).filter(l => l.m === m.id && !l.closed);
    const loanDue = activeLoans.reduce((sum, l) => sum + calculateLoanAnalytics(l).outstandingPrincipal, 0);

    const sharePct = t.totalContributions > 0 ? (totalContributed / t.totalContributions) * 100 : 0;
    const estProfit = (sharePct / 100) * t.totalNetProfit;

    const isCurrent = currentMember && currentMember.id === m.id;

    return `
      <tr style="${isCurrent ? 'background: var(--primary-light); font-weight: 600;' : ''}">
        <td><strong>${escapeHTML(m.name)}</strong> ${m.is_admin ? '<span class="badge badge-info">Admin</span>' : ''}</td>
        <td class="t-right">${formatCurrency(totalContributed)}</td>
        <td class="t-right">${sharePct.toFixed(1)}%</td>
        <td class="t-right ${loanDue > 0 ? 'bad' : ''}">${formatCurrency(loanDue)}</td>
        <td class="t-right ok">${formatCurrency(estProfit)}</td>
        <td style="width: 110px;">
          <div class="bar-container">
            <div class="bar-fill" style="width: ${Math.min(100, sharePct * 2.8)}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    ${memberHighlightHTML}

    <!-- 6 Master KPI Cards (Matching public-view) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Total Contributions</div>
        <div class="value">${formatCurrency(t.totalContributions)}</div>
        <div class="helper">Across 13 members</div>
      </div>
      <div class="kpi-card ${t.cashInHand < 0 ? 'danger' : ''}">
        <div class="label">Cash in Hand</div>
        <div class="value ${t.cashInHand < 0 ? 'bad' : 'ok'}">${formatCurrency(t.cashInHand)}</div>
        <div class="helper">Net liquid capital</div>
      </div>
      <div class="kpi-card gold">
        <div class="label">Loans Outstanding</div>
        <div class="value">${formatCurrency(t.totalOutstandingLoans)}</div>
        <div class="helper">Active principal balance</div>
      </div>
      <div class="kpi-card info">
        <div class="label">Invested (Cost)</div>
        <div class="value">${formatCurrency(t.totalInvestedCost)}</div>
        <div class="helper">FD, gold, stocks</div>
      </div>
      <div class="kpi-card">
        <div class="label">Investment Value</div>
        <div class="value">${formatCurrency(t.totalInvestmentValue)}</div>
        <div class="helper">Current market appraisal</div>
      </div>
      <div class="kpi-card">
        <div class="label">Net Profit (Interest + Gains)</div>
        <div class="value ok">${formatCurrency(t.totalNetProfit)}</div>
        <div class="helper">Available for dividend</div>
      </div>
    </div>

    <!-- Member Summary Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">👥 Member Summary & Share Distribution</div>
        <div class="panel-actions">
          <button class="btn-sm btn-primary" onclick="window.exportCurrentMonthPDF()">
            📄 Export Current Month Statement (PDF)
          </button>
        </div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th class="t-right">Contributed</th>
              <th class="t-right">Share %</th>
              <th class="t-right">Loan Due</th>
              <th class="t-right">Est. Profit Share</th>
              <th>Equity Ratio</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows}
          </tbody>
        </table>
      </div>
      <p style="font-size: 12px; color: var(--text-dim); margin-top: 10px;">
        💡 Interest is simple, per full 30-day month on principal. Profit share is pro-rata to individual member contributions.
      </p>
    </div>
  `;
}

function renderMembersView() {
  const isAdmin = state.isAdmin();
  const members = state.data.members || [];

  return `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">👥 Member Directory & Account Profiles</div>
        ${isAdmin ? `
          <div class="panel-actions">
            <button class="btn-sm btn-primary" id="btn-add-member">➕ Add Member</button>
          </div>
        ` : ''}
      </div>

      <div class="form-grid admin-only" style="margin-bottom: 20px;">
        <div class="form-group">
          <label>Default Society Monthly Contribution (₹)</label>
          <input type="number" id="input-default-monthly" value="${state.data.monthly}" ${!isAdmin ? 'disabled' : ''}>
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Member Name</th>
              <th>Email Address</th>
              <th>Contact Phone</th>
              <th class="t-right">Monthly Commitment (₹)</th>
              <th>Role</th>
              ${isAdmin ? '<th style="text-align: center;">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td>${m.id}</td>
                <td>
                  <strong>${escapeHTML(m.name)}</strong>
                </td>
                <td>${escapeHTML(m.email || '—')}</td>
                <td>${escapeHTML(m.phone || '—')}</td>
                <td class="t-right">
                  <strong>${formatCurrency(getMemberCommitment(m, state.data.monthly))}</strong>
                </td>
                <td>
                  <span class="badge ${m.is_admin ? 'badge-ok' : 'badge-neutral'}">
                    ${m.is_admin ? '👑 Administrator' : '👤 Member'}
                  </span>
                </td>
                ${isAdmin ? `
                  <td style="text-align: center;">
                    <button class="btn-sm btn-gold btn-edit-member" data-id="${m.id}" title="Edit profile and contact details">
                      ✏️ Edit Profile
                    </button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderContributionsView() {
  const isAdmin = state.isAdmin();
  const matrix = calculateContributionsMatrix(state.data);
  const curMonth = getCurrentMonth();
  const contribs = (state.data.contribs || []).slice().reverse();

  return `
    <!-- Admin Record Form (Requirement 1: Admin only) -->
    <div class="panel admin-only">
      <div class="panel-header">
        <div class="panel-title">💳 Record Monthly Contribution</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Select Member</label>
          <select id="select-contrib-member">
            ${state.data.members.map(m => `<option value="${m.id}">${escapeHTML(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Month</label>
          <input type="month" id="input-contrib-month" value="${curMonth}">
        </div>
        <div class="form-group">
          <label>Amount (₹)</label>
          <input type="number" id="input-contrib-amt" value="${getMemberCommitment(state.data.members[0], state.data.monthly)}">
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button class="btn-primary" id="btn-add-contrib" style="width: 100%;">Record Entry</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-sm btn-gold" id="btn-batch-month">
          ⚡ 1-Click: Add This Month for All (Skips Paid)
        </button>
        <button class="btn-sm" id="btn-undo-contrib">↩ Undo Last Entry</button>
      </div>
    </div>

    <!-- PDF Statement Generator (Requirement 2) -->
    <div class="panel" style="background: var(--surface-subtle);">
      <div class="panel-header">
        <div class="panel-title">📄 Export Monthly Statement in PDF Form</div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <label style="font-weight: 600;">Select Month to Export:</label>
        <select id="select-export-month" style="font-weight: 600;">
          ${matrix.months.slice().reverse().map(mo => `
            <option value="${mo}" ${mo === curMonth ? 'selected' : ''}>${mo}</option>
          `).join('')}
        </select>
        <button class="btn-primary" id="btn-generate-pdf">
          🖨️ Export [Selected Month] PDF Statement
        </button>
      </div>
    </div>

    <!-- Member-wise Matrix (Matching public-view cwise) -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">📊 Member-Wise Contributions Matrix</div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              ${matrix.months.map(mo => {
                let lbl = mo;
                try {
                  lbl = new Date(mo + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' });
                } catch (e) {}
                return `<th class="t-right">${lbl}</th>`;
              }).join('')}
              <th class="t-right">Total</th>
              <th class="t-right">Pending Dues</th>
            </tr>
          </thead>
          <tbody>
            ${matrix.memberRows.map(row => `
              <tr>
                <td><strong>${escapeHTML(row.member.name)}</strong></td>
                ${row.monthCells.map(cell => {
                  let cellContent = '–';
                  let cls = '';
                  if (cell.paid > 0) {
                    cellContent = formatCurrency(cell.paid);
                    if (cell.isShortfall) cls = 'bad';
                  } else if (cell.isDue) {
                    cellContent = 'Due';
                    cls = 'bad';
                  }
                  return `<td class="t-right ${cls}">${cellContent}</td>`;
                }).join('')}
                <td class="t-right"><strong>${formatCurrency(row.totalContributed)}</strong></td>
                <td class="t-right ${row.pendingBalance > 0 ? 'bad' : 'ok'}">
                  ${row.pendingBalance > 0 ? formatCurrency(row.pendingBalance) : '✓ Cleared'}
                </td>
              </tr>
            `).join('')}
            <tr style="background: var(--surface-subtle); font-weight: bold;">
              <td>TOTAL</td>
              ${matrix.months.map(mo => `<td class="t-right">${formatCurrency(matrix.monthTotals[mo])}</td>`).join('')}
              <td class="t-right">${formatCurrency(matrix.grandTotal)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Chronological Entries Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">🕒 All Recorded Entries</div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Month</th>
              <th class="t-right">Amount</th>
              ${isAdmin ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${contribs.map(c => {
              const m = state.data.members.find(x => x.id === c.m);
              return `
                <tr>
                  <td>${c.date}</td>
                  <td><strong>${escapeHTML(m ? m.name : 'Member #' + c.m)}</strong></td>
                  <td>${c.month}</td>
                  <td class="t-right">${formatCurrency(c.amt)}</td>
                  ${isAdmin ? `<td><button class="btn-sm btn-danger btn-del-contrib" data-id="${c.id}">Remove</button></td>` : ''}
                </tr>
              `;
            }).join('') || '<tr><td colspan="5" style="text-align:center;">No entries yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderLoansView() {
  const isAdmin = state.isAdmin();
  const totals = calculateTotals(state.data);
  const loans = (state.data.loans || []).slice().reverse();

  return `
    <!-- Issue Loan Form (Admin only) -->
    <div class="panel admin-only">
      <div class="panel-header">
        <div class="panel-title">📝 Issue Society Loan</div>
        <span class="badge badge-info">Available Cash: ${formatCurrency(totals.cashInHand)}</span>
      </div>
      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 12px;">
        Fixed principal amortization + interest on outstanding principal. Foreclosure permitted after 2 months.
      </p>
      <div class="form-grid">
        <div class="form-group">
          <label>Borrower Member</label>
          <select id="select-loan-member">
            ${state.data.members.map(m => `<option value="${m.id}">${escapeHTML(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Principal Amount (₹)</label>
          <input type="number" id="input-loan-amt" placeholder="e.g. 50000">
        </div>
        <div class="form-group">
          <label>Monthly Interest (%)</label>
          <input type="number" id="input-loan-rate" value="1.0" step="0.1">
        </div>
        <div class="form-group">
          <label>Monthly Principal (%)</label>
          <input type="number" id="input-loan-pct" value="5.0" step="0.5">
        </div>
        <div class="form-group">
          <label>Tenure (Months)</label>
          <input type="number" id="input-loan-tenure" value="20">
        </div>
        <div class="form-group">
          <label>Sanction Date</label>
          <input type="date" id="input-loan-date" value="${getTodayDate()}">
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button class="btn-primary" id="btn-issue-loan" style="width: 100%;">Sanction Loan</button>
        </div>
      </div>
    </div>

    <!-- Active Loan Cards with Comprehensive Details (Requirement 5) -->
    <div>
      ${loans.map(loan => {
        const borrower = state.data.members.find(m => m.id === loan.m);
        const a = calculateLoanAnalytics(loan);
        const isScheduleOpen = Boolean(openLoanSchedules[loan.id]);

        return `
          <div class="loan-card">
            <div class="loan-card-header">
              <div>
                <div class="loan-borrower">
                  ${escapeHTML(borrower ? borrower.name : 'Member #' + loan.m)} · ${formatCurrency(a.principalBorrowed)}
                </div>
                <div class="loan-meta-pill" style="margin-top: 4px;">
                  🗓️ Sanctioned: <strong>${a.issueDate}</strong> · ⏳ Tenure: <strong>${a.tenure} Months</strong> · 📈 ${a.interestRatePct}%/mo Interest
                </div>
              </div>
              <div>
                <span class="badge ${a.isClosed ? 'badge-ok' : (a.overdueAmount > 0 ? 'badge-bad' : 'badge-info')}">
                  ${a.isClosed ? 'Closed ✓' : (a.overdueAmount > 0 ? 'Overdue Due' : 'Active')}
                </span>
              </div>
            </div>

            <!-- Deep Loan Analytics Grid (Requirement 5) -->
            <div class="loan-metrics-grid">
              <div class="loan-metric-item">
                <div class="sub-k">Monthly Paying (EMI)</div>
                <div class="sub-v">${formatCurrency(a.currentMonthlyPaying)}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Total Amount Paid</div>
                <div class="sub-v ok">${formatCurrency(a.totalPaid)}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Principal Repaid</div>
                <div class="sub-v">${formatCurrency(a.totalPrincipalRepaid)}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Interest Paid</div>
                <div class="sub-v">${formatCurrency(a.interestPaid)}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Months Paid</div>
                <div class="sub-v">${a.monthsPaid} / ${a.tenure}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Months Remaining</div>
                <div class="sub-v">${a.monthsRemaining} Months</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Balance Outstanding</div>
                <div class="sub-v ${a.outstandingPrincipal > 0 ? 'bad' : 'ok'}">${formatCurrency(a.outstandingPrincipal)}</div>
              </div>
              <div class="loan-metric-item">
                <div class="sub-k">Next Due Date</div>
                <div class="sub-v">${a.nextInstallment ? a.nextInstallment.dueDate : '—'}</div>
              </div>
            </div>

            <!-- Admin Loan Operations -->
            ${!a.isClosed ? `
              <div class="loan-actions-bar admin-only">
                <input type="number" id="input-pay-${loan.id}" placeholder="Payment ₹" value="${a.nextInstallment ? Math.round(a.nextInstallment.remainingForInstallment) : ''}" style="width: 140px;">
                <button class="btn-primary btn-record-pay" data-id="${loan.id}">Record Repayment</button>
                <button class="btn-gold btn-foreclose" data-id="${loan.id}">
                  Foreclose (${formatCurrency(a.foreclosureAmount)})
                </button>
              </div>
              <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 6px;">
                🔒 Foreclosure eligible after: <strong>${a.foreclosureEligibleDate}</strong> (2-month lock-in policy).
              </div>
            ` : `
              <div class="badge badge-ok" style="margin-bottom: 8px;">✓ This loan is fully cleared and settled.</div>
            `}

            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="btn-sm btn-toggle-schedule" data-id="${loan.id}">
                ${isScheduleOpen ? '🔼 Hide Amortization Schedule' : '🔽 Show 20-Month Schedule'}
              </button>
              ${isAdmin ? `
                <button class="btn-sm btn-danger btn-del-loan" data-id="${loan.id}">Delete</button>
              ` : ''}
            </div>

            <!-- Month-by-month Schedule Table -->
            ${isScheduleOpen ? `
              <div class="table-responsive" style="margin-top: 14px;">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due Date</th>
                      <th class="t-right">Opening Principal</th>
                      <th class="t-right">Interest (1%)</th>
                      <th class="t-right">Principal (5%)</th>
                      <th class="t-right">Total Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${a.scheduleRows.map(r => `
                      <tr>
                        <td>${r.k}</td>
                        <td>${r.dueDate}</td>
                        <td class="t-right">${formatCurrency(r.openingPrincipal)}</td>
                        <td class="t-right">${formatCurrency(r.interest)}</td>
                        <td class="t-right">${formatCurrency(r.principal)}</td>
                        <td class="t-right"><strong>${formatCurrency(r.totalDue)}</strong></td>
                        <td>
                          <span class="badge ${r.isPaid ? 'badge-ok' : (r.isDueNow ? 'badge-bad' : 'badge-neutral')}">
                            ${r.isPaid ? 'Paid ✓' : (r.isDueNow ? 'Due' : 'Upcoming')}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>
        `;
      }).join('') || '<div class="panel">No active loans currently in the society.</div>'}
    </div>
  `;
}

function renderInvestmentsView() {
  const isAdmin = state.isAdmin();
  const totals = calculateTotals(state.data);
  const invSummary = calculateInvestmentsSummary(state.data);
  const invs = (state.data.invs || []).slice().reverse();

  return `
    <!-- Add Investment Form (Admin only) -->
    <div class="panel admin-only">
      <div class="panel-header">
        <div class="panel-title">📈 Add Society Investment</div>
        <span class="badge badge-info">Available Cash: ${formatCurrency(totals.cashInHand)}</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Investment Name</label>
          <input type="text" id="input-inv-name" placeholder="e.g. SBI Fixed Deposit">
        </div>
        <div class="form-group">
          <label>Asset Category</label>
          <select id="select-inv-type">
            <option>FD</option>
            <option>Mutual fund</option>
            <option>Stocks</option>
            <option>Gold</option>
            <option>Real estate</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cost Amount (₹)</label>
          <input type="number" id="input-inv-cost" placeholder="Amount">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="input-inv-date" value="${getTodayDate()}">
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button class="btn-primary" id="btn-add-inv" style="width: 100%;">Record Investment</button>
        </div>
      </div>
    </div>

    <!-- Active Portfolio Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">💼 Investment Portfolio & Appraisals</div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Date</th>
              <th class="t-right">Cost (₹)</th>
              <th class="t-right">Current Value (₹)</th>
              <th class="t-right">Gain / Loss</th>
              ${isAdmin ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${invs.map(inv => {
              const gain = Number(inv.value || 0) - Number(inv.cost || 0);
              return `
                <tr>
                  <td><strong>${escapeHTML(inv.name)}</strong></td>
                  <td><span class="badge badge-info">${escapeHTML(inv.type)}</span></td>
                  <td>${inv.date}</td>
                  <td class="t-right">${formatCurrency(inv.cost)}</td>
                  <td class="t-right">
                    ${isAdmin ? `
                      <input type="number" class="input-inv-val" data-id="${inv.id}" value="${inv.value}" style="width: 110px; text-align: right;">
                    ` : `
                      ${formatCurrency(inv.value)}
                    `}
                  </td>
                  <td class="t-right ${gain >= 0 ? 'ok' : 'bad'}"><strong>${formatCurrency(gain)}</strong></td>
                  ${isAdmin ? `
                    <td><button class="btn-sm btn-danger btn-del-inv" data-id="${inv.id}">✕</button></td>
                  ` : ''}
                </tr>
              `;
            }).join('') || '<tr><td colspan="7" style="text-align:center;">No investments recorded yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Month-Wise Investments Aggregation (Matching mwise) -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">📅 Month-Wise Investment Aggregation</div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th class="t-right">Entries</th>
              <th class="t-right">Invested (Cost)</th>
              <th class="t-right">Current Value</th>
              <th class="t-right">Gain</th>
              <th class="t-right">Cumulative Invested</th>
            </tr>
          </thead>
          <tbody>
            ${invSummary.rows.map(r => `
              <tr>
                <td><strong>${r.month}</strong></td>
                <td class="t-right">${r.count}</td>
                <td class="t-right">${formatCurrency(r.cost)}</td>
                <td class="t-right">${formatCurrency(r.value)}</td>
                <td class="t-right ${r.gain >= 0 ? 'ok' : 'bad'}">${formatCurrency(r.gain)}</td>
                <td class="t-right">${formatCurrency(r.cumulativeCost)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">No investments recorded</td></tr>'}
            <tr style="background: var(--surface-subtle); font-weight: bold;">
              <td>TOTAL</td>
              <td></td>
              <td class="t-right">${formatCurrency(invSummary.totalCost)}</td>
              <td class="t-right">${formatCurrency(invSummary.totalValue)}</td>
              <td class="t-right ${invSummary.totalGain >= 0 ? 'ok' : 'bad'}">${formatCurrency(invSummary.totalGain)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRemindersView() {
  const isAdmin = state.isAdmin();
  const curMonth = getCurrentMonth();
  const unpaidMembers = getUnpaidMembers(curMonth, state.data);
  const currentMember = state.getCurrentMember();

  // MEMBER VIEW (Read-only status, no dispatch capabilities)
  if (!isAdmin) {
    const myUnpaid = currentMember ? unpaidMembers.find(m => m.id === currentMember.id) : null;
    const isCleared = currentMember && !myUnpaid;

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🔔 Society Contribution Reminders & Status</div>
          <span class="badge ${isCleared ? 'badge-ok' : 'badge-bad'}">
            ${isCleared ? '✓ Your Account Cleared' : (myUnpaid ? `Pending: ${formatCurrency(myUnpaid.remainingDue)}` : 'Member View')}
          </span>
        </div>

        <!-- Administrator Controlled Notice -->
        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              <span>🛡️</span> Administrator Controlled Notification System
            </div>
            <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
              Automated email reminders, WhatsApp notices, and bulk payment dispatches are configured and sent exclusively by Society Administrators (<strong>Sagar</strong> & <strong>Naveen</strong>).
            </div>
          </div>
          <span class="badge" style="background: var(--surface-subtle); color: var(--text-dim); font-size: 11px;">
            Member Read-Only Mode
          </span>
        </div>

        <!-- Personal Monthly Contribution Status Card -->
        ${currentMember ? `
          <div class="kpi-card ${isCleared ? 'gold' : 'danger'}" style="margin-bottom: 22px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <div class="label" style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">Your Monthly Contribution Status (${curMonth})</div>
                <div class="value" style="font-size: 22px; margin-top: 4px;">
                  ${isCleared ? '✓ All Cleared' : `${formatCurrency(myUnpaid.remainingDue)} Due`}
                </div>
                <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">
                  Member: <strong>${escapeHTML(currentMember.name)}</strong> · Monthly Commitment: ${formatCurrency(getMemberCommitment(currentMember, state.data.monthly))}
                </div>
              </div>
              <div>
                <button class="btn-sm btn-gold" onclick="window.exportMemberStatementPDF(${currentMember.id})">
                  📄 Download My Passbook PDF
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- 3 Stage Society Notification Timeline (Read-Only) -->
        <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); margin-bottom: 10px;">
          📅 Society 3-Stage Reminder Schedule
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div class="kpi-card info">
            <div class="label">Stage 1: 7 Days Before Due Date</div>
            <div class="value" style="font-size: 16px; margin-top: 6px;">Advance Notice</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">Dispatched by Administrator to all pending members</div>
          </div>
          <div class="kpi-card gold">
            <div class="label">Stage 2: 3 Days Before Due Date</div>
            <div class="value" style="font-size: 16px; margin-top: 6px;">Gentle Reminder</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">Automated follow-up notice sent to outstanding balances</div>
          </div>
          <div class="kpi-card danger">
            <div class="label">Stage 3: 1 Day Before Due Date</div>
            <div class="value" style="font-size: 16px; margin-top: 6px;">Urgent Notice</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">Final priority reminder sent before monthly ledger close</div>
          </div>
        </div>

        <!-- Society Unpaid Summary (Read-Only: No checkboxes, No dispatch buttons) -->
        <div class="panel-header">
          <div class="panel-title">📋 Society Ledger Pending Contributions (${curMonth})</div>
          <span class="badge ${unpaidMembers.length > 0 ? 'badge-bad' : 'badge-ok'}">
            ${unpaidMembers.length} Members Pending
          </span>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Contact Phone</th>
                <th class="t-right">Monthly Due</th>
                <th class="t-right">Balance Pending</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${unpaidMembers.map(m => `
                <tr ${currentMember && m.id === currentMember.id ? 'style="background: rgba(212, 160, 23, 0.08); font-weight: 600;"' : ''}>
                  <td>
                    <strong>${escapeHTML(m.name)}</strong>
                    ${currentMember && m.id === currentMember.id ? ' <span class="badge badge-info" style="font-size: 10px; margin-left: 4px;">You</span>' : ''}
                  </td>
                  <td>${escapeHTML(m.phone || 'N/A')}</td>
                  <td class="t-right">${formatCurrency(m.commitment)}</td>
                  <td class="t-right bad"><strong>${formatCurrency(m.remainingDue)}</strong></td>
                  <td style="text-align: center;">
                    <span class="badge badge-bad" style="font-size: 11px;">Payment Pending</span>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align:center; color: var(--gold-main); font-weight: bold; padding: 24px;">🎉 All members have cleared their monthly contributions for this month!</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ADMIN VIEW (Full dispatch suite for Sagar & Naveen)
  return `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">🔔 Automated 3-Stage Email Reminders</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-sm btn-gold" id="btn-email-settings" title="Configure Resend API for automated email delivery">
            ⚙️ Email Provider Setup
          </button>
          <span class="badge ${unpaidMembers.length > 0 ? 'badge-bad' : 'badge-ok'}">
            ${unpaidMembers.length} Unpaid Members for ${curMonth}
          </span>
        </div>
      </div>
      <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">
        Automated 3-stage notification system: <strong>7 days before</strong> (advance notice), <strong>3 days before</strong> (gentle reminder), and <strong>1 day before</strong> (urgent notice). Admins can select unpaid members in bulk or individually dispatch reminders.
      </p>

      <!-- 3 Stage Quick Dispatch Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div class="kpi-card info">
          <div class="label">Stage 1: 7 Days Before</div>
          <div class="value">Advance</div>
          <button class="btn-sm btn-primary btn-trigger-remind" data-stage="7_day" style="margin-top: 10px; width: 100%;">
            Send 7-Day Notice (All)
          </button>
        </div>
        <div class="kpi-card gold">
          <div class="label">Stage 2: 3 Days Before</div>
          <div class="value">Reminder</div>
          <button class="btn-sm btn-gold btn-trigger-remind" data-stage="3_day" style="margin-top: 10px; width: 100%;">
            Send 3-Day Reminder (All)
          </button>
        </div>
        <div class="kpi-card danger">
          <div class="label">Stage 3: 1 Day Before</div>
          <div class="value">Urgent</div>
          <button class="btn-sm btn-danger btn-trigger-remind" data-stage="1_day" style="margin-top: 10px; width: 100%;">
            Send Final 1-Day Notice (All)
          </button>
        </div>
      </div>

      <!-- Bulk Reminder Actions Panel for Admin -->
      <div class="panel" style="background: var(--surface-subtle); border: 1px solid var(--border); margin-bottom: 20px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">
              📋 Bulk Reminder Dispatch Controls
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Select members below using checkboxes to send customized reminders in bulk.
            </div>
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="font-size: 12px; font-weight: 600;">Stage:</label>
              <select id="bulk-reminder-stage" style="padding: 6px 10px; font-size: 12.5px;">
                <option value="7_day">Stage 1 (7-Day Advance)</option>
                <option value="3_day" selected>Stage 2 (3-Day Reminder)</option>
                <option value="1_day">Stage 3 (1-Day Urgent)</option>
              </select>
            </div>
            <button class="btn-primary" id="btn-dispatch-bulk-reminders">
              📧 Send Reminder to Selected (<span id="bulk-selected-count">${unpaidMembers.length}</span>)
            </button>
            <button class="btn-sm" id="btn-toggle-select-all">
              Toggle All
            </button>
          </div>
        </div>
      </div>

      <!-- Unpaid Members Table with Selection Checkboxes -->
      <div class="panel-header">
        <div class="panel-title">⚠️ Members with Pending Contribution for ${curMonth}</div>
        <div id="selection-status-badge" class="badge badge-info">
          ${unpaidMembers.length} of ${unpaidMembers.length} selected
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">
                <input type="checkbox" id="check-all-unpaid" checked title="Select All / Deselect All">
              </th>
              <th>Member Name</th>
              <th>Email Address</th>
              <th>Contact Phone</th>
              <th class="t-right">Monthly Due</th>
              <th class="t-right">Balance Pending</th>
              <th>Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            ${unpaidMembers.map(m => `
              <tr class="unpaid-member-row" id="row-unpaid-${m.id}">
                <td style="text-align: center;">
                  <input type="checkbox" class="check-unpaid-item" data-id="${m.id}" data-name="${escapeHTML(m.name)}" data-email="${escapeHTML(m.email)}" data-due="${m.remainingDue}" checked>
                </td>
                <td><strong>${escapeHTML(m.name)}</strong></td>
                <td>${escapeHTML(m.email)}</td>
                <td>${escapeHTML(m.phone)}</td>
                <td class="t-right">${formatCurrency(m.commitment)}</td>
                <td class="t-right bad"><strong>${formatCurrency(m.remainingDue)}</strong></td>
                <td>
                  <div style="display: inline-flex; gap: 6px;">
                    <button class="btn-sm btn-primary btn-send-single-reminder" data-id="${m.id}" data-name="${escapeHTML(m.name)}" data-email="${escapeHTML(m.email)}" data-due="${m.remainingDue}">
                      ✉️ Send
                    </button>
                    ${m.phone && m.phone !== 'N/A' ? `
                      <button class="btn-sm btn-gold btn-send-whatsapp" data-id="${m.id}" data-name="${escapeHTML(m.name)}" data-phone="${escapeHTML(m.phone)}" data-due="${m.remainingDue}" title="Send WhatsApp reminder">
                        💬 WhatsApp
                      </button>
                    ` : ''}
                    <button class="btn-sm btn-preview-email" data-id="${m.id}" data-name="${escapeHTML(m.name)}" data-due="${m.remainingDue}">
                      👁️ Preview
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center; color: var(--gold-main); font-weight: bold; padding: 24px;">🎉 All members have cleared their monthly contributions for this month!</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==========================================================================
   EVENT HANDLERS & INTERACTIONS
   ========================================================================== */

function attachViewListeners() {
  const isAdmin = state.isAdmin();

  // Contributions handlers
  if (isAdmin) {
    $('btn-add-contrib')?.addEventListener('click', handleAddContrib);
    $('btn-batch-month')?.addEventListener('click', handleBatchMonthContribs);
    $('btn-undo-contrib')?.addEventListener('click', handleUndoContrib);
    $('select-contrib-member')?.addEventListener('change', handleContribMemberChange);
    document.querySelectorAll('.btn-del-contrib').forEach(b => {
      b.addEventListener('click', (e) => handleDeleteContrib(e.target.dataset.id));
    });

    // Members handlers
    $('btn-add-member')?.addEventListener('click', openAddMemberModal);
    $('input-default-monthly')?.addEventListener('change', (e) => {
      state.data.monthly = Number(e.target.value) || 10000;
      state.save();
    });
    document.querySelectorAll('.btn-edit-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        openEditMemberModal(id);
      });
    });

    // Loans handlers
    $('btn-issue-loan')?.addEventListener('click', handleIssueLoan);
    document.querySelectorAll('.btn-record-pay').forEach(b => {
      b.addEventListener('click', (e) => handleRecordLoanPayment(e.target.dataset.id));
    });
    document.querySelectorAll('.btn-foreclose').forEach(b => {
      b.addEventListener('click', (e) => handleForecloseLoan(e.target.dataset.id));
    });
    document.querySelectorAll('.btn-del-loan').forEach(b => {
      b.addEventListener('click', (e) => handleDeleteLoan(e.target.dataset.id));
    });

    // Investments handlers
    $('btn-add-inv')?.addEventListener('click', handleAddInvestment);
    document.querySelectorAll('.input-inv-val').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = Number(e.target.dataset.id);
        const inv = state.data.invs.find(x => x.id === id);
        if (inv) {
          inv.value = Number(e.target.value) || 0;
          state.save();
        }
      });
    });
    document.querySelectorAll('.btn-del-inv').forEach(b => {
      b.addEventListener('click', (e) => handleDeleteInvestment(e.target.dataset.id));
    });
    // Reminders Trigger Handlers (Admins only)
    document.querySelectorAll('.btn-trigger-remind').forEach(b => {
      b.addEventListener('click', (e) => {
        const stage = e.target.dataset.stage;
        triggerReminderBatch(stage);
      });
    });

    $('btn-email-settings')?.addEventListener('click', openEmailSettingsModal);

    document.querySelectorAll('.btn-send-whatsapp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { name, phone, due } = e.currentTarget.dataset;
        const stage = $('bulk-reminder-stage')?.value || '3_day';
        const curMonth = getCurrentMonth();
        const message = generateReminderPlainText({
          memberName: name,
          targetMonth: curMonth,
          stage,
          amountDue: Number(due)
        });
        openWhatsAppReminder(phone, message);
      });
    });

    // Bulk Reminders Handlers (Admins only)
    $('check-all-unpaid')?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      document.querySelectorAll('.check-unpaid-item').forEach(cb => {
        cb.checked = isChecked;
      });
      updateBulkSelectionUI();
    });

    $('btn-toggle-select-all')?.addEventListener('click', () => {
      const items = document.querySelectorAll('.check-unpaid-item');
      const anyUnchecked = Array.from(items).some(cb => !cb.checked);
      items.forEach(cb => {
        cb.checked = anyUnchecked;
      });
      updateBulkSelectionUI();
    });

    document.querySelectorAll('.check-unpaid-item').forEach(cb => {
      cb.addEventListener('change', updateBulkSelectionUI);
    });

    $('btn-dispatch-bulk-reminders')?.addEventListener('click', handleBulkDispatchReminders);

    document.querySelectorAll('.btn-send-single-reminder').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const { id, name, email, due } = e.currentTarget.dataset;
        handleSendSingleReminder(id, name, email, due);
      });
    });
  }

  // Toggle Loan Amortization Schedule (Available to everyone)
  document.querySelectorAll('.btn-toggle-schedule').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      openLoanSchedules[id] = !openLoanSchedules[id];
      render();
    });
  });

  // PDF Export Handlers (Available to everyone)
  $('btn-generate-pdf')?.addEventListener('click', () => {
    const mo = $('select-export-month')?.value || getCurrentMonth();
    exportMonthlyStatementPDF(mo, state.data);
  });

  // Email Preview (Available to everyone)
  document.querySelectorAll('.btn-preview-email').forEach(b => {
    b.addEventListener('click', (e) => {
      const name = e.target.dataset.name;
      const due = e.target.dataset.due;
      openEmailPreview(name, due);
    });
  });
}

function handleContribMemberChange() {
  const mId = Number($('select-contrib-member').value);
  const m = state.data.members.find(x => x.id === mId);
  if (m) {
    $('input-contrib-amt').value = getMemberCommitment(m, state.data.monthly);
  }
}

function handleAddContrib() {
  const mId = Number($('select-contrib-member').value);
  const month = $('input-contrib-month').value;
  const amt = Number($('input-contrib-amt').value);

  if (!amt || amt <= 0) return alert('Please enter a valid contribution amount.');

  state.data.contribs.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    m: mId,
    month,
    amt,
    date: getTodayDate()
  });

  state.save();
  alert('Contribution recorded successfully!');
}

function handleBatchMonthContribs() {
  const month = $('input-contrib-month').value || getCurrentMonth();
  let count = 0;

  state.data.members.forEach(m => {
    const alreadyLogged = state.data.contribs.some(c => c.m === m.id && c.month === month);
    if (!alreadyLogged) {
      count++;
      state.data.contribs.push({
        id: Date.now() + count,
        m: m.id,
        month,
        amt: getMemberCommitment(m, state.data.monthly),
        date: getTodayDate()
      });
    }
  });

  if (count === 0) {
    alert(`All members already have contributions recorded for ${month}.`);
  } else {
    state.save();
    alert(`Recorded monthly contributions for ${count} members for ${month}!`);
  }
}

function handleUndoContrib() {
  if (state.data.contribs.length === 0) return alert('No contributions to undo.');
  const last = state.data.contribs.pop();
  state.save();
  alert(`Undid last entry for Member #${last.m} (${formatCurrency(last.amt)})`);
}

function handleDeleteContrib(id) {
  if (!confirm('Are you sure you want to delete this contribution entry?')) return;
  state.data.contribs = state.data.contribs.filter(c => c.id !== Number(id));
  state.save();
}

function handleIssueLoan() {
  const mId = Number($('select-loan-member').value);
  const amt = Number($('input-loan-amt').value);
  const rate = Number($('input-loan-rate').value) || 1.0;
  const pct = Number($('input-loan-pct').value) || 5.0;
  const tenure = Number($('input-loan-tenure').value) || 20;
  const date = $('input-loan-date').value || getTodayDate();

  if (!amt || amt <= 0) return alert('Please enter a valid loan amount.');

  const cash = calculateTotals(state.data).cashInHand;
  if (amt > cash) {
    if (!confirm(`Warning: Loan amount (${formatCurrency(amt)}) exceeds current cash in hand (${formatCurrency(cash)}). Proceed anyway?`)) {
      return;
    }
  }

  state.data.loans.push({
    id: Date.now(),
    m: mId,
    amt,
    rate,
    pct,
    n: tenure,
    date,
    reps: []
  });

  state.save();
  alert('Loan sanctioned successfully!');
}

function handleRecordLoanPayment(loanId) {
  const input = $(`input-pay-${loanId}`);
  const amt = Number(input?.value);
  if (!amt || amt <= 0) return alert('Please enter repayment payment amount.');

  const loan = state.data.loans.find(l => l.id === Number(loanId));
  if (!loan) return;

  loan.reps = loan.reps || [];
  loan.reps.push({
    amt,
    date: getTodayDate()
  });

  state.save();
  alert(`Recorded payment of ${formatCurrency(amt)}!`);
}

function handleForecloseLoan(loanId) {
  const loan = state.data.loans.find(l => l.id === Number(loanId));
  if (!loan) return;

  const a = calculateLoanAnalytics(loan);
  if (!a.isForeclosureEligible) {
    return alert(`Foreclosure is locked for the first 2 months. Eligible starting: ${a.foreclosureEligibleDate}`);
  }

  if (confirm(`Confirm foreclosure of loan for ${formatCurrency(a.foreclosureAmount)}? This will mark the loan cleared.`)) {
    loan.reps.push({ amt: a.foreclosureAmount, date: getTodayDate() });
    loan.closed = true;
    state.save();
    alert('Loan successfully foreclosed and settled!');
  }
}

function handleDeleteLoan(loanId) {
  if (!confirm('Are you sure you want to delete this loan record?')) return;
  state.data.loans = state.data.loans.filter(l => l.id !== Number(loanId));
  state.save();
}

function handleAddInvestment() {
  const name = $('input-inv-name').value.trim();
  const type = $('select-inv-type').value;
  const cost = Number($('input-inv-cost').value);
  const date = $('input-inv-date').value || getTodayDate();

  if (!name || !cost) return alert('Please specify investment name and amount.');

  state.data.invs.push({
    id: Date.now(),
    name,
    type,
    cost,
    value: cost,
    date
  });

  state.save();
  alert('Investment recorded!');
}

function handleDeleteInvestment(id) {
  if (!confirm('Delete this investment entry?')) return;
  state.data.invs = state.data.invs.filter(i => i.id !== Number(id));
  state.save();
}

/* ==========================================================================
   MODALS: AUTHENTICATION, EMAIL PREVIEW & BACKUPS
   ========================================================================== */

function openLoginModal(defaultPortal = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const admins = state.getAdminList();
  const activeAdmin = state.getActiveAdmin() || admins[0];
  let currentPortal = defaultPortal || (state.isAdmin() ? 'admin' : 'member');

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <div>
          <div class="modal-title" style="font-size: 19px; display: flex; align-items: center; gap: 8px;">
            <span>🏛️</span>
            <span>Society Portal Access</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Sumukha Co-Operative Society
          </div>
        </div>
        <button class="btn-sm" id="modal-close-login">✕</button>
      </div>

      <!-- Segmented Portal Switcher -->
      <div class="portal-segmented-tabs">
        <button type="button" class="portal-tab-btn ${currentPortal === 'admin' ? 'active' : ''}" id="tab-portal-admin">
          👑 Administrator
        </button>
        <button type="button" class="portal-tab-btn ${currentPortal === 'member' ? 'active' : ''}" id="tab-portal-member">
          👤 Society Member
        </button>
      </div>

      <!-- Administrator Sign-In Pane -->
      <div id="pane-portal-admin" style="${currentPortal === 'admin' ? 'display: block;' : 'display: none;'}">
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Select Administrator Account:</label>
          <select id="modal-admin-select" style="width: 100%;">
            ${admins.map(a => `
              <option value="${a.id}" ${activeAdmin && activeAdmin.id === a.id ? 'selected' : ''}>
                ${escapeHTML(a.name)} (${escapeHTML(a.email)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 18px;">
          <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Password:</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input type="password" id="modal-admin-password" placeholder="Enter password" style="width: 100%; padding-right: 42px;">
            <button type="button" id="btn-toggle-pass" style="position: absolute; right: 6px; background: transparent; border: none; cursor: pointer; font-size: 14px; padding: 4px;" title="Show/Hide Password">👁️</button>
          </div>
        </div>

        <button type="button" class="btn-primary" id="btn-submit-admin" style="width: 100%; padding: 10px; font-size: 13.5px;">
          Sign In as Administrator
        </button>
      </div>

      <!-- Society Member Portal Pane -->
      <div id="pane-portal-member" style="${currentPortal === 'member' ? 'display: block;' : 'display: none;'}">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Select Member Profile:</label>
          <select id="modal-member-select" style="width: 100%;">
            ${state.data.members.map(m => `<option value="${m.id}" ${state.session.memberId === m.id ? 'selected' : ''}>${escapeHTML(m.name)} (Member #${m.id})</option>`).join('')}
          </select>
        </div>

        <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 18px;">
          Access your personal contribution passbook, active loan schedules, and society ledger summary.
        </p>

        <button type="button" class="btn-primary" id="btn-submit-member" style="width: 100%; padding: 10px; font-size: 13.5px;">
          Enter Member Portal
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const tabAdmin = modal.querySelector('#tab-portal-admin');
  const tabMember = modal.querySelector('#tab-portal-member');
  const paneAdmin = modal.querySelector('#pane-portal-admin');
  const paneMember = modal.querySelector('#pane-portal-member');
  const passInput = modal.querySelector('#modal-admin-password');
  const togglePassBtn = modal.querySelector('#btn-toggle-pass');

  modal.querySelector('#modal-close-login').onclick = () => modal.remove();

  tabAdmin.onclick = () => {
    tabAdmin.classList.add('active');
    tabMember.classList.remove('active');
    paneAdmin.style.display = 'block';
    paneMember.style.display = 'none';
    passInput.focus();
  };

  tabMember.onclick = () => {
    tabMember.classList.add('active');
    tabAdmin.classList.remove('active');
    paneAdmin.style.display = 'none';
    paneMember.style.display = 'block';
  };

  togglePassBtn?.addEventListener('click', () => {
    if (passInput.type === 'password') {
      passInput.type = 'text';
      togglePassBtn.textContent = '🔒';
    } else {
      passInput.type = 'password';
      togglePassBtn.textContent = '👁️';
    }
  });

  if (currentPortal === 'admin' && passInput) {
    setTimeout(() => passInput.focus(), 60);
  }

  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#btn-submit-admin')?.click();
    }
  });

  // Admin Sign-in
  modal.querySelector('#btn-submit-admin').onclick = () => {
    const adminId = Number(modal.querySelector('#modal-admin-select').value);
    const password = passInput.value;
    const verify = state.verifyAdminLogin(adminId, password);

    if (!verify.success) {
      return alert(verify.message);
    }

    state.setRole('admin', adminId, { id: verify.admin.id, name: verify.admin.name });
    modal.remove();
    alert(`Welcome, Administrator ${verify.admin.name}.`);
  };

  // Member Portal Switch
  modal.querySelector('#btn-submit-member').onclick = () => {
    const mId = Number(modal.querySelector('#modal-member-select').value);
    state.setRole('member', mId);
    modal.remove();
  };
}

function openEditMemberModal(memberId) {
  const member = state.data.members.find(m => m.id === Number(memberId));
  if (!member) return alert('Member profile not found.');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">✏️ Edit Member Profile</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Member #${member.id} · ${escapeHTML(member.name)}
          </div>
        </div>
        <button class="btn-sm" id="btn-close-edit-modal">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Modify profile details, monthly commitment, and administrative role. All updates are securely stored in the database.
      </p>

      <form id="form-edit-member" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Full Name:</label>
          <input type="text" id="edit-mem-name" value="${escapeHTML(member.name)}" required style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Email Address:</label>
            <input type="email" id="edit-mem-email" value="${escapeHTML(member.email || '')}" placeholder="email@example.com" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Contact Phone:</label>
            <input type="tel" id="edit-mem-phone" value="${escapeHTML(member.phone || '')}" placeholder="Contact number" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Monthly Commitment (₹):</label>
            <input type="number" id="edit-mem-monthly" value="${getMemberCommitment(member, state.data.monthly)}" step="500" min="0" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Access Role:</label>
            <select id="edit-mem-role" style="width: 100%;">
              <option value="false" ${!member.is_admin ? 'selected' : ''}>👤 Society Member</option>
              <option value="true" ${member.is_admin ? 'selected' : ''}>👑 Administrator</option>
            </select>
          </div>
        </div>

        <div id="edit-mem-pass-group" class="form-group" style="margin-bottom: 16px; ${member.is_admin ? 'display: flex;' : 'display: none;'}">
          <label style="font-size: 12px; font-weight: bold;">Administrator Password:</label>
          <input type="text" id="edit-mem-password" value="${escapeHTML(member.password || '')}" placeholder="Set admin password" style="width: 100%;">
          <span style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Password used to sign into the administration console.</span>
        </div>

        <div class="modal-footer" style="margin-top: 18px;">
          <button type="button" class="btn-sm" id="btn-cancel-edit-mem">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-member-db">💾 Save to Database</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-edit-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-edit-mem').onclick = () => modal.remove();

  const roleSelect = modal.querySelector('#edit-mem-role');
  const passGroup = modal.querySelector('#edit-mem-pass-group');
  roleSelect.addEventListener('change', () => {
    passGroup.style.display = roleSelect.value === 'true' ? 'flex' : 'none';
  });

  modal.querySelector('#btn-save-member-db').onclick = async () => {
    const name = modal.querySelector('#edit-mem-name').value.trim();
    const email = modal.querySelector('#edit-mem-email').value.trim();
    const phone = modal.querySelector('#edit-mem-phone').value.trim();
    const monthly = Number(modal.querySelector('#edit-mem-monthly').value) || 0;
    const is_admin = roleSelect.value === 'true';
    const password = modal.querySelector('#edit-mem-password').value.trim();

    if (!name) {
      return alert('Member name cannot be empty.');
    }

    const payload = { name, email, phone, monthly, is_admin };
    if (is_admin && password) {
      payload.password = password;
    }

    const res = await state.updateMember(member.id, payload);
    if (res.success) {
      modal.remove();
      alert(res.message);
    } else {
      alert(res.message);
    }
  };
}

function openAddMemberModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const newId = Math.max(...state.data.members.map(m => m.id), 0) + 1;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px;">
      <div class="modal-header">
        <div class="modal-title">➕ Add New Member</div>
        <button class="btn-sm" id="btn-close-add-modal">✕</button>
      </div>

      <form id="form-add-member" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Full Name:</label>
          <input type="text" id="add-mem-name" placeholder="Full name" required style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Email Address:</label>
            <input type="email" id="add-mem-email" placeholder="name@example.com" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Contact Phone:</label>
            <input type="tel" id="add-mem-phone" placeholder="10-digit number" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Monthly Commitment (₹):</label>
            <input type="number" id="add-mem-monthly" value="${state.data.monthly}" step="500" min="0" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Access Role:</label>
            <select id="add-mem-role" style="width: 100%;">
              <option value="false">👤 Society Member</option>
              <option value="true">👑 Administrator</option>
            </select>
          </div>
        </div>

        <div class="modal-footer" style="margin-top: 18px;">
          <button type="button" class="btn-sm" id="btn-cancel-add-mem">Cancel</button>
          <button type="button" class="btn-primary" id="btn-confirm-add-mem">💾 Add & Save to Database</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-add-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-add-mem').onclick = () => modal.remove();

  modal.querySelector('#btn-confirm-add-mem').onclick = async () => {
    const name = modal.querySelector('#add-mem-name').value.trim();
    const email = modal.querySelector('#add-mem-email').value.trim();
    const phone = modal.querySelector('#add-mem-phone').value.trim();
    const monthly = Number(modal.querySelector('#add-mem-monthly').value) || state.data.monthly;
    const is_admin = modal.querySelector('#add-mem-role').value === 'true';

    if (!name) return alert('Please enter member full name.');

    const newMember = {
      id: newId,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: phone || '',
      monthly,
      is_admin
    };

    state.data.members.push(newMember);
    state.save();

    // Supabase sync
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('members').insert([{
          id: newId,
          name: newMember.name,
          email: newMember.email,
          phone: newMember.phone,
          monthly_commitment: newMember.monthly,
          is_admin: newMember.is_admin
        }]);
      }
    } catch (e) {
      console.warn('Supabase add member notice:', e);
    }

    modal.remove();
    alert(`Member "${name}" successfully registered and saved in database!`);
  };
}

function openChangePasswordModal() {
  const admins = state.getAdminList();
  const activeAdmin = state.getActiveAdmin() || admins[0];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 460px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">🔑 Change Administrator Password</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Sumukha Co-Operative Society
          </div>
        </div>
        <button class="btn-sm" id="close-change-pass">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
        Update the secure access password for the administrator account. The new password will be stored securely in the database.
      </p>

      <div class="form-group" style="margin-bottom: 12px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Select Administrator Account:</label>
        <select id="select-change-pass-admin" style="width: 100%;">
          ${admins.map(a => `
            <option value="${a.id}" ${activeAdmin && activeAdmin.id === a.id ? 'selected' : ''}>
              ${escapeHTML(a.name)} · ${escapeHTML(a.email)} (${escapeHTML(a.phone)})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Current Password:</label>
        <input type="password" id="input-curr-pass" placeholder="Enter current password" style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">New Password:</label>
        <input type="password" id="input-new-pass" placeholder="Enter new password (min 4 characters)" style="width: 100%;">
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Confirm New Password:</label>
        <input type="password" id="input-confirm-pass" placeholder="Confirm new password" style="width: 100%;">
      </div>

      <div class="modal-footer">
        <button class="btn-sm" id="btn-cancel-change-pass">Cancel</button>
        <button class="btn-primary" id="btn-save-new-pass">💾 Save to Database</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#close-change-pass').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-change-pass').onclick = () => modal.remove();

  modal.querySelector('#btn-save-new-pass').onclick = async () => {
    const adminId = Number(modal.querySelector('#select-change-pass-admin').value);
    const targetAdmin = state.data.members.find(m => m.id === adminId && m.is_admin);
    if (!targetAdmin) return alert('Administrator account not found.');

    const curr = modal.querySelector('#input-curr-pass').value.trim();
    const next = modal.querySelector('#input-new-pass').value.trim();
    const confirm = modal.querySelector('#input-confirm-pass').value.trim();

    if (curr !== targetAdmin.password) {
      return alert(`Incorrect current password for Administrator ${targetAdmin.name}.`);
    }
    if (!next || next.length < 4) {
      return alert('New password must be at least 4 characters long.');
    }
    if (next !== confirm) {
      return alert('New password and confirmation password do not match.');
    }

    const res = await state.updateAdminPassword(targetAdmin.id, next);
    if (res.success) {
      modal.remove();
      alert(`Password for Administrator ${targetAdmin.name} successfully updated and saved in database.`);
    } else {
      alert(res.message);
    }
  };
}

function updateBulkSelectionUI() {
  const checkboxes = document.querySelectorAll('.check-unpaid-item');
  const checked = document.querySelectorAll('.check-unpaid-item:checked');
  const countSpan = $('bulk-selected-count');
  const statusBadge = $('selection-status-badge');
  const masterCheck = $('check-all-unpaid');

  if (countSpan) countSpan.textContent = checked.length;
  if (statusBadge) statusBadge.textContent = `${checked.length} of ${checkboxes.length} selected`;
  if (masterCheck) {
    masterCheck.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    masterCheck.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
}

async function handleBulkDispatchReminders() {
  if (!state.isAdmin()) {
    return alert('Access Restricted: Only Society Administrators (Sagar & Naveen) can dispatch reminders.');
  }

  const checked = Array.from(document.querySelectorAll('.check-unpaid-item:checked'));
  if (checked.length === 0) {
    return alert('Please select at least one member using the checkboxes to dispatch reminders.');
  }

  const stage = $('bulk-reminder-stage')?.value || '3_day';
  const curMonth = getCurrentMonth();

  if (!confirm(`Dispatch automated reminder emails from sumukhasociety@gmail.com to ${checked.length} selected member(s)?`)) return;

  let successCount = 0;
  let failCount = 0;

  for (const item of checked) {
    const template = generateReminderEmailTemplate({
      memberName: item.dataset.name,
      targetMonth: curMonth,
      stage,
      amountDue: Number(item.dataset.due)
    });

    try {
      await sendRealEmail({
        to: item.dataset.email,
        subject: template.subject,
        html: template.html
      });
      successCount++;
    } catch (e) {
      console.error(e);
      failCount++;
    }
  }

  alert(`✅ Bulk Email Dispatch Complete!\n• Delivered: ${successCount}\n• Errors: ${failCount}`);
}

async function handleSendSingleReminder(id, name, email, due) {
  if (!state.isAdmin()) {
    return alert('Access Restricted: Only Society Administrators (Sagar & Naveen) can dispatch reminders.');
  }

  const member = state.data.members.find(m => m.id === Number(id));
  const stage = $('bulk-reminder-stage')?.value || '3_day';
  const curMonth = getCurrentMonth();

  const template = generateReminderEmailTemplate({
    memberName: name,
    targetMonth: curMonth,
    stage,
    amountDue: Number(due)
  });

  const plainText = generateReminderPlainText({
    memberName: name,
    targetMonth: curMonth,
    stage,
    amountDue: Number(due)
  });

  try {
    await sendRealEmail({
      to: email,
      subject: template.subject,
      html: template.html
    });
    alert(`✅ Reminder email successfully delivered to ${name} (${email})!`);
  } catch (err) {
    console.error('Email dispatch error:', err);
    if (confirm(`Could not send automated email: ${err.message}\n\nWould you like to open your Email App (Gmail / Outlook) instead?`)) {
      openNativeMailClient(email, template.subject, plainText);
    }
  }
}

function openDispatchChoiceModal({ name, email, phone, subject, body }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">📤 Deliver Reminder to ${escapeHTML(name)}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${escapeHTML(email)} · ${escapeHTML(phone || '')}</div>
        </div>
        <button class="btn-sm" id="btn-close-choice">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Choose how you would like to send this reminder notice:
      </p>

      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
        <button class="btn-primary" id="btn-choice-mail" style="padding: 12px; font-size: 13.5px; justify-content: flex-start; text-align: left;">
          📧 <strong>Open in Email App (Gmail / Outlook)</strong>
          <span style="font-size: 11px; opacity: 0.85; display: block; font-weight: normal; margin-top: 2px;">Opens your email client with pre-filled subject and notice, ready to send instantly</span>
        </button>

        ${phone && phone !== 'N/A' ? `
          <button class="btn-gold" id="btn-choice-whatsapp" style="padding: 12px; font-size: 13.5px; justify-content: flex-start; text-align: left;">
            💬 <strong>Send via WhatsApp (${escapeHTML(phone)})</strong>
            <span style="font-size: 11px; opacity: 0.85; display: block; font-weight: normal; margin-top: 2px;">Opens WhatsApp with formatted reminder message</span>
          </button>
        ` : ''}

        <button class="btn-sm" id="btn-choice-configure-resend" style="padding: 10px; font-size: 12.5px; justify-content: flex-start; text-align: left; background: var(--surface-subtle);">
          ⚙️ <strong>Configure Free Automated Email (Resend)</strong>
          <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px;">Connect a free Resend API key for automated silent cloud delivery</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#btn-close-choice').onclick = () => modal.remove();

  modal.querySelector('#btn-choice-mail').onclick = () => {
    modal.remove();
    openNativeMailClient(email, subject, body);
  };

  if (phone && phone !== 'N/A') {
    modal.querySelector('#btn-choice-whatsapp')?.addEventListener('click', () => {
      modal.remove();
      openWhatsAppReminder(phone, body);
    });
  }

  modal.querySelector('#btn-choice-configure-resend').onclick = () => {
    modal.remove();
    openEmailSettingsModal();
  };
}

function openEmailSettingsModal() {
  if (!state.isAdmin()) {
    return alert('Access Restricted: Only Society Administrators can configure email delivery settings.');
  }

  const cfg = getEmailServiceConfig();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">⚙️ Email Provider Setup</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Automated Cloud Email Delivery</div>
        </div>
        <button class="btn-sm" id="btn-close-email-cfg">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
        To deliver real emails directly into members' inboxes without opening your mail app, connect a free API key from <strong>Resend</strong> (3,000 free emails/month):
      </p>

      <div style="background: var(--surface-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 16px; font-size: 12.5px; line-height: 1.5;">
        1. Sign up for free at <a href="https://resend.com" target="_blank" style="color: var(--gold-main); font-weight: bold; text-decoration: underline;">resend.com</a> (Takes 30 seconds)<br>
        2. Create an API Key in your Resend Dashboard (starts with <code>re_...</code>)<br>
        3. Paste it below and click Save.
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Resend API Key:</label>
        <input type="text" id="input-email-apikey" value="${escapeHTML(cfg.apiKey || '')}" placeholder="re_123456789..." style="width: 100%;">
      </div>

      <div class="modal-footer">
        <button class="btn-sm" id="btn-cancel-email-cfg">Cancel</button>
        <button class="btn-primary" id="btn-save-email-cfg">💾 Save Settings</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#btn-close-email-cfg').onclick = () => modal.remove();
  modal.querySelector('#btn-cancel-email-cfg').onclick = () => modal.remove();

  modal.querySelector('#btn-save-email-cfg').onclick = () => {
    const apiKey = modal.querySelector('#input-email-apikey').value.trim();
    saveEmailServiceConfig({ ...cfg, apiKey });
    modal.remove();
    alert('Email settings saved successfully! Automated emails will now be sent using Resend.');
  };
}

function openEmailPreview(name, due) {
  const curMonth = getCurrentMonth();
  const template = generateReminderEmailTemplate({
    memberName: name,
    targetMonth: curMonth,
    stage: '3_day',
    amountDue: Number(due)
  });

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content wide">
      <div class="modal-header">
        <div class="modal-title">✉️ Email Preview (${escapeHTML(name)})</div>
        <button class="btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Subject: ${escapeHTML(template.subject)}</div>
      <div style="border: 1px solid var(--border); border-radius: 8px; overflow: hidden; max-height: 400px; overflow-y: auto;">
        ${template.html}
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function triggerReminderBatch(stage) {
  if (!state.isAdmin()) {
    return alert('Access Restricted: Only Society Administrators (Sagar & Naveen) can dispatch reminders to everyone.');
  }

  const curMonth = getCurrentMonth();
  const unpaid = getUnpaidMembers(curMonth, state.data);

  if (unpaid.length === 0) {
    return alert(`All members have cleared dues for ${curMonth}! No reminders needed.`);
  }

  const stageLabels = {
    '7_day': 'Stage 1 (7-Day Advance Notice)',
    '3_day': 'Stage 2 (3-Day Gentle Reminder)',
    '1_day': 'Stage 3 (1-Day Final Notice)'
  };
  const label = stageLabels[stage] || stage;

  if (!confirm(`Dispatch automated ${label} emails from sumukhasociety@gmail.com to all ${unpaid.length} pending members?`)) return;

  let successCount = 0;
  let failCount = 0;

  for (const m of unpaid) {
    const template = generateReminderEmailTemplate({
      memberName: m.name,
      targetMonth: curMonth,
      stage,
      amountDue: Number(m.remainingDue)
    });

    try {
      await sendRealEmail({
        to: m.email,
        subject: template.subject,
        html: template.html
      });
      successCount++;
    } catch (err) {
      console.error(err);
      failCount++;
    }
  }

  alert(`✅ ${label} Broadcast Complete!\n• Successfully Delivered: ${successCount}\n• Errors: ${failCount}`);
}

function exportBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `sumukha_society_backup_${getTodayDate()}.json`);
  dlAnchor.click();
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Global hook for PDF export from HTML button clicks
window.exportCurrentMonthPDF = () => exportMonthlyStatementPDF(getCurrentMonth(), state.data);
window.exportMemberStatementPDF = (id) => exportMemberStatementPDF(id, state.data);

// Theme Toggle
window.toggleTheme = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sumukha_theme', next);
};
