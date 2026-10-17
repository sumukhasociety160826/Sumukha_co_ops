/**
 * Sumukha Co-Op Society - State Management & Data Store
 * Supports Dual-Mode: Resilient Local Cache & Real-Time Supabase Cloud Database Sync
 */

import { getSupabaseClient } from './config.js';

export const INITIAL_SNAPSHOT = {
  monthly: 10000,
  members: [
    { id: 1, name: "Adith", email: "adith@example.com", phone: "+91 98765 43210", is_admin: false },
    { id: 2, name: "Kiran", email: "kiran@example.com", phone: "+91 98765 43211", monthly: 5000, is_admin: false },
    { id: 3, name: "Madhusudhan", email: "madhusudhan@example.com", phone: "+91 98765 43212", is_admin: false },
    { id: 4, name: "Manohar", email: "manohar@example.com", phone: "+91 98765 43213", monthly: 5000, is_admin: false },
    { id: 5, name: "Muniraj", email: "muniraj@example.com", phone: "+91 98765 43214", monthly: 5000, is_admin: false },
    { id: 6, name: "Naveen", email: "naveenkumarm6563@gmail.com", phone: "8951264083", monthly: 5000, is_admin: true, password: "Naveen@321" },
    { id: 7, name: "Prakash", email: "prakash@example.com", phone: "+91 98765 43216", is_admin: false },
    { id: 8, name: "Ram Dorai", email: "ramdorai@example.com", phone: "+91 98765 43217", is_admin: false },
    { id: 9, name: "Rakshith", email: "rakshith@example.com", phone: "+91 98765 43218", is_admin: false },
    { id: 10, name: "Sagar", email: "mysagar95@gmail.com", phone: "8892983068", is_admin: true, password: "sagar@123" },
    { id: 11, name: "Tejas", email: "tejas@example.com", phone: "+91 98765 43220", is_admin: false },
    { id: 12, name: "Varun", email: "varun@example.com", phone: "+91 98765 43221", monthly: 5000, is_admin: false },
    { id: 13, name: "Virata Yashwanth", email: "yashwanth@example.com", phone: "+91 98765 43222", is_admin: false }
  ],
  contribs: [
    { id: 1791536015649, m: 1, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536092179, m: 2, month: "2026-08", amt: 5000, date: "2026-10-09" },
    { id: 1791536100878, m: 3, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536117275, m: 4, month: "2026-08", amt: 5000, date: "2026-10-09" },
    { id: 1791536132000, m: 5, month: "2026-08", amt: 5000, date: "2026-10-09" },
    { id: 1791536141573, m: 6, month: "2026-08", amt: 5000, date: "2026-10-09" },
    { id: 1791536148212, m: 7, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536156487, m: 8, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536169735, m: 9, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536175583, m: 10, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536183062, m: 11, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791536194148, m: 12, month: "2026-08", amt: 5000, date: "2026-10-09" },
    { id: 1791536199908, m: 13, month: "2026-08", amt: 10000, date: "2026-10-09" },
    { id: 1791552001166, m: 1, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552011622, m: 2, month: "2026-09", amt: 5000, date: "2026-10-09" },
    { id: 1791552018071, m: 3, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552026017, m: 4, month: "2026-09", amt: 5000, date: "2026-10-09" },
    { id: 1791552038205, m: 5, month: "2026-09", amt: 5000, date: "2026-10-09" },
    { id: 1791552044415, m: 6, month: "2026-09", amt: 5000, date: "2026-10-09" },
    { id: 1791552050543, m: 7, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552058802, m: 8, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552064174, m: 9, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552072354, m: 10, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552077162, m: 11, month: "2026-09", amt: 10000, date: "2026-10-09" },
    { id: 1791552097309, m: 12, month: "2026-09", amt: 5000, date: "2026-10-09" },
    { id: 1791552107640, m: 13, month: "2026-09", amt: 10000, date: "2026-10-09" }
  ],
  loans: [
    {
      id: 1791551938588,
      m: 11,
      amt: 100000,
      rate: 1,
      pct: 5,
      n: 20,
      date: "2026-08-20",
      reps: [{ amt: 6000, date: "2026-10-09" }]
    },
    {
      id: 1791552149360,
      m: 4,
      amt: 70000,
      rate: 1,
      pct: 5,
      n: 20,
      date: "2026-09-20",
      reps: []
    },
    {
      id: 1791552174793,
      m: 10,
      amt: 45000,
      rate: 1,
      pct: 5,
      n: 20,
      date: "2026-09-20",
      reps: []
    }
  ],
  invs: []
};

