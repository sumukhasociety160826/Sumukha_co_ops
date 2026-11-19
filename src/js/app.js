/**
 * Sumukha Co-Op Society - Main Application Controller
 * Role-Based Access Control, Tab Routing & Interactive UI Engine
 */

import { state } from './state.js';
import {
  formatCurrency,
  getTodayDate,
  getCurrentMonth,
  addMonths,
  getMemberCommitment,
  calculateTotals,
  calculateLoanAnalytics,
  calculateContributionsMatrix,
  calculateInvestmentsSummary,
  calculateOneTimeInvestmentReturn,
  calculateOneTimeInvestmentsSummary,
  calculateExpensesSummary
} from './calculations.js';
import { exportMonthlyStatementPDF, exportMemberStatementPDF, exportExpensesStatementPDF } from './pdf.js';
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
let appMode = sessionStorage.getItem('sumukha_app_mode') || 'coop'; // 'coop' | 'expenses'
let invSubView = sessionStorage.getItem('sumukha_inv_subview') || 'investments'; // 'investments' | 'expenses'
let openLoanSchedules = {};

// Cache DOM Elements
const $ = (id) => document.getElementById(id);

/**
 * Modern Toast Notification System
 * Replaces harsh native browser alert/error popups with calm, polished cards
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const msgText = String(message || '');
  const msgLower = msgText.toLowerCase();

  let resolvedType = type;
  let icon = 'ℹ️';
  let title = 'Information';

  if (type === 'info') {
    if (msgLower.includes('success') || msgLower.includes('saved') || msgLower.includes('recorded') || msgLower.includes('restored') || msgLower.includes('cleared')) {
      resolvedType = 'success';
    } else if (msgLower.includes('restricted') || msgLower.includes('please') || msgLower.includes('required') || msgLower.includes('fail') || msgLower.includes('invalid') || msgLower.includes('error')) {
      resolvedType = 'warning';
    }
  }

  if (resolvedType === 'success') {
    icon = '✓';
    title = 'Success';
  } else if (resolvedType === 'warning') {
    icon = '⚠️';
    title = 'Attention';
  } else if (resolvedType === 'error') {
    icon = '✕';
    title = 'Notice';
  }

  toast.className = `toast toast-${resolvedType}`;
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${escapeHTML(msgText)}</div>
    </div>
    <button class="toast-close" title="Dismiss">✕</button>
  `;

  toast.querySelector('.toast-close').onclick = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  };

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }
  }, duration);
}

/**
 * Modern Custom Confirmation Modal
 * Replaces browser native confirm() dialogs with elegant cooperative dialogs
 */
export function showConfirmModal({ title = 'Confirmation', message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, isDanger = false }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>${isDanger ? '⚠️' : '💬'}</span>
          <span>${escapeHTML(title)}</span>
        </div>
        <button class="modal-close-btn" id="btn-close-confirm-modal">✕</button>
      </div>
      <div style="font-size: 14px; color: var(--text-main); margin-bottom: 22px; line-height: 1.5;">
        ${message}
      </div>
      <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn-sm" id="btn-cancel-confirm-modal" style="min-width: 90px;">${escapeHTML(cancelText)}</button>
        <button class="${isDanger ? 'btn-danger' : 'btn-primary'}" id="btn-ok-confirm-modal" style="min-width: 100px;">
          ${escapeHTML(confirmText)}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-confirm-modal').onclick = close;
  modal.querySelector('#btn-cancel-confirm-modal').onclick = close;
  modal.querySelector('#btn-ok-confirm-modal').onclick = () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  };
}

export async function initApp() {
  // Override native browser alert to eliminate error-like OS dialogs
  window.alert = function(msg) {
    showToast(msg, 'info');
  };

  // Theme initialization
  const savedTheme = localStorage.getItem('sumukha_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Restore active tab from session if available
  const savedTab = sessionStorage.getItem('sumukha_active_tab');
  if (savedTab) {
    activeTab = savedTab;
  }

  // Subscribe to state updates
  state.subscribe(() => {
    render();
  });

  // Initial immediate render from local cache
  render();

  // Load and sync live data from Supabase PostgreSQL database
  try {
    await state.syncFromCloud();
  } catch (e) {
    console.warn('Initial Supabase database sync notice:', e);
  }
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

  // Update Portal Mode Toggle Button in Header (Co-Op Society <-> Expense Calculator)
  const modeBtn = $('btn-toggle-portal-mode');
  if (modeBtn) {
    if (appMode === 'expenses') {
      modeBtn.className = 'btn-sm btn-mode-toggle mode-active-expenses';
      modeBtn.innerHTML = `<span id="portal-mode-icon">🏛️</span> <span id="portal-mode-text">Co-Op Society</span>`;
      modeBtn.title = 'Switch back to Cooperative Society Management Portal';
    } else {
      modeBtn.className = 'btn-sm btn-mode-toggle';
      modeBtn.innerHTML = `<span id="portal-mode-icon">🧾</span> <span id="portal-mode-text">Expense Calculator</span>`;
      modeBtn.title = 'Switch to Society Expense Calculator & Splitter';
    }
  }

  // Admin Quick Tools & Live Cloud Database Status in Header
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

    // Dynamic Database Sync Badge with Realtime Multi-Device Indicator
    let syncBadgeHtml = '';
    if (state.cloudStatus === 'syncing') {
      syncBadgeHtml = `<button class="btn-sm" id="btn-cloud-sync" title="Syncing data with Supabase PostgreSQL..." style="border-color: var(--gold-border); background: var(--gold-tint); color: var(--gold-dark); cursor: pointer;"><span style="display:inline-block; animation: spin 1s infinite linear;">🔄</span> Syncing DB</button>`;
    } else if (state.cloudStatus === 'error') {
      syncBadgeHtml = `<button class="btn-sm" id="btn-cloud-sync" title="Database sync issue detected. Click to retry sync." style="border-color: rgba(220,38,38,0.4); background: var(--danger-bg); color: var(--danger); cursor: pointer;">⚠️ DB Offline (Retry)</button>`;
    } else {
      const rtText = state.isRealtimeActive ? '🟢 Live Realtime Sync' : '🟢 DB Synced';
      syncBadgeHtml = `<button class="btn-sm" id="btn-cloud-sync" title="${state.isRealtimeActive ? 'Realtime Multi-Device Sync Active. Click to force re-fetch.' : 'Database Synced. Click to refresh.'}" style="border-color: rgba(37,99,235,0.35); background: var(--navy-light); color: var(--navy-blue); cursor: pointer;">${rtText}</button>`;
    }

    const pwaBtnHtml = `<button class="btn-sm btn-gold" id="btn-pwa-install" title="Install Sumukha Co-Op Mobile App" style="display: ${window.deferredPWAInstallPrompt ? 'inline-flex' : 'none'}; font-weight: bold;">📲 Install App</button>`;

    if (isAdmin) {
      adminTools.innerHTML = `
        ${pwaBtnHtml}
        ${syncBadgeHtml}
        <button class="btn-sm btn-gold" id="btn-change-pass" title="Change Admin Password">🔑 Password</button>
        <button class="btn-sm btn-gold" id="btn-view-audit" title="View Regulatory Financial Audit Trail">📜 Audit Trail</button>
        <button class="btn-sm btn-gold" id="btn-backup-restore" title="Backup & Disaster Recovery">💾 Backup & Restore</button>
        <button class="btn-sm btn-danger" id="btn-admin-logout" title="Exit Administrator Mode">🚪 Sign Out</button>
      `;
      $('btn-change-pass')?.addEventListener('click', openChangePasswordModal);
      $('btn-view-audit')?.addEventListener('click', openAuditTrailModal);
      $('btn-backup-restore')?.addEventListener('click', openBackupRestoreModal);
      $('btn-admin-logout')?.addEventListener('click', () => {
        state.setRole('member', 1);
        activeTab = 'Members';
        try { sessionStorage.setItem('sumukha_active_tab', 'Members'); } catch (e) {}
        render();
        alert('Signed out of Administrator session. Returned to Member Directory.');
      });
    } else {
      adminTools.innerHTML = `
        ${pwaBtnHtml}
        ${syncBadgeHtml}
        <button class="btn-sm btn-primary" id="btn-admin-signin" title="Administrator Sign In">🔐 Administrator Sign In</button>
      `;
      $('btn-admin-signin')?.addEventListener('click', () => openLoginModal('admin'));
    }

    $('btn-pwa-install')?.addEventListener('click', async () => {
      if (window.deferredPWAInstallPrompt) {
        window.deferredPWAInstallPrompt.prompt();
        const { outcome } = await window.deferredPWAInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          const btn = $('btn-pwa-install');
          if (btn) btn.style.display = 'none';
          window.deferredPWAInstallPrompt = null;
        }
      } else {
        alert('To install on mobile, tap your browser menu (⋮ or Share) and select "Add to Home Screen" or "Install App".');
      }
    });

    $('btn-cloud-sync')?.addEventListener('click', async () => {
      const btn = $('btn-cloud-sync');
      if (btn) btn.innerHTML = '🔄 Syncing...';
      const res = await state.syncFromCloud();
      if (res.success) {
        alert('Database sync successful! All latest members, contributions, loans, and investments loaded from Supabase.');
      } else {
        alert('Database sync notice: ' + (res.error?.message || 'Could not connect to database.'));
      }
    });
  }
}