const STORAGE_KEY = 'sumukha_society_v4';
const SESSION_KEY = 'sumukha_session_v4';

export class AppState {
  constructor() {
    this.data = this.loadData();
    this.session = this.loadSession();
    this.listeners = [];
    this.cloudStatus = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
    this.lastSyncedAt = null;
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('sumukha_society_v3') || localStorage.getItem('sumukha_society_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          // Sagar admin fallback
          const sagar = parsed.members.find(m => m.id === 10 || (m.name && m.name.toLowerCase() === 'sagar'));
          if (sagar) {
            sagar.id = 10;
            sagar.name = "Sagar";
            sagar.is_admin = true;
            if (!sagar.password) sagar.password = "sagar@123";
          }

          // Naveen admin fallback
          const naveen = parsed.members.find(m => m.id === 6 || (m.name && m.name.toLowerCase() === 'naveen'));
          if (naveen) {
            naveen.id = 6;
            naveen.name = "Naveen";
            naveen.is_admin = true;
            if (!naveen.password) naveen.password = "Naveen@321";
          }

          // Ensure non-admins do not hold passwords
          parsed.members.forEach(m => {
            if (m.id !== 10 && m.id !== 6) {
              m.is_admin = false;
              delete m.password;
            }
          });

          // Ensure arrays are initialized
          parsed.contribs = Array.isArray(parsed.contribs) ? parsed.contribs : [];
          parsed.loans = Array.isArray(parsed.loans) ? parsed.loans : [];
          parsed.invs = Array.isArray(parsed.invs) ? parsed.invs : [];
          parsed.monthly = Number(parsed.monthly) || 10000;

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored state, using default snapshot:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_SNAPSHOT));
  }

  loadSession() {
    try {
      // Check localStorage first so refresh across tabs/windows preserves admin role
      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.role) return parsed;
      }
    } catch (e) {}
    return {
      role: 'member',
      memberId: 1,
      adminId: null,
      adminName: null
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Storage quota exceeded or error saving:', e);
    }
    this.notify();
  }

  saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch (e) {}
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.data, this.session);
    }
  }

  // =========================================================================
  // SUPABASE FULL CLOUD DATABASE SYNC
  // =========================================================================

  /**
   * Fetches latest state from Supabase database for all 5 entities and updates local cache.
   */
  async syncFromCloud() {
    const client = getSupabaseClient();
    if (!client) {
      this.cloudStatus = 'offline';
      this.notify();
      return { success: false, message: 'Supabase client not available' };
    }

    this.cloudStatus = 'syncing';
    this.notify();

    try {
      const [membersRes, contribsRes, loansRes, repsRes, invsRes] = await Promise.all([
        client.from('members').select('*').order('id', { ascending: true }),
        client.from('contributions').select('*').order('id', { ascending: true }),
        client.from('loans').select('*').order('id', { ascending: true }),
        client.from('loan_repayments').select('*').order('id', { ascending: true }),
        client.from('investments').select('*').order('id', { ascending: true })
      ]);

      if (membersRes.error) throw membersRes.error;
      if (contribsRes.error) throw contribsRes.error;
      if (loansRes.error) throw loansRes.error;
      if (repsRes.error) throw repsRes.error;
      if (invsRes.error) throw invsRes.error;

      // Group loan repayments by loan_id
      const repsByLoan = {};
      (repsRes.data || []).forEach(r => {
        const lid = Number(r.loan_id);
        if (!repsByLoan[lid]) repsByLoan[lid] = [];
        repsByLoan[lid].push({
          id: Number(r.id),
          amt: Number(r.amount),
          date: r.payment_date,
          notes: r.notes || ''
        });
      });

      // Transform Members
      const members = (membersRes.data || []).map(m => {
        const id = Number(m.id);
        const isAdmin = Boolean(m.is_admin);
        let password = m.password;
        if (!password && isAdmin) {
          if (id === 6) password = 'Naveen@321';
          if (id === 10) password = 'sagar@123';
        }
        return {
          id,
          name: m.name,
          email: m.email || '',
          phone: m.phone || '',
          monthly: Number(m.monthly_commitment || 5000),
          is_admin: isAdmin,
          password: password || undefined,
          is_active: m.is_active !== false
        };
      });

      // Transform Contributions
      const contribs = (contribsRes.data || []).map(c => ({
        id: Number(c.id),
        m: Number(c.member_id),
        month: c.month,
        amt: Number(c.amount),
        date: c.payment_date,
        notes: c.notes || ''
      }));

      // Transform Loans
      const loans = (loansRes.data || []).map(l => {
        const lid = Number(l.id);
        return {
          id: lid,
          m: Number(l.member_id),
          amt: Number(l.principal_amount),
          rate: Number(l.monthly_interest_rate || 1.0),
          pct: Number(l.monthly_principal_pct || 5.0),
          n: Number(l.tenure_months || 20),
          date: l.issue_date,
          closed: Boolean(l.is_closed),
          foreclosedDate: l.foreclosed_date || null,
          reps: repsByLoan[lid] || []
        };
      });

      // Transform Investments
      const invs = (invsRes.data || []).map(i => ({
        id: Number(i.id),
        name: i.name,
        type: i.type,
        cost: Number(i.cost_amount),
        val: Number(i.current_value),
        value: Number(i.current_value),
        date: i.purchase_date
      }));

      const monthlyDefault = Number(localStorage.getItem('sumukha_monthly_default')) || this.data.monthly || 10000;

      this.data = {
        monthly: monthlyDefault,
        members: members.length > 0 ? members : this.data.members,
        contribs: contribsRes.data ? contribs : this.data.contribs,
        loans: loansRes.data ? loans : this.data.loans,
        invs: invsRes.data ? invs : this.data.invs
      };

      this.cloudStatus = 'synced';
      this.lastSyncedAt = new Date();
      this.save(); // Cache freshly synced state in localStorage
      return { success: true };
    } catch (e) {
      console.error('Supabase cloud synchronization error:', e);
      this.cloudStatus = 'error';
      this.notify();
      return { success: false, error: e };
    }
  }

  // =========================================================================
  // SESSION & AUTHENTICATION
  // =========================================================================

  setRole(role, memberId = null, adminInfo = null) {
    this.session.role = role;
    if (memberId) this.session.memberId = Number(memberId);
    if (adminInfo) {
      this.session.adminId = adminInfo.id;
      this.session.adminName = adminInfo.name;
    } else if (role !== 'admin') {
      this.session.adminId = null;
      this.session.adminName = null;
    }
    this.saveSession();
  }

  isAdmin() {
    return this.session.role === 'admin';
  }

  getAdminList() {
    return this.data.members.filter(m => m.is_admin);
  }

  getActiveAdmin() {
    if (!this.isAdmin()) return null;
    if (this.session.adminId) {
      return this.data.members.find(m => m.id === this.session.adminId) || null;
    }
    return this.data.members.find(m => m.is_admin) || null;
  }

  getCurrentMember() {
    if (!this.session.memberId) return null;
    return this.data.members.find(m => m.id === Number(this.session.memberId)) || null;
  }

  verifyAdminLogin(identifier, password) {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const admin = this.data.members.find(m => {
      if (!m.is_admin) return false;
      const matchId = String(m.id) === cleanId;
      const matchEmail = m.email && m.email.toLowerCase() === cleanId;
      const matchName = m.name && m.name.toLowerCase() === cleanId;
      return matchId || matchEmail || matchName;
    });

    if (!admin) {
      return { success: false, message: 'Admin account not found. Only authorized admins (Sagar or Naveen) can log in as Admin.' };
    }

    if (admin.password !== cleanPass) {
      return { success: false, message: 'Incorrect password for Admin ' + admin.name + '.' };
    }

    return { success: true, admin };
  }

  async verifyAdminLoginAsync(identifier, password) {
    const localRes = this.verifyAdminLogin(identifier, password);
    if (localRes.success) return localRes;

    // Fallback directly to Supabase in case local cache is not yet refreshed
    const client = getSupabaseClient();
    if (client) {
      try {
        const cleanId = String(identifier || '').trim().toLowerCase();
        const cleanPass = String(password || '').trim();
        const { data } = await client.from('members').select('*').eq('is_admin', true);
        if (data && Array.isArray(data)) {
          const cloudAdmin = data.find(m => {
            const matchId = String(m.id) === cleanId;
            const matchEmail = m.email && m.email.toLowerCase() === cleanId;
            const matchName = m.name && m.name.toLowerCase() === cleanId;
            return matchId || matchEmail || matchName;
          });

          if (cloudAdmin && cloudAdmin.password === cleanPass) {
            const localAdmin = this.data.members.find(m => m.id === cloudAdmin.id);
            if (localAdmin) localAdmin.password = cloudAdmin.password;
            this.save();
            return { success: true, admin: localAdmin || cloudAdmin };
          }
        }
      } catch (e) {
        console.warn('Async cloud password verification fallback note:', e);
      }
    }

    return localRes;
  }

  async updateAdminPassword(adminId, newPassword) {
    const id = Number(adminId);
    const admin = this.data.members.find(m => m.id === id && m.is_admin);
    if (!admin) return { success: false, message: 'Admin account not found.' };

    const trimmed = String(newPassword || '').trim();
    if (trimmed.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    // Optimistically update memory and storage
    admin.password = trimmed;
    this.save();

    // Persist directly to Supabase PostgreSQL database
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('members')
          .update({ password: trimmed })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Supabase password update error:', e);
        return { success: false, message: 'Database sync error: ' + (e.message || 'Could not save password') };
      }
    }

    return { success: true, message: `Password for ${admin.name} updated successfully and saved in database!` };
  }

  // =========================================================================
  // CONTRIBUTIONS OPERATIONS WITH CLOUD SYNC
  // =========================================================================

  async addContribution({ m, month, amt, date, notes }) {
    const numMemberId = Number(m);
    const numAmt = Number(amt);
    const contribDate = date || new Date().toISOString().slice(0, 10);

    // Look for existing contribution for this member & month
    const existingIndex = this.data.contribs.findIndex(c => c.m === numMemberId && c.month === month);
    let contribItem;

    if (existingIndex >= 0) {
      contribItem = {
        ...this.data.contribs[existingIndex],
        amt: numAmt,
        date: contribDate,
        notes: notes || ''
      };
      this.data.contribs[existingIndex] = contribItem;
    } else {
      contribItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        m: numMemberId,
        month,
        amt: numAmt,
        date: contribDate,
        notes: notes || ''
      };
      this.data.contribs.push(contribItem);
    }

    this.save();

    // Sync to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('contributions').upsert({
          id: contribItem.id,
          member_id: contribItem.m,
          month: contribItem.month,
          amount: contribItem.amt,
          payment_date: contribItem.date,
          notes: contribItem.notes || null
        }, { onConflict: 'member_id,month' });
        if (error) throw error;
      } catch (err) {
        console.error('Supabase addContribution sync error:', err);
      }
    }

    return contribItem;
  }

  async addBatchMonthlyContributions(month) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);
    const newItems = [];

    this.data.members.forEach((m, idx) => {
      const alreadyLogged = this.data.contribs.some(c => c.m === m.id && c.month === targetMonth);
      if (!alreadyLogged) {
        const amt = m.monthly || this.data.monthly || 5000;
        const id = Date.now() + idx + 1;
        newItems.push({
          id,
          m: m.id,
          month: targetMonth,
          amt,
          date: today,
          notes: 'Batch recorded'
        });
      }
    });

    if (newItems.length === 0) return { count: 0 };

    this.data.contribs.push(...newItems);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = newItems.map(c => ({
          id: c.id,
          member_id: c.m,
          month: c.month,
          amount: c.amt,
          payment_date: c.date,
          notes: c.notes
        }));
        const { error } = await client.from('contributions').upsert(payload, { onConflict: 'member_id,month' });
        if (error) throw error;
      } catch (err) {
        console.error('Supabase batch contrib sync error:', err);
      }
    }

    return { count: newItems.length };
  }

  async deleteContribution(id) {
    const numId = Number(id);
    this.data.contribs = this.data.contribs.filter(c => c.id !== numId);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('contributions').delete().eq('id', numId);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase deleteContribution sync error:', err);
      }
    }
  }

  async undoLastContribution() {
    if (this.data.contribs.length === 0) return null;
    const last = this.data.contribs.pop();
    this.save();

    const client = getSupabaseClient();
    if (client && last) {
      try {
        await client.from('contributions').delete().eq('id', Number(last.id));
      } catch (err) {
        console.error('Supabase undo contribution sync error:', err);
      }
    }
    return last;
  }

  // =========================================================================
  // LOANS & REPAYMENTS OPERATIONS WITH CLOUD SYNC
  // =========================================================================

  async addLoan({ m, amt, rate, pct, n, date }) {
    const id = Date.now();
    const loan = {
      id,
      m: Number(m),
      amt: Number(amt),
      rate: Number(rate) || 1.0,
      pct: Number(pct) || 5.0,
      n: Number(n) || 20,
      date: date || new Date().toISOString().slice(0, 10),
      closed: false,
      foreclosedDate: null,
      reps: []
    };

    this.data.loans.push(loan);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('loans').insert([{
          id: loan.id,
          member_id: loan.m,
          principal_amount: loan.amt,
          monthly_interest_rate: loan.rate,
          monthly_principal_pct: loan.pct,
          tenure_months: loan.n,
          issue_date: loan.date,
          is_closed: false
        }]);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase addLoan sync error:', err);
      }
    }

    return loan;
  }

  async addLoanRepayment(loanId, amt, date = null, notes = null) {
    const numLoanId = Number(loanId);
    const loan = this.data.loans.find(l => l.id === numLoanId);
    if (!loan) return null;

    const repDate = date || new Date().toISOString().slice(0, 10);
    const rep = {
      id: Date.now(),
      amt: Number(amt),
      date: repDate,
      notes: notes || ''
    };

    loan.reps = loan.reps || [];
    loan.reps.push(rep);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('loan_repayments').insert([{
          id: rep.id,
          loan_id: numLoanId,
          amount: rep.amt,
          payment_date: rep.date,
          notes: rep.notes || null
        }]);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase addLoanRepayment sync error:', err);
      }
    }

    return rep;
  }

  async forecloseLoan(loanId, foreclosureAmount) {
    const numLoanId = Number(loanId);
    const loan = this.data.loans.find(l => l.id === numLoanId);
    if (!loan) return false;

    const today = new Date().toISOString().slice(0, 10);
    const rep = {
      id: Date.now(),
      amt: Number(foreclosureAmount),
      date: today,
      notes: 'Foreclosure settlement'
    };

    loan.reps = loan.reps || [];
    loan.reps.push(rep);
    loan.closed = true;
    loan.foreclosedDate = today;
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        await Promise.all([
          client.from('loans').update({ is_closed: true, foreclosed_date: today }).eq('id', numLoanId),
          client.from('loan_repayments').insert([{
            id: rep.id,
            loan_id: numLoanId,
            amount: rep.amt,
            payment_date: rep.date,
            notes: rep.notes
          }])
        ]);
      } catch (err) {
        console.error('Supabase forecloseLoan sync error:', err);
      }
    }

    return true;
  }

  async deleteLoan(loanId) {
    const numLoanId = Number(loanId);
    this.data.loans = this.data.loans.filter(l => l.id !== numLoanId);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('loan_repayments').delete().eq('loan_id', numLoanId);
        await client.from('loans').delete().eq('id', numLoanId);
      } catch (err) {
        console.error('Supabase deleteLoan sync error:', err);
      }
    }
  }

  // =========================================================================
  // INVESTMENTS OPERATIONS WITH CLOUD SYNC
  // =========================================================================

  async addInvestment({ name, type, cost, date }) {
    const id = Date.now();
    const inv = {
      id,
      name,
      type: type || 'Other',
      cost: Number(cost),
      val: Number(cost),
      value: Number(cost),
      date: date || new Date().toISOString().slice(0, 10)
    };

    this.data.invs.push(inv);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('investments').insert([{
          id: inv.id,
          name: inv.name,
          type: inv.type,
          cost_amount: inv.cost,
          current_value: inv.val,
          purchase_date: inv.date
        }]);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase addInvestment sync error:', err);
      }
    }

    return inv;
  }

  async updateInvestment(id, currentVal) {
    const numId = Number(id);
    const inv = this.data.invs.find(i => i.id === numId);
    if (!inv) return;

    inv.val = Number(currentVal);
    inv.value = Number(currentVal);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('investments').update({
          current_value: inv.val,
          last_updated: new Date().toISOString()
        }).eq('id', numId);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase updateInvestment sync error:', err);
      }
    }
  }

  async deleteInvestment(id) {
    const numId = Number(id);
    this.data.invs = this.data.invs.filter(i => i.id !== numId);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('investments').delete().eq('id', numId);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase deleteInvestment sync error:', err);
      }
    }
  }

  // =========================================================================
  // MEMBERS MANAGEMENT WITH CLOUD SYNC
  // =========================================================================

  async addMember(member) {
    const newId = Math.max(...this.data.members.map(m => m.id), 0) + 1;
    const newMember = {
      id: newId,
      name: member.name.trim(),
      email: (member.email || '').trim(),
      phone: (member.phone || '').trim(),
      monthly: Number(member.monthly) || 5000,
      is_admin: Boolean(member.is_admin),
      password: member.password ? member.password.trim() : undefined,
      is_active: true
    };

    this.data.members.push(newMember);
    this.save();

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          id: newId,
          name: newMember.name,
          email: newMember.email,
          phone: newMember.phone,
          monthly_commitment: newMember.monthly,
          is_admin: newMember.is_admin,
          is_active: true
        };
        if (newMember.password) payload.password = newMember.password;
        const { error } = await client.from('members').insert([payload]);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase addMember sync error:', err);
      }
    }

    return newMember;
  }

  async updateMember(memberId, updatedFields) {
    const id = Number(memberId);
    const member = this.data.members.find(m => m.id === id);
    if (!member) {
      return { success: false, message: 'Member profile not found.' };
    }

    if (updatedFields.name) member.name = updatedFields.name.trim();
    if (updatedFields.email !== undefined) member.email = updatedFields.email.trim();
    if (updatedFields.phone !== undefined) member.phone = updatedFields.phone.trim();
    if (updatedFields.monthly !== undefined) member.monthly = Number(updatedFields.monthly);
    if (updatedFields.is_admin !== undefined) member.is_admin = Boolean(updatedFields.is_admin);
    if (updatedFields.password !== undefined && updatedFields.password.trim() !== '') {
      member.password = updatedFields.password.trim();
    }

    this.save();

    // Sync updated member to Supabase PostgreSQL database
    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          name: member.name,
          email: member.email,
          phone: member.phone,
          monthly_commitment: member.monthly || 5000,
          is_admin: member.is_admin
        };
        if (member.password) payload.password = member.password;

        const { error } = await client
          .from('members')
          .update(payload)
          .eq('id', member.id);
        if (error) throw error;
      } catch (e) {
        console.warn('Supabase member update sync notice:', e);
      }
    }

    return { success: true, message: `Details for "${member.name}" successfully updated and saved in database.` };
  }

  updateMonthlyDefault(amt) {
    this.data.monthly = Number(amt) || 10000;
    try {
      localStorage.setItem('sumukha_monthly_default', String(this.data.monthly));
    } catch (e) {}
    this.save();
  }

  // =========================================================================
  // BACKUP & RESTORE WITH CLOUD SYNC
  // =========================================================================

  async restoreBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file: content is not a valid JSON object.');
    }
    if (!Array.isArray(backupData.members) || backupData.members.length === 0) {
      throw new Error('Invalid backup file: missing or empty members array.');
    }

    // Ensure Sagar and Naveen retain admin status if present
    const sagar = backupData.members.find(m => m.id === 10 || (m.name && m.name.toLowerCase() === 'sagar'));
    if (sagar) {
      sagar.is_admin = true;
      if (!sagar.password) sagar.password = "sagar@123";
    }
    const naveen = backupData.members.find(m => m.id === 6 || (m.name && m.name.toLowerCase() === 'naveen'));
    if (naveen) {
      naveen.is_admin = true;
      if (!naveen.password) naveen.password = "Naveen@321";
    }

    this.data = {
      monthly: Number(backupData.monthly) || 10000,
      members: backupData.members,
      contribs: Array.isArray(backupData.contribs) ? backupData.contribs : [],
      loans: Array.isArray(backupData.loans) ? backupData.loans : [],
      invs: Array.isArray(backupData.invs) ? backupData.invs : []
    };

    this.save();

    // Sync all restored entities to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        // Members
        for (const m of this.data.members) {
          await client.from('members').upsert({
            id: m.id,
            name: m.name,
            email: m.email || '',
            phone: m.phone || '',
            monthly_commitment: m.monthly || 5000,
            is_admin: Boolean(m.is_admin),
            password: m.password || null
          });
        }

        // Contributions
        if (this.data.contribs.length > 0) {
          const cPayload = this.data.contribs.map(c => ({
            id: c.id,
            member_id: c.m,
            month: c.month,
            amount: c.amt,
            payment_date: c.date,
            notes: c.notes || null
          }));
          await client.from('contributions').upsert(cPayload, { onConflict: 'member_id,month' });
        }

        // Loans & Repayments
        for (const l of this.data.loans) {
          await client.from('loans').upsert({
            id: l.id,
            member_id: l.m,
            principal_amount: l.amt,
            monthly_interest_rate: l.rate,
            monthly_principal_pct: l.pct,
            tenure_months: l.n,
            issue_date: l.date,
            is_closed: Boolean(l.closed),
            foreclosed_date: l.foreclosedDate || null
          });

          if (Array.isArray(l.reps)) {
            for (const r of l.reps) {
              await client.from('loan_repayments').upsert({
                id: r.id || Date.now(),
                loan_id: l.id,
                amount: r.amt,
                payment_date: r.date,
                notes: r.notes || null
              });
            }
          }
        }

        // Investments
        for (const i of this.data.invs) {
          await client.from('investments').upsert({
            id: i.id,
            name: i.name,
            type: i.type,
            cost_amount: i.cost,
            current_value: i.val || i.value || i.cost,
            purchase_date: i.date
          });
        }
      } catch (e) {
        console.warn('Supabase restore sync note:', e);
      }
    }

    return {
      membersCount: this.data.members.length,
      contribsCount: this.data.contribs.length,
      loansCount: this.data.loans.length,
      invsCount: this.data.invs.length
    };
  }
}

export const state = new AppState();