function renderNavigation() {
  const nav = $('tab-nav');
  if (!nav) return;

  // Dedicated Navigation when in Expense Calculator Mode
  if (appMode === 'expenses') {
    nav.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 4px 8px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🧾</span>
          <div style="text-align: left;">
            <div style="font-weight: 800; font-size: 14.5px; color: var(--gold-main); letter-spacing: 0.02em;">Expense Calculator &amp; Splitter</div>
            <div style="font-size: 11.5px; color: var(--text-dim);">${(state.data.expenses || []).length} Expenses Recorded · ${state.data.members.length} Members</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-sm btn-primary" id="btn-quick-add-exp">➕ Add Expense</button>
          <button class="btn-sm btn-gold" id="btn-quick-add-member">👥 Add Member</button>
          <button class="btn-sm" onclick="window.togglePortalMode()" title="Return to Cooperative Society Management Portal">🏛️ Back to Co-Op Society</button>
        </div>
      </div>
    `;

    nav.querySelector('#btn-quick-add-exp')?.addEventListener('click', () => {
      document.getElementById('input-exp-title')?.focus();
      document.getElementById('input-exp-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    nav.querySelector('#btn-quick-add-member')?.addEventListener('click', () => {
      openAddExpenseMemberModal();
    });
    return;
  }

  const tabs = [
    { id: 'Dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'Members', icon: '👥', label: 'Members' },
    { id: 'RuleBook', icon: '📖', label: 'Rule Book' },
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
      try {
        sessionStorage.setItem('sumukha_active_tab', activeTab);
      } catch (e) {}
      render();
    });
  });
}

function renderActiveTab() {
  const container = $('main-content');
  if (!container) return;

  // If in Expense Calculator mode, render the full dedicated Expense Splitter
  if (appMode === 'expenses') {
    container.innerHTML = renderExpensesSplitterView();
    attachViewListeners();
    return;
  }

  switch (activeTab) {
    case 'Dashboard':
      container.innerHTML = renderDashboardView();
      break;
    case 'Members':
      container.innerHTML = renderMembersView();
      break;
    case 'RuleBook':
      container.innerHTML = renderRuleBookView();
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
        <td><strong>${escapeHTML(m.name)}</strong> ${(isAdmin && m.is_admin) ? '<span class="badge badge-info">Admin</span>' : ''}</td>
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
      <div class="kpi-card gold">
        <div class="label">One-Time Deposits (FD)</div>
        <div class="value">${formatCurrency(t.totalOneTimePrincipal)}</div>
        <div class="helper">Expected returns: +${formatCurrency(t.totalOneTimeExpectedInterest)}</div>
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
  const oneTimeInvs = (state.data.oneTimeInvs || []).slice().reverse();
  const oneTimeSummary = calculateOneTimeInvestmentsSummary(state.data);
  const oneTimeMembers = state.getOneTimeMembers();

  return `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">👥 Member Directory &amp; Account Profiles</div>
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
            ${members.map(m => {
              return `
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
                    <span class="badge ${(isAdmin && m.is_admin) ? 'badge-ok' : 'badge-neutral'}">
                      ${(isAdmin && m.is_admin) ? '👑 Administrator' : '👤 Member'}
                    </span>
                  </td>
                  ${isAdmin ? `
                    <td style="text-align: center; white-space: nowrap;">
                      <button class="btn-sm btn-gold btn-edit-member" data-id="${m.id}" title="Edit profile and contact details">
                        ✏️ Edit Profile
                      </button>
                      ${(m.id !== 10 && m.id !== 6) ? `
                        <button class="btn-sm btn-danger btn-del-member" data-id="${m.id}" data-name="${escapeHTML(m.name)}" style="margin-left: 6px;" title="Delete Member from Society">
                          🗑️ Delete
                        </button>
                      ` : ''}
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- DEDICATED ONE-TIME INVESTMENTS SECTION ONLY -->
    <div class="panel" style="margin-top: 26px; border-top: 3px solid var(--gold-main);">
      <div class="panel-header">
        <div>
          <div class="panel-title">💎 Dedicated One-Time Investments (Fixed &amp; Term Deposits)</div>
          <div style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
            Standalone lump-sum capital investments with custom interest rates and fixed tenures. Managed independently from recurring monthly savings.
          </div>
        </div>
        ${isAdmin ? `
          <div class="panel-actions">
            <button class="btn-sm btn-gold" id="btn-open-add-onetime-modal">
              ➕ New One-Time Investment
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Quick KPI summary for One-Time Investments -->
      <div class="kpi-grid" style="margin-bottom: 20px;">
        <div class="kpi-card gold">
          <div class="label">Total Capital Deposited</div>
          <div class="value">${formatCurrency(oneTimeSummary.totalPrincipal)}</div>
          <div class="helper">Lump-sum investment pool</div>
        </div>
        <div class="kpi-card info">
          <div class="label">Expected Interest Returns</div>
          <div class="value ok">+${formatCurrency(oneTimeSummary.totalExpectedInterest)}</div>
          <div class="helper">Simple interest at agreed tenure</div>
        </div>
        <div class="kpi-card">
          <div class="label">Total Projected Maturity Value</div>
          <div class="value">${formatCurrency(oneTimeSummary.totalMaturityValue)}</div>
          <div class="helper">Principal + total interest earned</div>
        </div>
        <div class="kpi-card">
          <div class="label">Active Term Deposits</div>
          <div class="value">${oneTimeSummary.activeCount} Active</div>
          <div class="helper">${oneTimeSummary.maturedCount} matured deposits</div>
        </div>
      </div>

      <!-- Dedicated One-Time Investments Table -->
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Investor / Member</th>
              <th>Scheme / Reference</th>
              <th>Deposit Date</th>
              <th class="t-right">Principal (₹)</th>
              <th class="t-right">Interest Rate</th>
              <th class="t-right">Tenure</th>
              <th>Maturity Date</th>
              <th class="t-right">Interest Return (₹)</th>
              <th class="t-right">Maturity Value (₹)</th>
              <th>Status</th>
              ${isAdmin ? '<th style="text-align: center;">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${oneTimeInvs.length > 0 ? oneTimeInvs.map(inv => {
              const ret = calculateOneTimeInvestmentReturn(inv);
              return `
                <tr>
                  <td>
                    <strong>${escapeHTML(inv.investorName)}</strong>
                    ${inv.investorId ? `<span class="badge badge-neutral" style="font-size: 10px; margin-left: 4px;">#${inv.investorId}</span>` : ''}
                  </td>
                  <td>${escapeHTML(inv.title || 'Term Deposit')}</td>
                  <td>${inv.startDate || '—'}</td>
                  <td class="t-right"><strong>${formatCurrency(inv.amount)}</strong></td>
                  <td class="t-right"><span class="badge badge-ok">${inv.interestRate}% p.a.</span></td>
                  <td class="t-right">${inv.tenureMonths} Mo</td>
                  <td>${ret.maturityDate}</td>
                  <td class="t-right ok"><strong>+${formatCurrency(ret.interestEarned)}</strong></td>
                  <td class="t-right"><strong>${formatCurrency(ret.maturityAmount)}</strong></td>
                  <td>
                    <span class="badge ${ret.isMatured ? 'badge-ok' : 'badge-info'}">
                      ${ret.isMatured ? '✓ Matured' : '⏳ Active'}
                    </span>
                  </td>
                  ${isAdmin ? `
                    <td style="text-align: center; white-space: nowrap;">
                      <button class="btn-sm btn-gold btn-edit-onetime" data-id="${inv.id}" title="Edit Investment Parameters">
                        ✏️ Edit
                      </button>
                      <button class="btn-sm btn-danger btn-del-onetime" data-id="${inv.id}" title="Delete Investment Record" style="margin-left: 4px;">
                        🗑️ Delete
                      </button>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${isAdmin ? 11 : 10}" style="text-align: center; padding: 24px; color: var(--text-muted);">
                  💎 No one-time capital investments recorded yet. ${isAdmin ? 'Click "+ New One-Time Investment" above to record a fixed deposit.' : ''}
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Dedicated One-Time Investment Members & Investors Panel (Independent Table) -->
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px dashed var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              <span>👤</span>
              <span>One-Time Investment Members &amp; Investors (${oneTimeMembers.length})</span>
            </div>
            <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
              Independent table of eligible term deposit investors. Adding or removing investors here is strictly separated from society members.
            </div>
          </div>
          ${isAdmin ? `
            <button class="btn-sm btn-primary" id="btn-add-onetime-member">
              ➕ Add Investor / Member
            </button>
          ` : ''}
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Investor / Member Name</th>
                <th>Contact Phone</th>
                <th>Email Address</th>
                <th class="t-right">Active Term Deposits (₹)</th>
                ${isAdmin ? '<th style="text-align: center;">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${oneTimeMembers.map(otm => {
                const myInvs = (state.data.oneTimeInvs || []).filter(inv => inv.investorId === otm.id || inv.investorName === otm.name);
                const totalActive = myInvs.filter(i => i.status !== 'Closed').reduce((sum, i) => sum + Number(i.amount || 0), 0);
                return `
                  <tr>
                    <td>${otm.id}</td>
                    <td><strong>${escapeHTML(otm.name)}</strong></td>
                    <td>${escapeHTML(otm.phone || '—')}</td>
                    <td>${escapeHTML(otm.email || '—')}</td>
                    <td class="t-right">
                      ${totalActive > 0 ? `<strong>${formatCurrency(totalActive)}</strong> <span style="font-size: 11px; color: var(--gold-main);">(${myInvs.length} deposits)</span>` : '<span style="color: var(--text-dim);">₹0</span>'}
                    </td>
                    ${isAdmin ? `
                      <td style="text-align: center; white-space: nowrap;">
                        <button class="btn-sm btn-gold btn-add-deposit-for-member" data-id="${otm.id}" data-name="${escapeHTML(otm.name)}" title="Record a term deposit for this investor">
                          ➕ New Deposit
                        </button>
                        <button class="btn-sm btn-edit-onetime-member" data-id="${otm.id}" title="Edit investor details" style="margin-left: 4px;">
                          ✏️ Edit
                        </button>
                        <button class="btn-sm btn-danger btn-del-onetime-member" data-id="${otm.id}" data-name="${escapeHTML(otm.name)}" title="Delete investor from one-time investments" style="margin-left: 4px;">
                          🗑️ Delete
                        </button>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderRuleBookView() {
  return `
    <div class="ruled-book-wrapper">
      <!-- Quick Action Controls -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 10px;">
            <span>📖</span> Society Rule Book
          </h2>
          <div style="font-size: 13.5px; color: var(--text-muted); margin-top: 4px;">
            Official governing rules, monthly contribution terms, loan eligibility limits, and repayment protocols.
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn-sm btn-gold" id="btn-copy-rulebook" title="Copy full rule book to clipboard">
            📋 Copy Rules
          </button>
          <button class="btn-sm btn-primary" id="btn-print-rulebook" title="Print official rule book or export as PDF">
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      <!-- Ruled Notebook Paper Container -->
      <div class="ruled-paper">
        <!-- Notebook / Charter Header -->
        <div class="ruled-paper-header">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); border: 1.5px solid var(--gold-border); display: flex; align-items: center; justify-content: center; font-size: 22px;">
              🏛️
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--gold-main); font-weight: 800;">
                Sumukha Co-Operative Society
              </div>
              <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.02em;">
                Official Operational Bylaws &amp; Rule Book
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--gold-main); border: 1px solid var(--gold-border); font-size: 12px; font-weight: 700;">
              ⚖️ Standard Governance
            </span>
            <span class="badge" style="background: rgba(37, 99, 235, 0.25); color: #bfdbfe; border: 1px solid rgba(37, 99, 235, 0.4); font-size: 12px; font-weight: 700;">
              💰 ₹1,10,000 Monthly Pool
            </span>
          </div>
        </div>

        <!-- Ruled Paper Body (With Red Double Margin & Ruled Paper Lines) -->
        <div class="ruled-paper-body">

          <!-- Section 1: Monthly Collection -->
          <div class="ruled-section">
            <div class="ruled-section-header">
              <span class="ruled-badge gold">Rule 01</span>
              <h3 class="ruled-section-title">Monthly Collection</h3>
            </div>
            <div class="ruled-lines-group">
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>Every member must pay their agreed monthly contribution before the society meeting/date.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>The total monthly collection is <strong>₹1,10,000</strong>.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>The collected amount will be available for members who want to take the amount at <strong>1% monthly interest</strong>.</div>
              </div>
            </div>
          </div>

          <!-- Section 2: Eligibility to Take Money -->
          <div class="ruled-section">
            <div class="ruled-section-header">
              <span class="ruled-badge gold">Rule 02</span>
              <h3 class="ruled-section-title">Eligibility to Take Money</h3>
            </div>
            <div class="ruled-lines-group">
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>A member must be regular with their monthly contribution.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>Members contributing <strong>₹5,000/month</strong> can have only <strong>1 active/running loan</strong> at a time.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>Members contributing <strong>₹10,000/month</strong> can have up to <strong>2 active/running loans</strong> at the same time.</div>
              </div>
              <div class="ruled-line-row" style="color: var(--danger); font-weight: 600;">
                <span class="ruled-bullet" style="color: var(--danger);">⚠️</span>
                <div>A member cannot exceed their permitted number of running loans.</div>
              </div>
            </div>
          </div>

          <!-- Section 3: Priority / Opportunity -->
          <div class="ruled-section">
            <div class="ruled-section-header">
              <span class="ruled-badge gold">Rule 03</span>
              <h3 class="ruled-section-title">Priority / Opportunity</h3>
            </div>
            <div class="ruled-lines-group">
              <div class="ruled-sub-intro">To make the system fair:</div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>Every month, members who want to take the society amount can participate.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>The amount will be given to the member agreeing to pay <strong>1% monthly interest</strong>, subject to the society’s rules.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>If multiple members are interested, priority can be decided by draw/rotation/bidding, as agreed by all members.</div>
              </div>
              <div class="ruled-line-row" style="color: var(--danger); font-weight: 600;">
                <span class="ruled-bullet" style="color: var(--danger);">⛔</span>
                <div>A member who already has the maximum permitted running loans cannot participate until one of their existing loans is closed.</div>
              </div>
            </div>
          </div>

          <!-- Section 4: Special Benefit for ₹10,000 Members -->
          <div class="ruled-section">
            <div class="ruled-section-header">
              <span class="ruled-badge gold">Rule 04</span>
              <h3 class="ruled-section-title">Special Benefit for ₹10,000 Members</h3>
            </div>
            <div class="ruled-lines-group">
              <div class="ruled-sub-intro">Because ₹10,000 members contribute twice as much as ₹5,000 members:</div>
              <div class="ruled-benefit-grid">
                <div class="ruled-benefit-card highlight">
                  <span class="member-tier">₹10,000 member</span>
                  <span class="loan-opps">→ 2 opportunities for active loans</span>
                </div>
                <div class="ruled-benefit-card">
                  <span class="member-tier">₹5,000 member</span>
                  <span class="loan-opps">→ 1 opportunity for an active loan</span>
                </div>
              </div>

              <!-- Example Box -->
              <div class="ruled-example-container">
                <div class="ruled-example-header">
                  <span>📌</span> Example:
                </div>
                <div class="ruled-example-grid">
                  <!-- Person A -->
                  <div class="ruled-example-card">
                    <div class="ruled-example-person" style="display: flex; justify-content: space-between; align-items: center;">
                      <span>Person A</span>
                      <span class="badge" style="background: var(--gold-tint); color: var(--gold-dark); border: 1px solid var(--gold-border); font-size: 11.5px; font-weight: bold;">₹10,000 contribution</span>
                    </div>
                    <div class="ruled-loan-item active">
                      <span>Loan 1: Active</span>
                      <span>✅</span>
                    </div>
                    <div class="ruled-loan-item active">
                      <span>Loan 2: Active</span>
                      <span>✅</span>
                    </div>
                    <div class="ruled-loan-item not-allowed">
                      <span>Loan 3: Not allowed</span>
                      <span>❌</span>
                    </div>
                  </div>

                  <!-- Person B -->
                  <div class="ruled-example-card">
                    <div class="ruled-example-person" style="display: flex; justify-content: space-between; align-items: center;">
                      <span>Person B</span>
                      <span class="badge" style="background: var(--navy-light); color: var(--navy-blue); border: 1px solid rgba(37,99,235,0.3); font-size: 11.5px; font-weight: bold;">₹5,000 contribution</span>
                    </div>
                    <div class="ruled-loan-item active">
                      <span>Loan 1: Active</span>
                      <span>✅</span>
                    </div>
                    <div class="ruled-loan-item not-allowed">
                      <span>Loan 2: Not allowed until Loan 1 is completely closed</span>
                      <span>❌</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 5: Closing a Loan -->
          <div class="ruled-section" style="margin-bottom: 0;">
            <div class="ruled-section-header">
              <span class="ruled-badge gold">Rule 05</span>
              <h3 class="ruled-section-title">Closing a Loan</h3>
            </div>
            <div class="ruled-lines-group">
              <div class="ruled-sub-intro">Once a member completely repays the principal amount ( min 2 month to be paid )and applicable interest:</div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>Their loan is considered closed.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>They can again use their available loan opportunity.</div>
              </div>
              <div class="ruled-line-row">
                <span class="ruled-bullet">•</span>
                <div>For a ₹10,000 member, if one of two loans is closed, they can take another loan while the other remains active.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function handleCopyRuleBook() {
  const rulesText = `SUMUKHA CO-OPERATIVE SOCIETY - OFFICIAL RULE BOOK

Monthly Collection
Every member must pay their agreed monthly contribution before the society meeting/date.
The total monthly collection is ₹1,10,000.
The collected amount will be available for members who want to take the amount at 1% monthly interest.

Eligibility to Take Money
A member must be regular with their monthly contribution.
Members contributing ₹5,000/month can have only 1 active/running loan at a time.
Members contributing ₹10,000/month can have up to 2 active/running loans at the same time.
A member cannot exceed their permitted number of running loans.

Priority / Opportunity
To make the system fair:
Every month, members who want to take the society amount can participate.
The amount will be given to the member agreeing to pay 1% monthly interest, subject to the society’s rules.
If multiple members are interested, priority can be decided by draw/rotation/bidding, as agreed by all members.
A member who already has the maximum permitted running loans cannot participate until one of their existing loans is closed.

Special Benefit for ₹10,000 Members
Because ₹10,000 members contribute twice as much as ₹5,000 members:
₹10,000 member → 2 opportunities for active loans
₹5,000 member → 1 opportunity for an active loan

Example:
Person A – ₹10,000 contribution
Loan 1: Active ✅
Loan 2: Active ✅
Loan 3: Not allowed ❌

Person B – ₹5,000 contribution
Loan 1: Active ✅
Loan 2: Not allowed until Loan 1 is completely closed ❌

Closing a Loan
Once a member completely repays the principal amount ( min 2 month to be paid )and applicable interest:
Their loan is considered closed.
They can again use their available loan opportunity.
For a ₹10,000 member, if one of two loans is closed, they can take another loan while the other remains active.`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(rulesText).then(() => {
      showToast('Official Rule Book copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Rule Book copied!', 'info');
    });
  } else {
    showToast('Rule Book text selected', 'info');
  }
}

function renderContributionsView() {
  const isAdmin = state.isAdmin();
  const matrix = calculateContributionsMatrix(state.data);
  const curMonth = getCurrentMonth();
  const contribs = (state.data.contribs || []).slice().reverse();

  return `
    <!-- One-Time Investment Clarification Notice -->
    <div class="quick-action-bar">
      <div style="font-size: 13px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">💡</span>
        <span>Looking for <strong>One-Time Investments / Fixed Deposits</strong>? Those are one-time capital deposits with fixed interest/tenure, tracked separately from recurring monthly dues.</span>
      </div>
      <button class="btn-sm btn-gold" id="btn-goto-onetime-inv">
        💎 Manage One-Time Investments
      </button>
    </div>

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
      <div class="pdf-export-row">
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
  const oneTimeInvs = (state.data.oneTimeInvs || []).slice().reverse();
  const oneTimeSummary = calculateOneTimeInvestmentsSummary(state.data);

  if (invSubView === 'expenses') {
    return renderExpensesSplitterView();
  }

  return `
    <!-- Switcher between Investment Section and Expense Calculator & Splitter -->
    <div class="view-subnav">
      <button class="view-subnav-btn ${invSubView === 'investments' ? 'active' : ''}" id="btn-subnav-investments">
        <span>📈</span> Society &amp; One-Time Investments
      </button>
      <button class="view-subnav-btn ${invSubView === 'expenses' ? 'active' : ''}" id="btn-subnav-expenses">
        <span>🧾</span> Expense Calculator &amp; Splitter
      </button>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card gold">
        <div class="label">Available Society Cash</div>
        <div class="value">${formatCurrency(totals.cashInHand)}</div>
        <div class="helper">Net liquid reserves in hand</div>
      </div>
      <div class="kpi-card">
        <div class="label">Society Portfolio Value</div>
        <div class="value">${formatCurrency(totals.totalInvestmentValue)}</div>
        <div class="helper">Cost: ${formatCurrency(totals.totalInvestedCost)} (${totals.investmentGain >= 0 ? '+' : ''}${formatCurrency(totals.investmentGain)})</div>
      </div>
      <div class="kpi-card info">
        <div class="label">One-Time Investments Pool</div>
        <div class="value">${formatCurrency(oneTimeSummary.totalPrincipal)}</div>
        <div class="helper">Returns: +${formatCurrency(oneTimeSummary.totalExpectedInterest)} (${oneTimeSummary.activeCount} Active)</div>
      </div>
    </div>

    <!-- Record One-Time Investment (Admin Only) -->
    <div class="panel admin-only">
      <div class="panel-header">
        <div>
          <div class="panel-title">💎 Record One-Time Investment (Fixed / Term Deposit)</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            One-time lump-sum deposit with fixed interest rate and maturity tenure (independent of monthly recurring contributions).
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Select Investor / Member</label>
          <select id="select-onetime-member">
            ${state.data.members.map(m => `<option value="${m.id}">👤 ${escapeHTML(m.name)} (Member #${m.id})</option>`).join('')}
            <option value="external">🌐 External / Society Direct Deposit</option>
          </select>
        </div>
        <div class="form-group" id="group-onetime-ext-name" style="display: none;">
          <label>Investor Full Name</label>
          <input type="text" id="input-onetime-ext-name" placeholder="Enter investor full name">
        </div>
        <div class="form-group">
          <label>Investment Scheme / Title</label>
          <input type="text" id="input-onetime-title" placeholder="e.g. 1-Year Fixed Capital Deposit" value="1-Year Fixed Capital Growth Deposit">
        </div>
        <div class="form-group">
          <label>One-Time Amount (₹)</label>
          <input type="number" id="input-onetime-amt" placeholder="e.g. 50000" step="1000" value="50000">
        </div>
        <div class="form-group">
          <label>Interest Rate (% per annum)</label>
          <input type="number" id="input-onetime-rate" value="8.0" step="0.1" min="0" max="100">
          <div class="preset-pills-row">
            <span class="preset-pill onetime-rate-pill" data-rate="6.0">6%</span>
            <span class="preset-pill onetime-rate-pill" data-rate="7.5">7.5%</span>
            <span class="preset-pill onetime-rate-pill active" data-rate="8.0">8%</span>
            <span class="preset-pill onetime-rate-pill" data-rate="9.0">9%</span>
            <span class="preset-pill onetime-rate-pill" data-rate="10.0">10%</span>
            <span class="preset-pill onetime-rate-pill" data-rate="12.0">12%</span>
          </div>
        </div>
        <div class="form-group">
          <label>Time Period / Tenure (Months)</label>
          <input type="number" id="input-onetime-tenure" value="12" min="1" max="360">
          <div class="preset-pills-row">
            <span class="preset-pill onetime-tenure-pill" data-tenure="6">6 Mo</span>
            <span class="preset-pill onetime-tenure-pill active" data-tenure="12">12 Mo</span>
            <span class="preset-pill onetime-tenure-pill" data-tenure="24">24 Mo</span>
            <span class="preset-pill onetime-tenure-pill" data-tenure="36">36 Mo</span>
            <span class="preset-pill onetime-tenure-pill" data-tenure="60">60 Mo</span>
          </div>
        </div>
        <div class="form-group">
          <label>Investment Start Date</label>
          <input type="date" id="input-onetime-date" value="${getTodayDate()}">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
          <label>Optional Terms &amp; Notes</label>
          <input type="text" id="input-onetime-notes" placeholder="e.g. Fixed tenure capital deposit, paid at maturity">
        </div>
      </div>

      <!-- Live Calculation Projection Box -->
      <div class="preview-calc-box" id="onetime-calc-preview">
        <div class="preview-calc-item">
          <div class="calc-label">One-Time Principal</div>
          <div class="calc-val" id="prev-principal">₹50,000</div>
        </div>
        <div class="preview-calc-item">
          <div class="calc-label">Calculated Interest</div>
          <div class="calc-val ok" id="prev-interest">+₹4,000</div>
        </div>
        <div class="preview-calc-item">
          <div class="calc-label">Projected Maturity Value</div>
          <div class="calc-val" id="prev-maturity">₹54,000</div>
        </div>
        <div class="preview-calc-item">
          <div class="calc-label">Maturity Date</div>
          <div class="calc-val" id="prev-maturity-date">${addMonths(getTodayDate(), 12)}</div>
        </div>
      </div>

      <div style="margin-top: 16px;">
        <button class="btn-primary" id="btn-add-onetime-inv" style="width: 100%;">
          💎 Record One-Time Investment
        </button>
      </div>
    </div>

    <!-- One-Time Investments Portfolio Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">💎 One-Time Fixed Deposits &amp; Term Investments</div>
        <span class="badge badge-info">${oneTimeInvs.length} Recorded</span>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Investor / Member</th>
              <th>Scheme / Title</th>
              <th>Start Date</th>
              <th class="t-right">Principal (₹)</th>
              <th class="t-right">Interest Rate</th>
              <th class="t-right">Tenure</th>
              <th>Maturity Date</th>
              <th class="t-right">Expected Return (₹)</th>
              <th>Status</th>
              ${isAdmin ? '<th style="text-align: center;">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${oneTimeInvs.map(inv => {
              const ret = calculateOneTimeInvestmentReturn(inv);
              return `
                <tr>
                  <td>
                    <strong>${escapeHTML(inv.investorName)}</strong>
                    ${inv.investorId ? `<span class="badge badge-neutral" style="font-size: 10px; margin-left: 4px;">#${inv.investorId}</span>` : ''}
                  </td>
                  <td>${escapeHTML(inv.title || 'Term Deposit')}</td>
                  <td>${inv.startDate || '—'}</td>
                  <td class="t-right"><strong>${formatCurrency(inv.amount)}</strong></td>
                  <td class="t-right"><span class="badge badge-ok">${inv.interestRate}% p.a.</span></td>
                  <td class="t-right">${inv.tenureMonths} Months</td>
                  <td>${ret.maturityDate}</td>
                  <td class="t-right">
                    <strong>${formatCurrency(ret.maturityAmount)}</strong>
                    <div style="font-size: 11px; color: var(--gold-main); font-weight: 600;">+${formatCurrency(ret.interestEarned)} int</div>
                  </td>
                  <td>
                    <span class="badge ${ret.isMatured ? 'badge-ok' : 'badge-info'}">
                      ${ret.isMatured ? '✓ Matured' : '⏳ Active'}
                    </span>
                  </td>
                  ${isAdmin ? `
                    <td style="text-align: center; white-space: nowrap;">
                      <button class="btn-sm btn-gold btn-edit-onetime" data-id="${inv.id}" title="Edit One-Time Investment details">
                        ✏️ Edit
                      </button>
                      <button class="btn-sm btn-danger btn-del-onetime" data-id="${inv.id}" title="Delete Investment">
                        ✕
                      </button>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('') || '<tr><td colspan="10" style="text-align:center;">No one-time investments recorded yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Existing Add Society Asset Form (Admin only) -->
    <div class="panel admin-only">
      <div class="panel-header">
        <div class="panel-title">📈 Add Society Portfolio Asset</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Asset Name</label>
          <input type="text" id="input-inv-name" placeholder="e.g. SBI Fixed Deposit, Gold ETF">
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
          <button class="btn-primary" id="btn-add-inv" style="width: 100%;">Record Asset</button>
        </div>
      </div>
    </div>

    <!-- Active Portfolio Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">💼 Society Portfolio Assets &amp; Appraisals</div>
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
            }).join('') || '<tr><td colspan="7" style="text-align:center;">No society assets recorded yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Month-Wise Investments Aggregation (Matching mwise) -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">📅 Month-Wise Asset Aggregation</div>
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

function renderExpensesSplitterView() {
  const isAdmin = state.isAdmin();
  const expMembers = state.getExpenseMembers();
  const expSummary = calculateExpensesSummary(state.data);
  const expenses = (state.data.expenses || []).slice().reverse();

  return `
    <!-- Sub-Navigation Switcher -->
    <div class="view-subnav">
      <button class="view-subnav-btn ${invSubView === 'investments' ? 'active' : ''}" id="btn-subnav-investments">
        <span>📈</span> Society &amp; One-Time Investments
      </button>
      <button class="view-subnav-btn ${invSubView === 'expenses' ? 'active' : ''}" id="btn-subnav-expenses">
        <span>🧾</span> Expense Calculator &amp; Splitter
      </button>
    </div>

    <!-- Quick Action Bar for Expense Tracker -->
    <div class="quick-action-bar">
      <div style="font-size: 13px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">👥</span>
        <span><strong>Friends Expense Calculator &amp; Splitter:</strong> Independent ledger for tracking and settling friends' group expenses, trips, dinners, and shared activities.</span>
      </div>
      <div class="quick-action-btns">
        <button class="btn-sm btn-gold" id="btn-whatsapp-expense-summary">
          💬 WhatsApp Group Summary
        </button>
        <button class="btn-sm btn-primary" id="btn-export-expense-pdf">
          📄 Export PDF Statement
        </button>
        <button class="btn-sm" id="btn-copy-expense-summary">
          📋 Copy Summary
        </button>
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-grid">
      <div class="kpi-card gold">
        <div class="label">Total Group Expenses</div>
        <div class="value">${formatCurrency(expSummary.totalExpenseAmount)}</div>
        <div class="helper">${expSummary.expenseCount} entries recorded</div>
      </div>
      <div class="kpi-card info">
        <div class="label">Total Outlays by Friends</div>
        <div class="value">${formatCurrency(expSummary.memberPaidAmount || expSummary.totalExpenseAmount)}</div>
        <div class="helper">Shared payments across group</div>
      </div>
      <div class="kpi-card ${expSummary.simplifiedDebts.length > 0 ? 'warn' : 'ok'}">
        <div class="label">Pending Transfers</div>
        <div class="value">${expSummary.simplifiedDebts.length} Transfers</div>
        <div class="helper">${expSummary.simplifiedDebts.length > 0 ? 'Direct minimal settlements' : 'All accounts settled'}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Friends in Group</div>
        <div class="value">${expMembers.length} Members</div>
        <div class="helper">Independent from society</div>
      </div>
    </div>

    <!-- Record New Expense Panel -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">🧾 Record &amp; Split Group Expense</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Add an expense incurred by any friend and automatically calculate fair shares.
          </div>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Expense Description / Title</label>
          <input type="text" id="input-exp-title" placeholder="e.g. Dinner at Empire, Weekend Trip Fuel, Movie Tickets" required>
        </div>
        <div class="form-group">
          <label>Total Amount (₹)</label>
          <input type="number" id="input-exp-amt" placeholder="e.g. 2600" min="1" step="50" required>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="input-exp-date" value="${getTodayDate()}">
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="select-exp-category">
            <option>Food &amp; Dining</option>
            <option>Travel &amp; Fuel</option>
            <option>Entertainment &amp; Outings</option>
            <option>Groceries &amp; Supplies</option>
            <option>Stay &amp; Hotels</option>
            <option>Administrative</option>
            <option>Miscellaneous</option>
          </select>
        </div>
        <div class="form-group">
          <label>Paid By (Friend)</label>
          <select id="select-exp-paid-by">
            ${expMembers.map(m => `<option value="${m.id}">👤 ${escapeHTML(m.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Split Method</label>
          <select id="select-exp-split-type">
            <option value="equal">⚖️ Equal Split (All ${expMembers.length} Friends)</option>
            <option value="selected">👥 Equal Split (Select Friends)</option>
          </select>
        </div>

        <!-- Selected Members Checkboxes -->
        <div class="form-group" id="group-exp-participants" style="grid-column: 1 / -1; display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-weight: bold; font-size: 12.5px;">Select Participating Friends:</label>
            <div style="font-size: 11.5px; display: flex; gap: 8px;">
              <a href="javascript:void(0)" id="btn-exp-select-all" style="color: var(--navy-blue); font-weight: 600;">Select All</a> ·
              <a href="javascript:void(0)" id="btn-exp-deselect-all" style="color: var(--text-muted);">Deselect All</a>
            </div>
          </div>
          <div class="split-checkbox-grid">
            ${expMembers.map(m => `
              <label class="split-checkbox-item">
                <input type="checkbox" class="cb-exp-member" value="${m.id}" checked>
                <span>${escapeHTML(m.name)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group" style="grid-column: 1 / -1;">
          <label>Optional Notes</label>
          <input type="text" id="input-exp-notes" placeholder="e.g. Paid via Google Pay, bill verified">
        </div>
      </div>

      <!-- Live Split Preview Box -->
      <div class="preview-calc-box" id="exp-calc-preview">
        <div class="preview-calc-item">
          <div class="calc-label">Total Amount</div>
          <div class="calc-val" id="prev-exp-total">₹0</div>
        </div>
        <div class="preview-calc-item">
          <div class="calc-label">Participants Count</div>
          <div class="calc-val" id="prev-exp-count">${expMembers.length} Friends</div>
        </div>
        <div class="preview-calc-item">
          <div class="calc-label">Calculated Share Per Person</div>
          <div class="calc-val ok" id="prev-exp-per-person">₹0 / person</div>
        </div>
      </div>

      <div style="margin-top: 16px;">
        <button class="btn-primary" id="btn-add-expense" style="width: 100%;">
          🧾 Record &amp; Distribute Split
        </button>
      </div>
    </div>

    <!-- Simplified Debt Settlements (Who Owes Whom) -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">⚖️ Simplified Debt Settlements (Who Owes Whom)</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Optimized minimal payments algorithm to settle all balances with the fewest cash transfers.
          </div>
        </div>
      </div>
      <div>
        ${expSummary.simplifiedDebts.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${expSummary.simplifiedDebts.map(d => `
              <div class="debt-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; flex-wrap: wrap; gap: 10px;">
                <div class="debt-info" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <span style="font-size: 20px;">👤</span>
                  <div>
                    <strong>${escapeHTML(d.fromName)}</strong>
                    ${d.fromPhone ? `<div style="font-size: 11px; color: var(--text-muted);">📱 ${escapeHTML(d.fromPhone)}</div>` : ''}
                  </div>
                  <span class="debt-arrow" style="font-weight: bold; color: var(--danger); margin: 0 4px;">➔ owes ➔</span>
                  <span style="font-size: 20px;">👤</span>
                  <div>
                    <strong>${escapeHTML(d.toName)}</strong>
                    ${d.toPhone ? `<div style="font-size: 11px; color: var(--text-muted);">📱 ${escapeHTML(d.toPhone)}</div>` : ''}
                  </div>
                  <span class="badge badge-warn" style="font-size: 15px; font-weight: 800; margin-left: 6px;">
                    ${formatCurrency(d.amount)}
                  </span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <button class="btn-sm btn-gold btn-remind-debtor" 
                    data-fromname="${escapeHTML(d.fromName)}"
                    data-fromphone="${escapeHTML(d.fromPhone || '')}"
                    data-toname="${escapeHTML(d.toName)}"
                    data-tophone="${escapeHTML(d.toPhone || '')}"
                    data-amount="${d.amount}"
                    title="Send WhatsApp reminder or copy payment text">
                    🔔 Remind
                  </button>
                  ${isAdmin ? `
                    <button class="btn-sm btn-primary btn-settle-debt" 
                      data-fromid="${d.fromId}" 
                      data-fromname="${escapeHTML(d.fromName)}" 
                      data-toid="${d.toId}" 
                      data-toname="${escapeHTML(d.toName)}" 
                      data-amount="${d.amount}">
                      💸 Mark Settled
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 28px; color: var(--text-muted);">
            <div style="font-size: 26px; margin-bottom: 6px;">🎉</div>
            <strong>All expenses are completely balanced!</strong>
            <div style="font-size: 12.5px; margin-top: 4px;">No outstanding debts or settlements between friends.</div>
          </div>
        `}
      </div>
    </div>

    <!-- Member Balances & Participation Table -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">👥 Friends Balances &amp; Split Participation</div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Friend / Member</th>
              <th>Contact Phone</th>
              <th class="t-right">Total Paid by Friend (₹)</th>
              <th class="t-right">Fair Share Owed (₹)</th>
              <th class="t-right">Net Balance</th>
              <th>Settlement Status</th>
              <th style="text-align: center;">Quick Action</th>
            </tr>
          </thead>
          <tbody>
            ${expSummary.memberBalances.map(b => {
              const net = Math.round(b.netBalance);
              return `
                <tr>
                  <td><strong>${escapeHTML(b.name)}</strong></td>
                  <td>${escapeHTML(b.phone || '—')}</td>
                  <td class="t-right">${formatCurrency(b.totalPaid)}</td>
                  <td class="t-right">${formatCurrency(b.totalShare)}</td>
                  <td class="t-right">
                    <strong style="${net > 0 ? 'color: var(--ok);' : net < 0 ? 'color: var(--danger);' : ''}">${net > 0 ? '+' : ''}${formatCurrency(net)}</strong>
                  </td>
                  <td>
                    ${net > 0 ? `
                      <span class="badge badge-creditor">Gets back ${formatCurrency(net)}</span>
                    ` : net < 0 ? `
                      <span class="badge badge-debtor">Owes ${formatCurrency(Math.abs(net))}</span>
                    ` : `
                      <span class="badge badge-neutral">✓ Settled (₹0)</span>
                    `}
                  </td>
                  <td style="text-align: center;">
                    ${net < 0 ? `
                      <button class="btn-sm btn-gold btn-remind-single-balance"
                        data-name="${escapeHTML(b.name)}"
                        data-phone="${escapeHTML(b.phone || '')}"
                        data-amount="${Math.abs(net)}"
                        title="Send WhatsApp reminder for this balance">
                        🔔 Remind
                      </button>
                    ` : '<span style="color: var(--text-dim); font-size: 11.5px;">—</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recorded Expenses Ledger -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">📜 Expense Ledger &amp; History</div>
        <span class="badge badge-info">${expenses.length} Records</span>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description &amp; Attribution</th>
              <th>Category</th>
              <th>Paid By</th>
              <th class="t-right">Total Amount (₹)</th>
              <th>Split Summary</th>
              <th style="text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${e.date}</td>
                <td>
                  <strong>${escapeHTML(e.title)}</strong>
                  <div class="expense-meta-attribution">
                    <span>👤 Added by: <strong>${escapeHTML(e.createdBy?.name || 'Friend')}</strong></span>
                    ${e.updatedBy ? `<span>· <strong style="color: var(--gold-main);">✏️ Updated by ${escapeHTML(e.updatedBy.name)}</strong></span>` : ''}
                  </div>
                </td>
                <td><span class="badge badge-info">${escapeHTML(e.category || 'General')}</span></td>
                <td>${escapeHTML(e.paidByName || 'Friend')}</td>
                <td class="t-right"><strong>${formatCurrency(e.amount)}</strong></td>
                <td>
                  <span style="font-size: 12px; color: var(--text-muted);">
                    ${(e.participants && e.participants.length) ? `${e.participants.length} friends (₹${Math.round(e.amount / e.participants.length)} each)` : 'All friends'}
                  </span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                  <button class="btn-sm btn-gold btn-edit-expense" data-id="${e.id}" title="Edit Expense">
                    ✏️ Edit
                  </button>
                  ${isAdmin ? `
                    <button class="btn-sm btn-danger btn-del-expense" data-id="${e.id}" title="Delete Expense (Admin only)" style="margin-left: 4px;">
                      🗑️ Delete
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;">No expenses recorded yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Expense Splitter Members & Participants Panel (Independent Friends Table) -->
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">👥 Friends &amp; Expense Splitters (${expMembers.length})</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Independent roster of friends participating in expense sharing. Separate from Co-Op Society members table.
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn-sm btn-primary" id="btn-add-expense-member">
            ➕ Add Friend / Splitter
          </button>
        </div>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Friend Name</th>
              <th>Contact Phone</th>
              <th>Email Address</th>
              ${isAdmin ? '<th style="text-align: center;">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${expMembers.map(m => `
              <tr>
                <td>${m.id}</td>
                <td><strong>${escapeHTML(m.name)}</strong></td>
                <td>${escapeHTML(m.phone || '—')}</td>
                <td>${escapeHTML(m.email || '—')}</td>
                ${isAdmin ? `
                  <td style="text-align: center;">
                    <button class="btn-sm btn-danger btn-del-expense-member" data-id="${m.id}" data-name="${escapeHTML(m.name)}" title="Remove friend from expense calculator (Admin only)">
                      🗑️ Delete
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
              Automated email reminders, WhatsApp notices, and bulk payment dispatches are configured and sent exclusively by Society Administration.
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

  // Quick navigation to One-Time Investments
  $('btn-goto-onetime-inv')?.addEventListener('click', () => {
    activeTab = 'Investments';
    invSubView = 'investments';
    try {
      sessionStorage.setItem('sumukha_active_tab', 'Investments');
      sessionStorage.setItem('sumukha_inv_subview', 'investments');
    } catch (e) {}
    render();
  });

  // Sub-Navigation Switcher (Investments <-> Expense Calculator)
  $('btn-subnav-investments')?.addEventListener('click', () => {
    invSubView = 'investments';
    sessionStorage.setItem('sumukha_inv_subview', 'investments');
    renderActiveTab();
  });
  $('btn-subnav-expenses')?.addEventListener('click', () => {
    invSubView = 'expenses';
    sessionStorage.setItem('sumukha_inv_subview', 'expenses');
    renderActiveTab();
  });

  // One-Time Investments Live Calculator Preview Handlers (Available to all)
  function updateOneTimePreview() {
    const amt = Number($('input-onetime-amt')?.value || 0);
    const rate = Number($('input-onetime-rate')?.value || 0);
    const tenure = Number($('input-onetime-tenure')?.value || 12);
    const dt = $('input-onetime-date')?.value || getTodayDate();
    const ret = calculateOneTimeInvestmentReturn({ amount: amt, interestRate: rate, tenureMonths: tenure, startDate: dt });
    if ($('prev-principal')) $('prev-principal').textContent = formatCurrency(ret.principal);
    if ($('prev-interest')) $('prev-interest').textContent = '+' + formatCurrency(ret.interestEarned);
    if ($('prev-maturity')) $('prev-maturity').textContent = formatCurrency(ret.maturityAmount);
    if ($('prev-maturity-date')) $('prev-maturity-date').textContent = ret.maturityDate;
  }

  $('input-onetime-amt')?.addEventListener('input', updateOneTimePreview);
  $('input-onetime-rate')?.addEventListener('input', updateOneTimePreview);
  $('input-onetime-tenure')?.addEventListener('input', updateOneTimePreview);
  $('input-onetime-date')?.addEventListener('input', updateOneTimePreview);

  $('select-onetime-member')?.addEventListener('change', (e) => {
    const groupExt = $('group-onetime-ext-name');
    if (groupExt) groupExt.style.display = e.target.value === 'external' ? 'block' : 'none';
  });

  document.querySelectorAll('.onetime-rate-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.onetime-rate-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if ($('input-onetime-rate')) {
        $('input-onetime-rate').value = pill.dataset.rate;
        updateOneTimePreview();
      }
    });
  });

  document.querySelectorAll('.onetime-tenure-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.onetime-tenure-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if ($('input-onetime-tenure')) {
        $('input-onetime-tenure').value = pill.dataset.tenure;
        updateOneTimePreview();
      }
    });
  });

  // Expense Calculator & Splitter Live Preview Handlers (Available to all)
  function updateExpensePreview() {
    const amt = Number($('input-exp-amt')?.value || 0);
    const splitType = $('select-exp-split-type')?.value || 'equal';
    const expMembers = state.getExpenseMembers();
    let count = expMembers.length;
    if (splitType === 'selected') {
      count = document.querySelectorAll('.cb-exp-member:checked').length || 1;
    }
    const perPerson = Math.round(amt / count);
    if ($('prev-exp-total')) $('prev-exp-total').textContent = formatCurrency(amt);
    if ($('prev-exp-count')) $('prev-exp-count').textContent = `${count} Friends`;
    if ($('prev-exp-per-person')) $('prev-exp-per-person').textContent = `${formatCurrency(perPerson)} / person`;
  }

  $('input-exp-amt')?.addEventListener('input', updateExpensePreview);
  $('select-exp-split-type')?.addEventListener('change', (e) => {
    const groupPart = $('group-exp-participants');
    if (groupPart) groupPart.style.display = e.target.value === 'selected' ? 'block' : 'none';
    updateExpensePreview();
  });

  document.querySelectorAll('.cb-exp-member').forEach(cb => {
    cb.addEventListener('change', updateExpensePreview);
  });

  $('btn-exp-select-all')?.addEventListener('click', () => {
    document.querySelectorAll('.cb-exp-member').forEach(cb => { cb.checked = true; });
    updateExpensePreview();
  });

  $('btn-exp-deselect-all')?.addEventListener('click', () => {
    document.querySelectorAll('.cb-exp-member').forEach(cb => { cb.checked = false; });
    updateExpensePreview();
  });

  // Expense Recording & Editing (OPEN TO ALL USERS)
  $('btn-add-expense')?.addEventListener('click', handleAddExpense);

  document.querySelectorAll('.btn-edit-expense').forEach(b => {
    b.addEventListener('click', (e) => {
      openEditExpenseModal(Number(e.currentTarget.dataset.id));
    });
  });

  // Expense Calculator Members Quick Add (OPEN TO ALL USERS)
  $('btn-add-expense-member')?.addEventListener('click', openAddExpenseMemberModal);

  document.querySelectorAll('.btn-settle-debt').forEach(b => {
    b.addEventListener('click', (e) => {
      handleSettleDebt(e.currentTarget);
    });
  });

  // Expense Reminders & Sharing Handlers
  $('btn-whatsapp-expense-summary')?.addEventListener('click', handleWhatsAppExpenseSummary);
  $('btn-export-expense-pdf')?.addEventListener('click', () => {
    exportExpensesStatementPDF(state.data);
  });
  $('btn-copy-expense-summary')?.addEventListener('click', handleCopyExpenseSummary);

  document.querySelectorAll('.btn-remind-debtor').forEach(b => {
    b.addEventListener('click', (e) => {
      const { fromname, fromphone, toname, tophone, amount } = e.currentTarget.dataset;
      openExpenseReminderModal({
        fromName: fromname,
        fromPhone: fromphone,
        toName: toname,
        toPhone: tophone,
        amount: Number(amount)
      });
    });
  });

  document.querySelectorAll('.btn-remind-single-balance').forEach(b => {
    b.addEventListener('click', (e) => {
      const { name, phone, amount } = e.currentTarget.dataset;
      openExpenseReminderModal({
        fromName: name,
        fromPhone: phone,
        toName: 'the group',
        toPhone: '',
        amount: Number(amount)
      });
    });
  });

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

  // Rule Book Handlers (Available to everyone)
  $('btn-print-rulebook')?.addEventListener('click', () => {
    window.print();
  });
  $('btn-copy-rulebook')?.addEventListener('click', handleCopyRuleBook);

  // =========================================================================
  // ADMINISTRATOR RESTRICTED HANDLERS
  // =========================================================================
  if (isAdmin) {
    // Contributions handlers
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
      state.updateMonthlyDefault(Number(e.target.value) || 10000);
    });
    document.querySelectorAll('.btn-edit-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        openEditMemberModal(id);
      });
    });
    document.querySelectorAll('.btn-del-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        handleDeleteMember(Number(e.currentTarget.dataset.id), e.currentTarget.dataset.name);
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

    // One-Time Investments Handlers (Admin Only)
    $('btn-open-add-onetime-modal')?.addEventListener('click', () => {
      openAddOneTimeInvestmentModal();
    });
    $('btn-add-onetime-inv')?.addEventListener('click', handleAddOneTimeInvestment);

    document.querySelectorAll('.btn-edit-onetime').forEach(b => {
      b.addEventListener('click', (e) => {
        openEditOneTimeInvestmentModal(Number(e.currentTarget.dataset.id));
      });
    });

    document.querySelectorAll('.btn-del-onetime').forEach(b => {
      b.addEventListener('click', (e) => {
        handleDeleteOneTimeInvestment(Number(e.currentTarget.dataset.id));
      });
    });

    document.querySelectorAll('.btn-edit-member-onetime').forEach(b => {
      b.addEventListener('click', (e) => {
        openAddOneTimeInvestmentModal(Number(e.currentTarget.dataset.mid), e.currentTarget.dataset.mname);
      });
    });

    // Dedicated One-Time Investment Members Handlers (Admin Only)
    $('btn-add-onetime-member')?.addEventListener('click', openAddOneTimeMemberModal);

    document.querySelectorAll('.btn-add-deposit-for-member').forEach(b => {
      b.addEventListener('click', (e) => {
        openAddOneTimeInvestmentModal(Number(e.currentTarget.dataset.id), e.currentTarget.dataset.name);
      });
    });

    document.querySelectorAll('.btn-edit-onetime-member').forEach(b => {
      b.addEventListener('click', (e) => {
        openEditOneTimeMemberModal(Number(e.currentTarget.dataset.id));
      });
    });

    document.querySelectorAll('.btn-del-onetime-member').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteOneTimeMember(Number(e.currentTarget.dataset.id), e.currentTarget.dataset.name);
      });
    });

    // Expense Tracker Deletion Handlers (ADMIN ONLY)
    document.querySelectorAll('.btn-del-expense').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteExpense(Number(e.currentTarget.dataset.id));
      });
    });

    document.querySelectorAll('.btn-del-expense-member').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteExpenseMember(Number(e.currentTarget.dataset.id), e.currentTarget.dataset.name);
      });
    });

    // Society Portfolio Assets Handlers (Admin Only)
    $('btn-add-inv')?.addEventListener('click', handleAddInvestment);
    document.querySelectorAll('.input-inv-val').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = Number(e.target.dataset.id);
        const val = Number(e.target.value) || 0;
        await state.updateInvestment(id, val);
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
}

function handleContribMemberChange() {
  const mId = Number($('select-contrib-member').value);
  const m = state.data.members.find(x => x.id === mId);
  if (m) {
    $('input-contrib-amt').value = getMemberCommitment(m, state.data.monthly);
  }
}

async function handleAddContrib() {
  const mId = Number($('select-contrib-member').value);
  const month = $('input-contrib-month').value;
  const amt = Number($('input-contrib-amt').value);

  if (!amt || amt <= 0) return alert('Please enter a valid contribution amount.');

  await state.addContribution({
    m: mId,
    month,
    amt,
    date: getTodayDate()
  });

  alert('Contribution recorded and saved to database!');
}

async function handleBatchMonthContribs() {
  const month = $('input-contrib-month').value || getCurrentMonth();
  const res = await state.addBatchMonthlyContributions(month);

  if (res.count === 0) {
    alert(`All members already have contributions recorded for ${month}.`);
  } else {
    alert(`Recorded monthly contributions for ${res.count} members for ${month} and synced to database!`);
  }
}

async function handleUndoContrib() {
  if (state.data.contribs.length === 0) return alert('No contributions to undo.');
  const last = await state.undoLastContribution();
  if (last) {
    alert(`Undid and deleted entry for Member #${last.m} (${formatCurrency(last.amt)}) from database.`);
  }
}

async function handleDeleteContrib(id) {
  showConfirmModal({
    title: 'Delete Contribution',
    message: 'Are you sure you want to delete this contribution entry from database?',
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      await state.deleteContribution(id);
      showToast('Contribution entry deleted.', 'info');
      renderActiveTab();
    }
  });
}

async function handleIssueLoan() {
  const mId = Number($('select-loan-member').value);
  const amt = Number($('input-loan-amt').value);
  const rate = Number($('input-loan-rate').value) || 1.0;
  const pct = Number($('input-loan-pct').value) || 5.0;
  const tenure = Number($('input-loan-tenure').value) || 20;
  const date = $('input-loan-date').value || getTodayDate();

  if (!amt || amt <= 0) return showToast('Please enter a valid loan amount.', 'warning');

  const cash = calculateTotals(state.data).cashInHand;
  const executeIssue = async () => {
    await state.addLoan({
      m: mId,
      amt,
      rate,
      pct,
      n: tenure,
      date
    });
    showToast(`Loan of ${formatCurrency(amt)} sanctioned and recorded!`, 'success');
    renderActiveTab();
  };

  if (amt > cash) {
    showConfirmModal({
      title: 'Cash Reserve Warning',
      message: `Warning: Loan amount (${formatCurrency(amt)}) exceeds current cash in hand (${formatCurrency(cash)}). Proceed anyway?`,
      confirmText: 'Proceed Anyway',
      isDanger: true,
      onConfirm: executeIssue
    });
  } else {
    await executeIssue();
  }
}

async function handleRecordLoanPayment(loanId) {
  const input = $(`input-pay-${loanId}`);
  const amt = Number(input?.value);
  if (!amt || amt <= 0) return showToast('Please enter repayment payment amount.', 'warning');

  const loan = state.data.loans.find(l => l.id === Number(loanId));
  if (!loan) return;

  await state.addLoanRepayment(loanId, amt, getTodayDate());
  showToast(`Recorded payment of ${formatCurrency(amt)} and saved to database!`, 'success');
  renderActiveTab();
}

async function handleForecloseLoan(loanId) {
  const loan = state.data.loans.find(l => l.id === Number(loanId));
  if (!loan) return;

  const a = calculateLoanAnalytics(loan);
  if (!a.isForeclosureEligible) {
    return showToast(`Foreclosure is locked for the first 2 months. Eligible starting: ${a.foreclosureEligibleDate}`, 'warning');
  }

  showConfirmModal({
    title: 'Loan Foreclosure',
    message: `Confirm foreclosure of loan for ${formatCurrency(a.foreclosureAmount)}? This will mark the loan cleared in database.`,
    confirmText: 'Confirm Foreclosure',
    onConfirm: async () => {
      await state.forecloseLoan(loanId, a.foreclosureAmount);
      showToast('Loan successfully foreclosed and settled!', 'success');
      renderActiveTab();
    }
  });
}

async function handleDeleteLoan(loanId) {
  showConfirmModal({
    title: 'Delete Loan Record',
    message: 'Are you sure you want to delete this loan record from database?',
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      await state.deleteLoan(loanId);
      showToast('Loan record removed.', 'info');
      renderActiveTab();
    }
  });
}

async function handleAddInvestment() {
  const name = $('input-inv-name').value.trim();
  const type = $('select-inv-type').value;
  const cost = Number($('input-inv-cost').value);
  const date = $('input-inv-date').value || getTodayDate();

  if (!name || !cost) return showToast('Please specify investment name and amount.', 'warning');

  await state.addInvestment({
    name,
    type,
    cost,
    date
  });

  showToast('Society asset recorded successfully!', 'success');
  renderActiveTab();
}

async function handleDeleteInvestment(id) {
  showConfirmModal({
    title: 'Delete Asset',
    message: 'Delete this society investment asset from the portfolio?',
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      await state.deleteInvestment(id);
      showToast('Asset removed from portfolio.', 'info');
      renderActiveTab();
    }
  });
}

// One-Time Investments Handlers
async function handleAddOneTimeInvestment() {
  const selectMember = $('select-onetime-member');
  if (!selectMember) return;
  const isExt = selectMember.value === 'external';
  let investorId = isExt ? null : Number(selectMember.value);
  let investorName = '';

  if (isExt) {
    investorName = ($('input-onetime-ext-name')?.value || '').trim();
    if (!investorName) return showToast('Please enter the external investor full name.', 'warning');
  } else {
    const mem = state.data.members.find(m => m.id === investorId);
    investorName = mem ? mem.name : `Member #${investorId}`;
  }

  const title = ($('input-onetime-title')?.value || '').trim() || 'One-Time Term Investment';
  const amount = Number($('input-onetime-amt')?.value);
  const interestRate = Number($('input-onetime-rate')?.value);
  const tenureMonths = Number($('input-onetime-tenure')?.value);
  const startDate = $('input-onetime-date')?.value || getTodayDate();
  const notes = ($('input-onetime-notes')?.value || '').trim();

  if (!amount || amount <= 0) {
    return showToast('Please specify a valid one-time investment amount.', 'warning');
  }
  if (isNaN(interestRate) || interestRate < 0) {
    return showToast('Please specify a valid annual interest rate (%).', 'warning');
  }
  if (!tenureMonths || tenureMonths <= 0) {
    return showToast('Please specify a valid time period in months.', 'warning');
  }

  await state.addOneTimeInvestment({
    investorId,
    investorName,
    title,
    amount,
    interestRate,
    tenureMonths,
    startDate,
    status: 'Active',
    notes
  });

  showToast(`One-time investment of ${formatCurrency(amount)} recorded for ${investorName}!`, 'success');
  renderActiveTab();
}

function handleDeleteOneTimeInvestment(id) {
  if (!state.isAdmin()) {
    showToast('Permission denied: Only administrators can delete one-time investments.', 'error');
    return;
  }
  const numId = Number(id);
  const inv = (state.data.oneTimeInvs || []).find(i => Number(i.id) === numId);
  const invTitle = inv ? `${inv.investorName} - ${inv.title || 'Term Deposit'}` : 'this investment record';

  showConfirmModal({
    title: 'Delete One-Time Investment',
    message: `Are you sure you want to delete <strong>${escapeHTML(invTitle)}</strong>? This action will update the portfolio.`,
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      const res = await state.deleteOneTimeInvestment(numId);
      showToast(res?.message || 'One-time investment record removed.', 'info');
      render();
    }
  });
}

function openEditOneTimeInvestmentModal(id) {
  const inv = (state.data.oneTimeInvs || []).find(i => i.id === Number(id));
  if (!inv) return showToast('Investment record not found.', 'warning');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 540px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>💎</span>
          <span>Edit One-Time Investment</span>
        </div>
        <button class="modal-close-btn" id="btn-close-edit-onetime">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Administrator controls: modify investor, principal, interest rate, tenure period, and status.
      </p>

      <form id="form-edit-onetime" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Investor / Beneficiary Name:</label>
          <input type="text" id="edit-onetime-name" value="${escapeHTML(inv.investorName)}" required style="width: 100%;">
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Scheme Title / Description:</label>
          <input type="text" id="edit-onetime-title" value="${escapeHTML(inv.title || '')}" style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Principal Amount (₹):</label>
            <input type="number" id="edit-onetime-amt" value="${inv.amount}" step="500" min="1" required style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Interest Rate (% p.a.):</label>
            <input type="number" id="edit-onetime-rate" value="${inv.interestRate}" step="0.1" min="0" max="100" required style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Tenure Period (Months):</label>
            <input type="number" id="edit-onetime-tenure" value="${inv.tenureMonths}" min="1" max="360" required style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Start Date:</label>
            <input type="date" id="edit-onetime-date" value="${inv.startDate || getTodayDate()}" required style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Status:</label>
            <select id="edit-onetime-status" style="width: 100%;">
              <option value="Active" ${inv.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Matured" ${inv.status === 'Matured' ? 'selected' : ''}>Matured</option>
              <option value="Closed" ${inv.status === 'Closed' ? 'selected' : ''}>Closed / Paid</option>
              <option value="Foreclosed" ${inv.status === 'Foreclosed' ? 'selected' : ''}>Foreclosed</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Notes / Terms:</label>
            <input type="text" id="edit-onetime-notes" value="${escapeHTML(inv.notes || '')}" placeholder="Optional notes" style="width: 100%;">
          </div>
        </div>

        <!-- Live Calculation Preview in Modal -->
        <div class="preview-calc-box" id="edit-calc-preview" style="margin-bottom: 18px;">
          <div class="preview-calc-item">
            <div class="calc-label">Calculated Interest</div>
            <div class="calc-val ok" id="modal-prev-interest">—</div>
          </div>
          <div class="preview-calc-item">
            <div class="calc-label">Maturity Value</div>
            <div class="calc-val" id="modal-prev-maturity">—</div>
          </div>
          <div class="preview-calc-item">
            <div class="calc-label">Maturity Date</div>
            <div class="calc-val" id="modal-prev-date">—</div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-sm" id="btn-cancel-edit-onetime">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-edit-onetime">💾 Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const amtInput = modal.querySelector('#edit-onetime-amt');
  const rateInput = modal.querySelector('#edit-onetime-rate');
  const tenureInput = modal.querySelector('#edit-onetime-tenure');
  const dateInput = modal.querySelector('#edit-onetime-date');

  function updateModalCalcPreview() {
    const p = Number(amtInput.value || 0);
    const r = Number(rateInput.value || 0);
    const m = Number(tenureInput.value || 12);
    const dt = dateInput.value || getTodayDate();
    const ret = calculateOneTimeInvestmentReturn({ amount: p, interestRate: r, tenureMonths: m, startDate: dt });
    
    modal.querySelector('#modal-prev-interest').textContent = '+' + formatCurrency(ret.interestEarned);
    modal.querySelector('#modal-prev-maturity').textContent = formatCurrency(ret.maturityAmount);
    modal.querySelector('#modal-prev-date').textContent = ret.maturityDate;
  }

  [amtInput, rateInput, tenureInput, dateInput].forEach(inp => {
    inp.addEventListener('input', updateModalCalcPreview);
  });
  updateModalCalcPreview();

  const close = () => modal.remove();
  modal.querySelector('#btn-close-edit-onetime').onclick = close;
  modal.querySelector('#btn-cancel-edit-onetime').onclick = close;

  modal.querySelector('#btn-save-edit-onetime').onclick = async () => {
    const investorName = modal.querySelector('#edit-onetime-name').value.trim();
    const title = modal.querySelector('#edit-onetime-title').value.trim();
    const amount = Number(amtInput.value);
    const interestRate = Number(rateInput.value);
    const tenureMonths = Number(tenureInput.value);
    const startDate = dateInput.value;
    const status = modal.querySelector('#edit-onetime-status').value;
    const notes = modal.querySelector('#edit-onetime-notes').value.trim();

    if (!investorName) return showToast('Please specify the investor name.', 'warning');
    if (!amount || amount <= 0) return showToast('Please specify a valid principal amount.', 'warning');
    if (isNaN(interestRate) || interestRate < 0) return showToast('Please specify a valid interest rate.', 'warning');
    if (!tenureMonths || tenureMonths <= 0) return showToast('Please specify a valid tenure in months.', 'warning');

    await state.updateOneTimeInvestment(id, {
      investorName,
      title,
      amount,
      interestRate,
      tenureMonths,
      startDate,
      status,
      notes
    });

    close();
    showToast('One-time investment updated successfully!', 'success');
    renderActiveTab();
  };
}

async function handleDeleteMember(memberId, memberName) {
  if (!state.isAdmin()) {
    showToast('Only administrators can delete members.', 'warning');
    return;
  }

  const id = Number(memberId);
  if (id === 10 || id === 6) {
    showToast(`Primary administrator "${memberName}" cannot be deleted.`, 'warning');
    return;
  }

  // Check if member has active loans
  const memberLoans = (state.data.loans || []).filter(l => l.m === id && !l.closed);
  const activeLoanAmt = memberLoans.reduce((sum, l) => sum + calculateLoanAnalytics(l).outstandingPrincipal, 0);

  // Check if member has recorded contributions
  const contribCount = (state.data.contribs || []).filter(c => c.m === id).length;

  let extraWarning = '';
  if (activeLoanAmt > 0) {
    extraWarning = `<br><br><span style="color: var(--danger); font-weight: bold;">⚠️ WARNING: This member has an active loan with ${formatCurrency(activeLoanAmt)} outstanding principal!</span>`;
  } else if (contribCount > 0) {
    extraWarning = `<br><br><span style="color: var(--gold-main); font-weight: 600;">Note: This member has ${contribCount} recorded monthly contribution entries in society history.</span>`;
  }

  showConfirmModal({
    title: 'Delete Member Account',
    message: `Are you sure you want to permanently delete member <strong>${escapeHTML(memberName)}</strong> (Member #${id}) from the society and cloud database?${extraWarning}`,
    confirmText: 'Delete Member',
    isDanger: true,
    onConfirm: async () => {
      const res = await state.deleteMember(id);
      if (res.success) {
        showToast(res.message, 'success');
        render();
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function openAddExpenseMemberModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <div class="modal-title">👥 Add Friend to Expense Calculator</div>
        <button class="modal-close-btn" id="btn-close-add-exp-mem">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px;">
        Add a friend or participant to split group expenses and settle debts. This list is maintained independently from society members.
      </p>

      <form id="form-add-exp-mem" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Friend Full Name *</label>
          <input type="text" id="input-exp-m-name" placeholder="e.g. Ramesh Kumar" required style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Contact Phone (WhatsApp)</label>
          <input type="tel" id="input-exp-m-phone" placeholder="e.g. 9876543210" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Email Address</label>
          <input type="email" id="input-exp-m-email" placeholder="e.g. ramesh@example.com" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="font-size: 12px; font-weight: bold;">Optional Notes / Group</label>
          <input type="text" id="input-exp-m-notes" placeholder="e.g. College Friend, Roommate" style="width: 100%;">
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-sm" id="btn-cancel-add-exp-mem">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-add-exp-mem">➕ Add Friend</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-add-exp-mem').onclick = close;
  modal.querySelector('#btn-cancel-add-exp-mem').onclick = close;

  modal.querySelector('#btn-save-add-exp-mem').onclick = async () => {
    const name = modal.querySelector('#input-exp-m-name').value.trim();
    const phone = modal.querySelector('#input-exp-m-phone').value.trim();
    const email = modal.querySelector('#input-exp-m-email').value.trim();
    const notes = modal.querySelector('#input-exp-m-notes').value.trim();

    if (!name) {
      showToast('Please enter friend\'s full name.', 'warning');
      return;
    }

    try {
      const newM = await state.addExpenseMember({
        name,
        phone,
        email,
        notes
      });
      close();
      showToast(`Friend "${newM.name}" added to expense calculator!`, 'success');
      renderActiveTab();
    } catch (err) {
      showToast('Failed to add friend: ' + (err.message || 'Unknown error'), 'error');
    }
  };
}

function handleDeleteExpenseMember(id, name) {
  if (!state.isAdmin()) {
    showToast('Permission denied: Only administrators can remove friends from expense calculator.', 'error');
    return;
  }
  const numId = Number(id);
  showConfirmModal({
    title: 'Remove Friend from Expense Calculator',
    message: `Are you sure you want to remove <strong>${escapeHTML(name)}</strong> from the Friends Expense Calculator? This will not affect the Co-Op Society member directory.`,
    confirmText: 'Remove',
    isDanger: true,
    onConfirm: async () => {
      const res = await state.deleteExpenseMember(numId);
      if (res.success) {
        showToast(res.message, 'success');
        render();
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function openAddOneTimeMemberModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <div class="modal-title">💎 Add One-Time Investment Investor</div>
        <button class="modal-close-btn" id="btn-close-add-otm">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px;">
        Add an investor or member eligible for One-Time Fixed/Term Deposits. This list is independent from regular monthly society members.
      </p>

      <form id="form-add-otm" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Investor Full Name *</label>
          <input type="text" id="input-otm-name" placeholder="e.g. Suresh Kumar" required style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Contact Phone</label>
          <input type="tel" id="input-otm-phone" placeholder="e.g. 9876543210" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Email Address</label>
          <input type="email" id="input-otm-email" placeholder="e.g. suresh@example.com" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="font-size: 12px; font-weight: bold;">Optional Notes / Reference</label>
          <input type="text" id="input-otm-notes" placeholder="e.g. External term investor, PAN verified" style="width: 100%;">
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-sm" id="btn-cancel-add-otm">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-add-otm">➕ Add Investor</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-add-otm').onclick = close;
  modal.querySelector('#btn-cancel-add-otm').onclick = close;

  modal.querySelector('#btn-save-add-otm').onclick = async () => {
    const name = modal.querySelector('#input-otm-name').value.trim();
    const phone = modal.querySelector('#input-otm-phone').value.trim();
    const email = modal.querySelector('#input-otm-email').value.trim();
    const notes = modal.querySelector('#input-otm-notes').value.trim();

    if (!name) {
      showToast('Please enter investor\'s full name.', 'warning');
      return;
    }

    try {
      const newM = await state.addOneTimeMember({
        name,
        phone,
        email,
        notes
      });
      close();
      showToast(`Investor "${newM.name}" added to One-Time Investments!`, 'success');
      renderActiveTab();
    } catch (err) {
      showToast('Failed to add investor: ' + (err.message || 'Unknown error'), 'error');
    }
  };
}

function openEditOneTimeMemberModal(id) {
  const members = state.getOneTimeMembers();
  const m = members.find(item => item.id === Number(id));
  if (!m) return showToast('Investor not found.', 'warning');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 480px;">
      <div class="modal-header">
        <div class="modal-title">✏️ Edit Investor Profile</div>
        <button class="modal-close-btn" id="btn-close-edit-otm">✕</button>
      </div>

      <form id="form-edit-otm" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Investor Full Name *</label>
          <input type="text" id="edit-otm-name" value="${escapeHTML(m.name)}" required style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Contact Phone</label>
          <input type="tel" id="edit-otm-phone" value="${escapeHTML(m.phone || '')}" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Email Address</label>
          <input type="email" id="edit-otm-email" value="${escapeHTML(m.email || '')}" style="width: 100%;">
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label style="font-size: 12px; font-weight: bold;">Notes / Reference</label>
          <input type="text" id="edit-otm-notes" value="${escapeHTML(m.notes || '')}" style="width: 100%;">
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-sm" id="btn-cancel-edit-otm">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-edit-otm">💾 Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-edit-otm').onclick = close;
  modal.querySelector('#btn-cancel-edit-otm').onclick = close;

  modal.querySelector('#btn-save-edit-otm').onclick = async () => {
    const name = modal.querySelector('#edit-otm-name').value.trim();
    const phone = modal.querySelector('#edit-otm-phone').value.trim();
    const email = modal.querySelector('#edit-otm-email').value.trim();
    const notes = modal.querySelector('#edit-otm-notes').value.trim();

    if (!name) return showToast('Investor name cannot be empty.', 'warning');

    await state.updateOneTimeMember(id, { name, phone, email, notes });
    close();
    showToast(`Investor "${name}" updated successfully!`, 'success');
    renderActiveTab();
  };
}

function handleDeleteOneTimeMember(id, name) {
  if (!state.isAdmin()) {
    showToast('Permission denied: Only administrators can delete one-time investment investors.', 'error');
    return;
  }
  const numId = Number(id);
  const activeInvs = (state.data.oneTimeInvs || []).filter(i => (Number(i.investorId) === numId || i.investorName === name) && i.status !== 'Closed');
  let extraWarn = '';
  if (activeInvs.length > 0) {
    const totalActive = activeInvs.reduce((s, i) => s + Number(i.amount || 0), 0);
    extraWarn = `<br><br><span style="color: var(--danger); font-weight: bold;">⚠️ WARNING: This investor has ${activeInvs.length} active term deposits totaling ${formatCurrency(totalActive)}!</span>`;
  }

  showConfirmModal({
    title: 'Delete One-Time Investment Investor',
    message: `Are you sure you want to delete investor <strong>${escapeHTML(name)}</strong> (#${numId}) from One-Time Investments? This does not modify the Co-Op Society member directory.${extraWarn}`,
    confirmText: 'Delete Investor',
    isDanger: true,
    onConfirm: async () => {
      const res = await state.deleteOneTimeMember(numId);
      if (res.success) {
        showToast(res.message, 'success');
        render();
      } else {
        showToast(res.message, 'error');
      }
    }
  });
}

function openAddOneTimeInvestmentModal(preselectedMemberId = null, preselectedMemberName = '') {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const otMembers = state.getOneTimeMembers();

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>💎</span>
          <span>Record One-Time Investment (Term / Fixed Deposit)</span>
        </div>
        <button class="modal-close-btn" id="btn-close-add-mem-onetime">✕</button>
      </div>

      <p style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 14px;">
        Record a standalone lump-sum investment with fixed interest rate and maturity period.
      </p>

      <form id="form-add-mem-onetime" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Select Investor / Member:</label>
          <select id="add-mem-onetime-select-member" style="width: 100%;">
            ${otMembers.map(m => `
              <option value="${m.id}" data-name="${escapeHTML(m.name)}" ${preselectedMemberId == m.id || preselectedMemberName == m.name ? 'selected' : ''}>
                👤 ${escapeHTML(m.name)} (Investor #${m.id})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Investment Scheme Title / Reference:</label>
          <input type="text" id="add-mem-onetime-title" value="Cooperative Capital Term Deposit" style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Principal Amount (₹):</label>
            <input type="number" id="add-mem-onetime-amt" value="50000" step="1000" min="1" required style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Interest Rate (% p.a.):</label>
            <input type="number" id="add-mem-onetime-rate" value="8.0" step="0.1" min="0" required style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Time Period (Months):</label>
            <input type="number" id="add-mem-onetime-tenure" value="12" min="1" required style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Start Date:</label>
            <input type="date" id="add-mem-onetime-date" value="${getTodayDate()}" required style="width: 100%;">
          </div>
        </div>

        <!-- Live Projection Preview -->
        <div class="preview-calc-box" id="add-onetime-calc-preview" style="margin-bottom: 16px;">
          <div class="preview-calc-item">
            <div class="calc-label">Calculated Interest</div>
            <div class="calc-val ok" id="add-modal-prev-interest">+₹4,000</div>
          </div>
          <div class="preview-calc-item">
            <div class="calc-label">Maturity Value</div>
            <div class="calc-val" id="add-modal-prev-maturity">₹54,000</div>
          </div>
          <div class="preview-calc-item">
            <div class="calc-label">Maturity Date</div>
            <div class="calc-val" id="add-modal-prev-date">${addMonths(getTodayDate(), 12)}</div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-sm" id="btn-cancel-add-mem-onetime">Cancel</button>
          <button type="button" class="btn-primary" id="btn-submit-add-mem-onetime">💎 Record Investment</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const amtInput = modal.querySelector('#add-mem-onetime-amt');
  const rateInput = modal.querySelector('#add-mem-onetime-rate');
  const tenureInput = modal.querySelector('#add-mem-onetime-tenure');
  const dateInput = modal.querySelector('#add-mem-onetime-date');

  function updateAddCalcPreview() {
    const p = Number(amtInput.value || 0);
    const r = Number(rateInput.value || 0);
    const m = Number(tenureInput.value || 12);
    const dt = dateInput.value || getTodayDate();
    const ret = calculateOneTimeInvestmentReturn({ amount: p, interestRate: r, tenureMonths: m, startDate: dt });
    
    modal.querySelector('#add-modal-prev-interest').textContent = '+' + formatCurrency(ret.interestEarned);
    modal.querySelector('#add-modal-prev-maturity').textContent = formatCurrency(ret.maturityAmount);
    modal.querySelector('#add-modal-prev-date').textContent = ret.maturityDate;
  }

  [amtInput, rateInput, tenureInput, dateInput].forEach(inp => {
    inp.addEventListener('input', updateAddCalcPreview);
  });
  updateAddCalcPreview();

  const close = () => modal.remove();
  modal.querySelector('#btn-close-add-mem-onetime').onclick = close;
  modal.querySelector('#btn-cancel-add-mem-onetime').onclick = close;

  modal.querySelector('#btn-submit-add-mem-onetime').onclick = async () => {
    const selectMem = modal.querySelector('#add-mem-onetime-select-member');
    const selectedOpt = selectMem.options[selectMem.selectedIndex];
    const memberId = Number(selectMem.value);
    const memberName = selectedOpt ? selectedOpt.getAttribute('data-name') : 'Investor';

    const title = modal.querySelector('#add-mem-onetime-title').value.trim();
    const amount = Number(modal.querySelector('#add-mem-onetime-amt').value);
    const interestRate = Number(modal.querySelector('#add-mem-onetime-rate').value);
    const tenureMonths = Number(modal.querySelector('#add-mem-onetime-tenure').value);
    const startDate = modal.querySelector('#add-mem-onetime-date').value;

    if (!amount || amount <= 0) return showToast('Please enter a valid principal amount.', 'warning');

    await state.addOneTimeInvestment({
      investorId: memberId,
      investorName: memberName,
      title,
      amount,
      interestRate,
      tenureMonths,
      startDate,
      status: 'Active'
    });

    close();
    showToast(`One-time investment recorded for ${memberName}!`, 'success');
    render();
  };
}

// Expense Calculator & Splitter Handlers
async function handleAddExpense() {
  const title = ($('input-exp-title')?.value || '').trim();
  const amount = Number($('input-exp-amt')?.value);
  const date = $('input-exp-date')?.value || getTodayDate();
  const category = $('select-exp-category')?.value || 'General';
  const paidByVal = $('select-exp-paid-by')?.value;
  const splitType = $('select-exp-split-type')?.value || 'equal';
  const notes = ($('input-exp-notes')?.value || '').trim();

  if (!title) return showToast('Please enter an expense description.', 'warning');
  if (!amount || amount <= 0) return showToast('Please enter a valid expense amount.', 'warning');

  const expMembers = state.getExpenseMembers();
  let paidById = Number(paidByVal);
  const payer = expMembers.find(m => m.id === paidById);
  const paidByName = payer ? payer.name : 'Friend';

  let participants = [];
  if (splitType === 'selected') {
    document.querySelectorAll('.cb-exp-member:checked').forEach(cb => {
      participants.push(Number(cb.value));
    });
    if (participants.length === 0) {
      return showToast('Please select at least one participating friend.', 'warning');
    }
  } else {
    participants = expMembers.map(m => m.id);
  }

  await state.addExpense({
    title,
    amount,
    date,
    category,
    paidById,
    paidByName,
    splitType,
    participants,
    notes
  });

  showToast(`Expense of ${formatCurrency(amount)} recorded and split!`, 'success');
  renderActiveTab();
}

function handleDeleteExpense(id) {
  if (!state.isAdmin()) {
    showToast('Permission denied: Only administrators can delete expense records.', 'error');
    return;
  }
  const numId = Number(id);
  const exp = (state.data.expenses || []).find(e => Number(e.id) === numId);
  const expTitle = exp ? exp.title : 'this expense record';

  showConfirmModal({
    title: 'Delete Expense Record',
    message: `Are you sure you want to delete <strong>${escapeHTML(expTitle)}</strong>? Balances and split shares will be recalculated.`,
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: async () => {
      const res = await state.deleteExpense(numId);
      showToast(res?.message || 'Expense record deleted.', 'info');
      render();
    }
  });
}

function openEditExpenseModal(id) {
  const exp = (state.data.expenses || []).find(e => e.id === Number(id));
  if (!exp) return showToast('Expense record not found.', 'warning');
  const expMembers = state.getExpenseMembers();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <div class="modal-title">
          <span>✏️</span>
          <span>Edit Expense</span>
        </div>
        <button class="modal-close-btn" id="btn-close-edit-exp">✕</button>
      </div>

      <div style="font-size: 11.5px; color: var(--text-dim); margin-bottom: 12px; padding: 7px 12px; background: var(--surface-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border);">
        <span>👤 Originally recorded by: <strong>${escapeHTML(exp.createdBy?.name || 'Friend')}</strong> on ${exp.date}</span>
        ${exp.updatedBy ? `<div style="margin-top: 3px; color: var(--gold-main); font-weight: 600;">✏️ Last updated by: ${escapeHTML(exp.updatedBy.name)}</div>` : ''}
      </div>

      <form id="form-edit-exp" onsubmit="return false;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: bold;">Description:</label>
          <input type="text" id="edit-exp-title" value="${escapeHTML(exp.title)}" required style="width: 100%;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Amount (₹):</label>
            <input type="number" id="edit-exp-amt" value="${exp.amount}" min="1" required style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Date:</label>
            <input type="date" id="edit-exp-date" value="${exp.date || getTodayDate()}" required style="width: 100%;">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Category:</label>
            <select id="edit-exp-category" style="width: 100%;">
              <option ${exp.category === 'Food & Dining' ? 'selected' : ''}>Food & Dining</option>
              <option ${exp.category === 'Travel & Fuel' ? 'selected' : ''}>Travel & Fuel</option>
              <option ${exp.category === 'Entertainment & Outings' ? 'selected' : ''}>Entertainment & Outings</option>
              <option ${exp.category === 'Groceries & Supplies' ? 'selected' : ''}>Groceries & Supplies</option>
              <option ${exp.category === 'Stay & Hotels' ? 'selected' : ''}>Stay & Hotels</option>
              <option ${exp.category === 'Administrative' ? 'selected' : ''}>Administrative</option>
              <option ${exp.category === 'Miscellaneous' ? 'selected' : ''}>Miscellaneous</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size: 12px; font-weight: bold;">Paid By:</label>
            <select id="edit-exp-paid-by" style="width: 100%;">
              ${expMembers.map(m => `<option value="${m.id}" ${exp.paidById === m.id ? 'selected' : ''}>👤 ${escapeHTML(m.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 12px; font-weight: bold;">Notes:</label>
          <input type="text" id="edit-exp-notes" value="${escapeHTML(exp.notes || '')}" style="width: 100%;">
        </div>
        <div class="modal-footer" style="display: flex; justify-content: ${state.isAdmin() ? 'space-between' : 'flex-end'}; align-items: center;">
          ${state.isAdmin() ? '<button type="button" class="btn-sm btn-danger" id="btn-del-from-edit-exp">🗑️ Delete Expense</button>' : ''}
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-sm" id="btn-cancel-edit-exp">Cancel</button>
            <button type="button" class="btn-primary" id="btn-save-edit-exp">💾 Save Changes</button>
          </div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-edit-exp').onclick = close;
  modal.querySelector('#btn-cancel-edit-exp').onclick = close;
  if (state.isAdmin() && modal.querySelector('#btn-del-from-edit-exp')) {
    modal.querySelector('#btn-del-from-edit-exp').onclick = () => {
      close();
      handleDeleteExpense(id);
    };
  }

  modal.querySelector('#btn-save-edit-exp').onclick = async () => {
    const title = modal.querySelector('#edit-exp-title').value.trim();
    const amount = Number(modal.querySelector('#edit-exp-amt').value);
    const date = modal.querySelector('#edit-exp-date').value;
    const category = modal.querySelector('#edit-exp-category').value;
    const paidByVal = modal.querySelector('#edit-exp-paid-by').value;
    const notes = modal.querySelector('#edit-exp-notes').value.trim();

    if (!title || !amount) return showToast('Please enter title and amount.', 'warning');

    const paidById = Number(paidByVal);
    const payer = expMembers.find(m => m.id === paidById);
    const paidByName = payer ? payer.name : 'Friend';

    await state.updateExpense(id, {
      title,
      amount,
      date,
      category,
      paidById,
      paidByName,
      notes
    });

    close();
    showToast('Expense updated successfully!', 'success');
    renderActiveTab();
  };
}

async function handleSettleDebt(btn) {
  const { fromid, fromname, toid, toname, amount } = btn.dataset;
  showConfirmModal({
    title: 'Record Debt Settlement',
    message: `Confirm that ${fromname} has paid ${formatCurrency(amount)} to ${toname}?`,
    confirmText: 'Record Settlement',
    onConfirm: async () => {
      await state.recordExpenseSettlement({
        fromId: Number(fromid),
        fromName: fromname,
        toId: Number(toid),
        toName: toname,
        amount: Number(amount),
        date: getTodayDate()
      });
      showToast(`Settlement of ${formatCurrency(amount)} between ${fromname} and ${toname} recorded!`, 'success');
      renderActiveTab();
    }
  });
}

function openExpenseReminderModal({ fromName, fromPhone, toName, toPhone, amount }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const recipientPart = toName === 'the group' ? 'to settle group expenses' : `payable to ${toName}`;
  const defaultMsg = `Hi ${fromName}, gentle reminder regarding our group expense split: you have a pending balance of ${formatCurrency(amount)} ${recipientPart}. Please settle when convenient via UPI/bank transfer. Thanks! 👍`;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <span>🔔</span>
          <span>Send Expense Reminder</span>
        </div>
        <button class="modal-close-btn" id="btn-close-remind-modal">✕</button>
      </div>

      <div style="background: var(--surface-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Friend: <strong>${escapeHTML(fromName)}</strong></span>
          <span style="color: var(--danger); font-weight: bold;">Owes: ${formatCurrency(amount)}</span>
        </div>
        <div style="color: var(--text-muted); font-size: 12px;">
          Payable to: <strong>${escapeHTML(toName)}</strong> ${toPhone ? `(${escapeHTML(toPhone)})` : ''}
        </div>
        ${fromPhone ? `<div style="color: var(--ok); font-size: 12px; margin-top: 4px;">📱 WhatsApp Phone: <strong>${escapeHTML(fromPhone)}</strong></div>` : '<div style="color: var(--gold-main); font-size: 11.5px; margin-top: 4px;">⚠️ No direct phone number recorded. You can share via WhatsApp or copy the message.</div>'}
      </div>

      <div class="form-group" style="margin-bottom: 16px;">
        <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">WhatsApp Reminder Message (Editable):</label>
        <textarea id="txt-remind-expense-msg" rows="4" style="width: 100%; font-size: 13px; line-height: 1.4; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border); box-sizing: border-box;">${defaultMsg}</textarea>
      </div>

      <div class="modal-footer" style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
        <button type="button" class="btn-sm" id="btn-copy-remind-msg">📋 Copy Text</button>
        <button type="button" class="btn-sm btn-gold" id="btn-send-remind-wa">
          💬 Open in WhatsApp
        </button>
        <button type="button" class="btn-sm" id="btn-cancel-remind-modal">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#btn-close-remind-modal').onclick = close;
  modal.querySelector('#btn-cancel-remind-modal').onclick = close;

  modal.querySelector('#btn-copy-remind-msg').onclick = () => {
    const msg = modal.querySelector('#txt-remind-expense-msg').value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => {
        showToast('Reminder message copied to clipboard!', 'success');
      });
    } else {
      showToast('Clipboard not supported.', 'warning');
    }
  };

  modal.querySelector('#btn-send-remind-wa').onclick = () => {
    const msg = modal.querySelector('#txt-remind-expense-msg').value;
    if (fromPhone) {
      openWhatsAppReminder(fromPhone, msg);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    }
    showToast('WhatsApp launched with reminder!', 'success');
    close();
  };
}

function handleWhatsAppExpenseSummary() {
  const expSummary = calculateExpensesSummary(state.data);
  let text = `*FRIENDS EXPENSE CALCULATOR & SPLITTER*\n`;
  text += `Date: ${getTodayDate()}\n`;
  text += `Total Group Expenses: ${formatCurrency(expSummary.totalExpenseAmount)} (${expSummary.expenseCount} entries)\n\n`;

  text += `*SIMPLIFIED DEBT SETTLEMENTS (WHO OWES WHOM):*\n`;
  if (expSummary.simplifiedDebts.length > 0) {
    expSummary.simplifiedDebts.forEach((d, idx) => {
      text += `${idx + 1}. *${d.fromName}* owes *${d.toName}*: ${formatCurrency(d.amount)}\n`;
    });
  } else {
    text += `All group balances are settled! 🎉\n`;
  }

  text += `\n*INDIVIDUAL BALANCES:*\n`;
  expSummary.memberBalances.forEach(b => {
    const net = Math.round(b.netBalance);
    if (net > 0) {
      text += `• ${b.name}: Gets back ${formatCurrency(net)}\n`;
    } else if (net < 0) {
      text += `• ${b.name}: Owes ${formatCurrency(Math.abs(net))}\n`;
    } else {
      text += `• ${b.name}: Settled (₹0)\n`;
    }
  });

  text += `\nGenerated via Sumukha Friends Expense Splitter`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
  showToast('WhatsApp group summary opened & copied to clipboard!', 'success');
}

function handleCopyExpenseSummary() {
  const expSummary = calculateExpensesSummary(state.data);
  let text = `*FRIENDS EXPENSE CALCULATOR & SPLITTER*\n`;
  text += `Date: ${getTodayDate()}\n`;
  text += `Total Group Expenses: ${formatCurrency(expSummary.totalExpenseAmount)} (${expSummary.expenseCount} entries)\n\n`;

  text += `*SIMPLIFIED DEBT SETTLEMENTS (WHO OWES WHOM):*\n`;
  if (expSummary.simplifiedDebts.length > 0) {
    expSummary.simplifiedDebts.forEach((d, idx) => {
      text += `${idx + 1}. ${d.fromName} owes ${d.toName}: ${formatCurrency(d.amount)}\n`;
    });
  } else {
    text += `All group balances are completely settled! ✓\n`;
  }

  text += `\n*INDIVIDUAL BALANCES:*\n`;
  expSummary.memberBalances.forEach(b => {
    const net = Math.round(b.netBalance);
    if (net > 0) {
      text += `• ${b.name}: Gets back ${formatCurrency(net)}\n`;
    } else if (net < 0) {
      text += `• ${b.name}: Owes ${formatCurrency(Math.abs(net))}\n`;
    } else {
      text += `• ${b.name}: Settled (₹0)\n`;
    }
  });

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Friends expense summary copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not copy to clipboard automatically.', 'warning');
    });
  } else {
    showToast('Clipboard not supported in this browser.', 'warning');
  }
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
          <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Administrator Username or Email:</label>
          <input type="text" id="modal-admin-identifier" placeholder="Enter admin username, email, or member #" style="width: 100%;" autocomplete="username">
        </div>

        <div class="form-group" style="margin-bottom: 18px;">
          <label style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Password:</label>
          <div style="position: relative; display: flex; align-items: center;">
            <input type="password" id="modal-admin-password" placeholder="Enter admin password" style="width: 100%; padding-right: 42px;">
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
  modal.querySelector('#btn-submit-admin').onclick = async () => {
    const identifier = modal.querySelector('#modal-admin-identifier')?.value.trim();
    const password = passInput.value;
    if (!identifier) {
      return alert('Please enter your administrator username, email, or member #.');
    }
    const submitBtn = modal.querySelector('#btn-submit-admin');
    if (submitBtn) submitBtn.textContent = 'Verifying with database...';

    const verify = await state.verifyAdminLoginAsync(identifier, password);

    if (!verify.success) {
      if (submitBtn) submitBtn.textContent = 'Sign In as Administrator';
      return alert(verify.message);
    }

    state.setRole('admin', verify.admin.id, { id: verify.admin.id, name: verify.admin.name });
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
  if (!state.isAdmin()) return showToast('Access restricted to administrators.', 'warning');
  const member = state.data.members.find(m => m.id === Number(memberId));
  if (!member) return showToast('Member profile not found.', 'warning');

  const mOneTimes = state.getMemberOneTimeInvestments(member.id);
  const primaryOneTime = mOneTimes[0];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 530px;">
      <div class="modal-header">
        <div>
          <div class="modal-title">✏️ Edit Member Profile</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Member #${member.id} · ${escapeHTML(member.name)}
          </div>
        </div>
        <button class="modal-close-btn" id="btn-close-edit-modal">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Modify profile details, monthly commitment, and optional one-time investment options.
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

        <!-- One-Time Investment Configuration Section -->
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border-color);">
          <div style="font-size: 13px; font-weight: bold; color: var(--navy-blue); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span>💎</span> One-Time Investment (Fixed / Term Deposit)
          </div>
          <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px;">
            Independent capital deposit with fixed interest rate and tenure period (not monthly contribution).
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div class="form-group">
              <label style="font-size: 11.5px; font-weight: bold;">One-Time Principal (₹):</label>
              <input type="number" id="edit-mem-onetime-amt" value="${primaryOneTime ? primaryOneTime.amount : ''}" placeholder="e.g. 50000" style="width: 100%;">
            </div>
            <div class="form-group">
              <label style="font-size: 11.5px; font-weight: bold;">Interest Rate (% p.a.):</label>
              <input type="number" id="edit-mem-onetime-rate" value="${primaryOneTime ? primaryOneTime.interestRate : 8.0}" step="0.1" min="0" style="width: 100%;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
            <div class="form-group">
              <label style="font-size: 11.5px; font-weight: bold;">Time Period (Months):</label>
              <input type="number" id="edit-mem-onetime-tenure" value="${primaryOneTime ? primaryOneTime.tenureMonths : 12}" min="1" style="width: 100%;">
            </div>
            <div class="form-group">
              <label style="font-size: 11.5px; font-weight: bold;">Start Date:</label>
              <input type="date" id="edit-mem-onetime-date" value="${primaryOneTime ? (primaryOneTime.startDate || getTodayDate()) : getTodayDate()}" style="width: 100%;">
            </div>
          </div>
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
      return showToast('Member name cannot be empty.', 'warning');
    }

    const payload = { name, email, phone, monthly, is_admin };
    if (is_admin && password) {
      payload.password = password;
    }

    const res = await state.updateMember(member.id, payload);

    // Handle One-Time Investment
    const oneTimeAmt = Number(modal.querySelector('#edit-mem-onetime-amt').value);
    const oneTimeRate = Number(modal.querySelector('#edit-mem-onetime-rate').value);
    const oneTimeTenure = Number(modal.querySelector('#edit-mem-onetime-tenure').value);
    const oneTimeDate = modal.querySelector('#edit-mem-onetime-date').value;

    if (oneTimeAmt > 0) {
      if (primaryOneTime) {
        await state.updateOneTimeInvestment(primaryOneTime.id, {
          investorName: name,
          amount: oneTimeAmt,
          interestRate: oneTimeRate,
          tenureMonths: oneTimeTenure,
          startDate: oneTimeDate
        });
      } else {
        await state.addOneTimeInvestment({
          investorId: member.id,
          investorName: name,
          title: 'Member Fixed Capital Deposit',
          amount: oneTimeAmt,
          interestRate: oneTimeRate,
          tenureMonths: oneTimeTenure,
          startDate: oneTimeDate,
          status: 'Active'
        });
      }
    }

    modal.remove();
    showToast(res.message || 'Member profile updated successfully!', res.success ? 'success' : 'warning');
    render();
  };
}

function openAddMemberModal() {
  if (!state.isAdmin()) return alert('Access restricted to administrators.');
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
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: phone || '',
      monthly,
      is_admin
    };

    const confirmBtn = modal.querySelector('#btn-confirm-add-mem');
    if (confirmBtn) confirmBtn.textContent = 'Saving to Database...';

    await state.addMember(newMember);

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

    const saveBtn = modal.querySelector('#btn-save-new-pass');
    if (saveBtn) saveBtn.textContent = 'Saving to Database...';

    // Verify current password, allowing fallback to async database check
    let isCurrValid = (curr === targetAdmin.password);
    if (!isCurrValid) {
      const verifyCheck = await state.verifyAdminLoginAsync(targetAdmin.id, curr);
      isCurrValid = verifyCheck.success;
    }

    if (!isCurrValid) {
      if (saveBtn) saveBtn.textContent = '💾 Save to Database';
      return alert(`Incorrect current password for Administrator ${targetAdmin.name}.`);
    }
    if (!next || next.length < 4) {
      if (saveBtn) saveBtn.textContent = '💾 Save to Database';
      return alert('New password must be at least 4 characters long.');
    }
    if (next !== confirm) {
      if (saveBtn) saveBtn.textContent = '💾 Save to Database';
      return alert('New password and confirmation password do not match.');
    }

    const res = await state.updateAdminPassword(targetAdmin.id, next);
    if (res.success) {
      modal.remove();
      alert(`Password for Administrator ${targetAdmin.name} successfully updated and saved in database.`);
    } else {
      if (saveBtn) saveBtn.textContent = '💾 Save to Database';
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
    return alert('Access Restricted: Only Society Administrators can dispatch reminders.');
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
    return alert('Access Restricted: Only Society Administrators can dispatch reminders.');
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
    return alert('Access Restricted: Only Society Administrators can dispatch reminders to everyone.');
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

function openBackupRestoreModal() {
  if (!state.isAdmin()) {
    return alert('Access Restricted: Only Society Administrators can manage backups and disaster recovery.');
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px;">
      <div class="modal-header">
        <div>
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>💾</span>
            <span>Backup & Disaster Recovery</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Export offline backups or restore complete ledger data in case of disaster
          </div>
        </div>
        <button class="btn-sm" id="btn-close-backup-modal">✕</button>
      </div>

      <!-- Export Section -->
      <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 13.5px; color: var(--text-main);">📥 Export Current Society Data</strong>
          <span class="badge badge-ok" style="font-size: 11px;">Active Ledger</span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          Downloads an offline JSON snapshot containing all members (${state.data.members.length}), contributions (${(state.data.contribs || []).length}), active loans (${(state.data.loans || []).length}), and investments (${(state.data.invs || []).length}).
        </p>
        <button class="btn-primary" id="btn-download-backup-json" style="width: 100%; padding: 9px; font-size: 13px;">
          💾 Download Backup JSON File
        </button>
      </div>

      <!-- Import / Disaster Recovery Section -->
      <div style="border: 1px dashed var(--gold-main); border-radius: var(--radius-md); padding: 14px; background: rgba(245, 158, 11, 0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 13.5px; color: #d97706;">🚨 Disaster Recovery (Import JSON)</strong>
          <span class="badge badge-danger" style="font-size: 10.5px;">Overwrites State</span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          Select a previously downloaded <code>.json</code> backup file to reconstruct society financial accounts, members, and records.
        </p>

        <input type="file" id="input-backup-file" accept=".json,application/json" style="width: 100%; font-size: 12.5px; margin-bottom: 12px; padding: 6px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);">

        <div id="backup-preview-box" style="display: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; color: var(--text-main);">Backup Contents Verified:</div>
          <div id="backup-preview-stats" style="font-size: 12px; color: var(--text-muted); line-height: 1.6;"></div>
        </div>

        <button class="btn-gold" id="btn-execute-restore" style="width: 100%; padding: 10px; font-size: 13px; font-weight: bold; display: none;" disabled>
          🔄 Restore Database from This File
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-backup-modal').onclick = () => modal.remove();

  modal.querySelector('#btn-download-backup-json').onclick = () => {
    exportBackupJSON();
  };

  const fileInput = modal.querySelector('#input-backup-file');
  const previewBox = modal.querySelector('#backup-preview-box');
  const previewStats = modal.querySelector('#backup-preview-stats');
  const restoreBtn = modal.querySelector('#btn-execute-restore');

  let parsedBackupData = null;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      previewBox.style.display = 'none';
      restoreBtn.style.display = 'none';
      restoreBtn.disabled = true;
      parsedBackupData = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || typeof json !== 'object' || !Array.isArray(json.members)) {
          throw new Error('Invalid backup file: file missing members array.');
        }

        parsedBackupData = json;
        const membersCount = json.members.length;
        const contribsCount = Array.isArray(json.contribs) ? json.contribs.length : 0;
        const loansCount = Array.isArray(json.loans) ? json.loans.length : 0;
        const invsCount = Array.isArray(json.invs) ? json.invs.length : 0;

        previewStats.innerHTML = `
          • <strong>File:</strong> ${escapeHTML(file.name)} (${(file.size / 1024).toFixed(1)} KB)<br>
          • <strong>Members:</strong> ${membersCount}<br>
          • <strong>Contributions:</strong> ${contribsCount} records<br>
          • <strong>Loans & EMIs:</strong> ${loansCount} records<br>
          • <strong>Investments:</strong> ${invsCount} records
        `;

        previewBox.style.display = 'block';
        restoreBtn.style.display = 'block';
        restoreBtn.disabled = false;
      } catch (err) {
        console.error('Backup parse error:', err);
        alert('❌ Could not parse backup file: ' + err.message + '\n\nPlease ensure you selected a valid Sumukha Co-Op Society JSON backup file.');
        fileInput.value = '';
        previewBox.style.display = 'none';
        restoreBtn.style.display = 'none';
        restoreBtn.disabled = true;
        parsedBackupData = null;
      }
    };
    reader.readAsText(file);
  });

  restoreBtn.onclick = async () => {
    if (!parsedBackupData) return;

    const mCount = parsedBackupData.members.length;
    const cCount = (parsedBackupData.contribs || []).length;
    const lCount = (parsedBackupData.loans || []).length;

    const confirmed = confirm(
      '⚠️ DISASTER RECOVERY CONFIRMATION\\n\\nAre you sure you want to restore and overwrite the society ledger with this backup?\\n\\n• Members: ' + mCount + '\\n• Contributions: ' + cCount + '\\n• Loans: ' + lCount + '\\n\\nThis will immediately update all views and database records.'
    );

    if (!confirmed) return;

    try {
      restoreBtn.disabled = true;
      restoreBtn.textContent = '⏳ Restoring Database...';

      const res = await state.restoreBackup(parsedBackupData);
      modal.remove();
      render();
      alert('✅ Disaster Recovery Successful!\\n\\nRestored:\\n• ' + res.membersCount + ' Members\\n• ' + res.contribsCount + ' Contribution Records\\n• ' + res.loansCount + ' Loans\\n• ' + res.invsCount + ' Investments\\n\\nAll ledger tables and calculations are updated.');
    } catch (err) {
      console.error('Restore error:', err);
      alert('❌ Restore Failed: ' + err.message);
      restoreBtn.disabled = false;
      restoreBtn.textContent = '🔄 Restore Database from This File';
    }
  };
}

function openAuditTrailModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const logs = state.getAuditLogs();

  function renderRows(filteredLogs) {
    if (filteredLogs.length === 0) {
      return `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">No audit records found matching criteria.</td></tr>`;
    }
    return filteredLogs.map(l => {
      const dt = new Date(l.timestamp);
      const timeStr = isNaN(dt.getTime()) ? l.timestamp : dt.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
      const detailsStr = Object.entries(l.details || {})
        .map(([k, v]) => `<strong>${escapeHTML(k)}:</strong> ${escapeHTML(typeof v === 'object' ? JSON.stringify(v) : String(v))}`)
        .join(' · ');

      let badgeStyle = 'background: rgba(37,99,235,0.1); color: var(--navy-blue);';
      if (l.action.includes('RECORD') || l.action.includes('SANCTION')) {
        badgeStyle = 'background: rgba(37,99,235,0.15); color: #1d4ed8;';
      } else if (l.action.includes('FORECLOSE') || l.action.includes('PASSWORD')) {
        badgeStyle = 'background: var(--gold-tint); color: var(--gold-dark);';
      } else if (l.action.includes('DELETE') || l.action.includes('UNDONE')) {
        badgeStyle = 'background: var(--danger-bg); color: var(--danger);';
      }

      return `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="white-space: nowrap; font-size: 11.5px; color: var(--text-muted); padding: 8px 10px;">${escapeHTML(timeStr)}</td>
          <td style="font-weight: 600; font-size: 12px; padding: 8px 10px;">👤 ${escapeHTML(l.actor_name)}</td>
          <td style="padding: 8px 10px;"><span class="badge" style="${badgeStyle} font-size: 10.5px; padding: 2px 7px; border-radius: 4px; font-weight: bold;">${escapeHTML(l.action)}</span></td>
          <td style="font-size: 11.5px; color: var(--text-main); padding: 8px 10px;">${detailsStr || '—'}</td>
        </tr>
      `;
    }).join('');
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 880px; max-height: 88vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <div>
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span>📜</span> Regulatory Financial Audit Trail
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
            Sumukha Co-Operative Society · Chronological ledger of all financial and admin events (${logs.length} logged events)
          </div>
        </div>
        <button class="btn-sm" id="btn-close-audit-modal">✕</button>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 8px; flex: 1; min-width: 260px;">
          <input type="text" id="input-audit-search" placeholder="Search by administrator, action or details..." style="padding: 6px 10px; font-size: 12px; flex: 1;">
          <select id="select-audit-filter" style="padding: 6px 10px; font-size: 12px;">
            <option value="ALL">All Actions</option>
            <option value="CONTRIBUTION">Contributions</option>
            <option value="LOAN">Loans & EMI</option>
            <option value="INVESTMENT">Investments</option>
            <option value="MEMBER">Members</option>
            <option value="PASSWORD">Security & Auth</option>
          </select>
        </div>
        <button class="btn-sm btn-gold" id="btn-export-audit-csv" title="Export Regulatory CSV Ledger">📥 Export Audit CSV</button>
      </div>

      <div class="table-frame" style="flex: 1; overflow-y: auto; max-height: 52vh; border: 1px solid var(--border); border-radius: var(--radius-sm);">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="position: sticky; top: 0; background: var(--surface-subtle); z-index: 2; border-bottom: 1px solid var(--border);">
              <th style="padding: 8px 10px; text-align: left;">Timestamp (IST)</th>
              <th style="padding: 8px 10px; text-align: left;">Administrator</th>
              <th style="padding: 8px 10px; text-align: left;">Action</th>
              <th style="padding: 8px 10px; text-align: left;">Audit Details</th>
            </tr>
          </thead>
          <tbody id="audit-table-body">
            ${renderRows(logs)}
          </tbody>
        </table>
      </div>

      <div class="modal-footer" style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11.5px; color: var(--text-muted);">
          Protected ledger records for cooperative society compliance & dispute prevention.
        </span>
        <button class="btn-primary" id="btn-done-audit">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-audit-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-done-audit').onclick = () => modal.remove();

  const tbody = modal.querySelector('#audit-table-body');
  const searchInput = modal.querySelector('#input-audit-search');
  const filterSelect = modal.querySelector('#select-audit-filter');

  function updateTable() {
    const q = searchInput.value.toLowerCase().trim();
    const cat = filterSelect.value;
    const filtered = logs.filter(l => {
      const matchCat = cat === 'ALL' || l.action.includes(cat);
      const text = `${l.actor_name} ${l.action} ${JSON.stringify(l.details)}`.toLowerCase();
      const matchQ = !q || text.includes(q);
      return matchCat && matchQ;
    });
    tbody.innerHTML = renderRows(filtered);
  }

  searchInput.addEventListener('input', updateTable);
  filterSelect.addEventListener('change', updateTable);

  modal.querySelector('#btn-export-audit-csv').onclick = () => {
    let csv = 'Timestamp,Administrator,Action,Details\n';
    logs.forEach(l => {
      const t = `"${l.timestamp}"`;
      const a = `"${l.actor_name}"`;
      const act = `"${l.action}"`;
      const d = `"${JSON.stringify(l.details).replace(/"/g, '""')}"`;
      csv += `${t},${a},${act},${d}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Sumukha_CoOp_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };
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

// Portal Mode Switcher (Co-Op Society <-> Expense Calculator)
window.togglePortalMode = () => {
  appMode = appMode === 'expenses' ? 'coop' : 'expenses';
  try {
    sessionStorage.setItem('sumukha_app_mode', appMode);
  } catch (e) {}
  showToast(appMode === 'expenses' ? 'Switched to Expense Calculator & Splitter' : 'Switched to Co-Op Society Management Portal', 'info');
  render();
};

window.setAppMode = (mode) => {
  appMode = mode;
  try {
    sessionStorage.setItem('sumukha_app_mode', appMode);
  } catch (e) {}
  render();
};

window.openAddExpenseMemberModal = openAddExpenseMemberModal;
window.openAddOneTimeInvestmentModal = openAddOneTimeInvestmentModal;
