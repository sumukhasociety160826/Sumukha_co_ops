/**
 * Sumukha Co-Op Society - State Management & Data Store
 * Supports Dual-Mode: Resilient Local Cache & Real-Time Supabase Cloud Database Sync
 * Features:
 *  1. Cryptographic Password Hashing & Verification (SHA-256 with Salt)
 *  2. Regulatory Co-Op Financial Audit Trail & Integrity Logging
 *  3. Real-Time Multi-Device Collaboration via Supabase Realtime Channels
 *  4. Offline-First PWA Local Storage Synchronization
 */

import { getSupabaseClient } from './config.js';

// =============================================================================
// CRYPTOGRAPHIC SECURITY: SHA-256 HASHING & SECURE PASSWORD VERIFICATION
// =============================================================================

export async function sha256Hash(text, salt = 'sumukha_coop_2026') {
  const clean = String(text || '').trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${clean}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `sha256$${salt}$${hashHex}`;
    } catch (e) {
      console.warn('Subtle crypto hash error, using fallback:', e);
    }
  }
  return clean;
}

export async function verifyPasswordHash(plainPassword, storedPassword) {
  if (!storedPassword) return false;
  const cleanInput = String(plainPassword || '').trim();
  const cleanStored = String(storedPassword || '').trim();

  // If already stored as sha256$<salt>$<hash>
  if (cleanStored.startsWith('sha256$')) {
    const parts = cleanStored.split('$');
    const salt = parts[1] || 'sumukha_coop_2026';
    const computed = await sha256Hash(cleanInput, salt);
    return computed === cleanStored;
  }

  // Legacy plaintext match
  return cleanInput === cleanStored;
}

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
const AUDIT_STORAGE_KEY = 'sumukha_audit_logs_v4';

export class AppState {
  constructor() {
    this.data = this.loadData();
    this.session = this.loadSession();
    this.auditLogs = this.loadAuditLogs();
    this.listeners = [];
    this.cloudStatus = 'idle'; // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
    this.lastSyncedAt = null;
    this.realtimeChannel = null;
    this.isRealtimeActive = false;
    this.syncDebounceTimer = null;
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

  loadAuditLogs() {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Storage quota exceeded or error saving data:', e);
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

  saveAuditLogs() {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs.slice(0, 500)));
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
      try {
        listener(this.data, this.session);
      } catch (e) {
        console.error('State listener notification error:', e);
      }
    }
  }

  // =========================================================================
  // FINANCIAL AUDIT TRAIL RECORDING (CO-OP REGULATORY INTEGRITY)
  // =========================================================================

  async recordAuditLog({ action, targetType, targetId = null, details = {} }) {
    const actor = this.getActiveAdmin() || { id: this.session.adminId || null, name: this.session.adminName || 'Admin' };
    const logEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      actor_id: actor.id,
      actor_name: actor.name,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {}
    };

    // Prepend to local memory & persist to localStorage
    this.auditLogs.unshift(logEntry);
    this.saveAuditLogs();

    // Persist to Supabase audit_logs table
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('audit_logs').insert([{
          id: logEntry.id,
          actor_id: logEntry.actor_id,
          actor_name: logEntry.actor_name,
          action: logEntry.action,
          target_type: logEntry.target_type,
          target_id: logEntry.target_id,
          details: logEntry.details,
          created_at: logEntry.timestamp
        }]);
      } catch (err) {
        // Non-fatal if table not yet run in SQL editor
        console.warn('Supabase audit log insert note:', err);
      }
    }

    return logEntry;
  }

  getAuditLogs() {
    return this.auditLogs || [];
  }

  // =========================================================================
  // SUPABASE REALTIME MULTI-DEVICE SYNC
  // =========================================================================

  initRealtimeSync() {
    if (this.realtimeChannel) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      this.realtimeChannel = client
        .channel('public:society_realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          console.log('[Realtime] Live DB update received:', payload.eventType, payload.table);
          if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
          this.syncDebounceTimer = setTimeout(() => {
            this.syncFromCloud(true); // background silent update
          }, 400);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isRealtimeActive = true;
            this.notify();
          }
        });
    } catch (e) {
      console.warn('Realtime subscription setup notice:', e);
    }
  }

  // =========================================================================
  // SUPABASE FULL CLOUD DATABASE SYNC
  // =========================================================================

  async syncFromCloud(isBackground = false) {
    const client = getSupabaseClient();
    if (!client) {
      this.cloudStatus = 'offline';
      this.notify();
      return { success: false, message: 'Supabase client not available' };
    }

    if (!isBackground) {
      this.cloudStatus = 'syncing';
      this.notify();
    }

    try {
      const [membersRes, contribsRes, loansRes, repsRes, invsRes, auditRes] = await Promise.all([
        client.from('members').select('*').order('id', { ascending: true }),
        client.from('contributions').select('*').order('id', { ascending: true }),
        client.from('loans').select('*').order('id', { ascending: true }),
        client.from('loan_repayments').select('*').order('id', { ascending: true }),
        client.from('investments').select('*').order('id', { ascending: true }),
        client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
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

      // Update Audit Logs if table exists in Supabase
      if (auditRes && Array.isArray(auditRes.data) && auditRes.data.length > 0) {
        const cloudLogs = auditRes.data.map(a => ({
          id: Number(a.id),
          timestamp: a.created_at,
          actor_id: a.actor_id,
          actor_name: a.actor_name,
          action: a.action,
          target_type: a.target_type,
          target_id: a.target_id,
          details: a.details || {}
        }));
        this.auditLogs = cloudLogs;
        this.saveAuditLogs();
      }

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
      this.save();

      // Ensure Realtime channel is initialized
      this.initRealtimeSync();

      return { success: true };
    } catch (e) {
      console.error('Supabase cloud synchronization error:', e);
      this.cloudStatus = 'error';
      this.notify();
      return { success: false, error: e };
    }
  }

  // =========================================================================
  // SESSION & AUTHENTICATION WITH HASH VERIFICATION
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

  async verifyAdminLogin(identifier, password) {
    return this.verifyAdminLoginAsync(identifier, password);
  }

  async verifyAdminLoginAsync(identifier, password) {
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
      return { success: false, message: 'Invalid administrator credentials. Access restricted.' };
    }

    const isValid = await verifyPasswordHash(cleanPass, admin.password);

    if (isValid) {
      // If password was stored as plaintext, seamlessly upgrade to salted sha256 hash
      if (admin.password && !admin.password.startsWith('sha256$')) {
        try {
          const hashed = await sha256Hash(cleanPass);
          admin.password = hashed;
          this.save();
          const client = getSupabaseClient();
          if (client) {
            await client.from('members').update({ password: hashed }).eq('id', admin.id);
          }
        } catch (e) {}
      }
      return { success: true, admin };
    }

    // Direct cloud fallback in case local cache is stale
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.from('members').select('*').eq('is_admin', true);
        if (data && Array.isArray(data)) {
          const cloudAdmin = data.find(m => {
            const matchId = String(m.id) === cleanId;
            const matchEmail = m.email && m.email.toLowerCase() === cleanId;
            const matchName = m.name && m.name.toLowerCase() === cleanId;
            return matchId || matchEmail || matchName;
          });

          if (cloudAdmin) {
            const cloudValid = await verifyPasswordHash(cleanPass, cloudAdmin.password);
            if (cloudValid) {
              const localAdmin = this.data.members.find(m => m.id === cloudAdmin.id);
              if (localAdmin) localAdmin.password = cloudAdmin.password;
              this.save();
              return { success: true, admin: localAdmin || cloudAdmin };
            }
          }
        }
      } catch (e) {
        console.warn('Async cloud password verification fallback note:', e);
      }
    }

    return { success: false, message: 'Incorrect password for Admin ' + admin.name + '.' };
  }

  async updateAdminPassword(adminId, newPassword) {
    const id = Number(adminId);
    const admin = this.data.members.find(m => m.id === id && m.is_admin);
    if (!admin) return { success: false, message: 'Admin account not found.' };

    const trimmed = String(newPassword || '').trim();
    if (trimmed.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    // Securely hash password with SHA-256 and salt
    const hashedPassword = await sha256Hash(trimmed);
    admin.password = hashedPassword;
    this.save();

    // Persist to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('members')
          .update({ password: hashedPassword })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Supabase password update error:', e);
        return { success: false, message: 'Database sync error: ' + (e.message || 'Could not save password') };
      }
    }

    await this.recordAuditLog({
      action: 'ADMIN_PASSWORD_CHANGED',
      targetType: 'auth',
      targetId: id,
      details: { adminName: admin.name }
    });

    return { success: true, message: `Password for ${admin.name} updated securely with encryption and saved in database!` };
  }

  // =========================================================================
  // CONTRIBUTIONS OPERATIONS WITH CLOUD SYNC & AUDIT TRAIL
  // =========================================================================

  async addContribution({ m, month, amt, date, notes }) {
    const numMemberId = Number(m);
    const numAmt = Number(amt);
    const contribDate = date || new Date().toISOString().slice(0, 10);
    const member = this.data.members.find(x => x.id === numMemberId);

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

    await this.recordAuditLog({
      action: 'CONTRIBUTION_RECORDED',
      targetType: 'contribution',
      targetId: contribItem.id,
      details: {
        memberName: member ? member.name : `Member #${numMemberId}`,
        month,
        amount: numAmt,
        date: contribDate
      }
    });

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

    await this.recordAuditLog({
      action: 'BATCH_CONTRIBUTIONS_RECORDED',
      targetType: 'contribution',
      targetId: null,
      details: {
        month: targetMonth,
        count: newItems.length,
        totalAmount: newItems.reduce((sum, c) => sum + c.amt, 0)
      }
    });

    return { count: newItems.length };
  }

  async deleteContribution(id) {
    const numId = Number(id);
    const target = this.data.contribs.find(c => c.id === numId);
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

    await this.recordAuditLog({
      action: 'CONTRIBUTION_DELETED',
      targetType: 'contribution',
      targetId: numId,
      details: target ? { memberId: target.m, month: target.month, amount: target.amt } : {}
    });
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

    if (last) {
      await this.recordAuditLog({
        action: 'CONTRIBUTION_UNDONE',
        targetType: 'contribution',
        targetId: last.id,
        details: { memberId: last.m, month: last.month, amount: last.amt }
      });
    }

    return last;
  }

  // =========================================================================
  // LOANS & REPAYMENTS OPERATIONS WITH CLOUD SYNC & AUDIT TRAIL
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

    const borrower = this.data.members.find(x => x.id === loan.m);

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

    await this.recordAuditLog({
      action: 'LOAN_SANCTIONED',
      targetType: 'loan',
      targetId: loan.id,
      details: {
        borrowerName: borrower ? borrower.name : `Member #${loan.m}`,
        principalAmount: loan.amt,
        interestRatePct: loan.rate,
        tenureMonths: loan.n,
        issueDate: loan.date
      }
    });

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

    await this.recordAuditLog({
      action: 'LOAN_REPAYMENT_RECORDED',
      targetType: 'loan_repayment',
      targetId: rep.id,
      details: { loanId: numLoanId, amount: rep.amt, date: rep.date }
    });

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

    await this.recordAuditLog({
      action: 'LOAN_FORECLOSED',
      targetType: 'loan',
      targetId: numLoanId,
      details: { settlementAmount: foreclosureAmount, foreclosedDate: today }
    });

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
        console.error('Supabase deleteLoan error:', err);
      }
    }

    await this.recordAuditLog({
      action: 'LOAN_RECORD_DELETED',
      targetType: 'loan',
      targetId: numLoanId,
      details: {}
    });
  }

  // =========================================================================
  // INVESTMENTS OPERATIONS WITH CLOUD SYNC & AUDIT TRAIL
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

    await this.recordAuditLog({
      action: 'INVESTMENT_RECORDED',
      targetType: 'investment',
      targetId: inv.id,
      details: { name: inv.name, type: inv.type, cost: inv.cost }
    });

    return inv;
  }

  async updateInvestment(id, currentVal) {
    const numId = Number(id);
    const inv = this.data.invs.find(i => i.id === numId);
    if (!inv) return;

    const oldVal = inv.val;
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

    await this.recordAuditLog({
      action: 'INVESTMENT_VALUATION_UPDATED',
      targetType: 'investment',
      targetId: numId,
      details: { investmentName: inv.name, previousValue: oldVal, updatedValue: inv.val }
    });
  }

  async deleteInvestment(id) {
    const numId = Number(id);
    const inv = this.data.invs.find(i => i.id === numId);
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

    await this.recordAuditLog({
      action: 'INVESTMENT_DELETED',
      targetType: 'investment',
      targetId: numId,
      details: inv ? { name: inv.name, cost: inv.cost } : {}
    });
  }

  // =========================================================================
  // MEMBERS MANAGEMENT WITH CLOUD SYNC & AUDIT TRAIL
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

    await this.recordAuditLog({
      action: 'MEMBER_REGISTERED',
      targetType: 'member',
      targetId: newId,
      details: { name: newMember.name, monthly: newMember.monthly, isAdmin: newMember.is_admin }
    });

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

    await this.recordAuditLog({
      action: 'MEMBER_DETAILS_UPDATED',
      targetType: 'member',
      targetId: id,
      details: { name: member.name, updatedFields }
    });

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
  // BACKUP & RESTORE WITH CLOUD SYNC & AUDIT TRAIL
  // =========================================================================

  async restoreBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file: content is not a valid JSON object.');
    }
    if (!Array.isArray(backupData.members) || backupData.members.length === 0) {
      throw new Error('Invalid backup file: missing or empty members array.');
    }

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

    const client = getSupabaseClient();
    if (client) {
      try {
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

    await this.recordAuditLog({
      action: 'DATABASE_BACKUP_RESTORED',
      targetType: 'system',
      targetId: null,
      details: {
        membersCount: this.data.members.length,
        contribsCount: this.data.contribs.length,
        loansCount: this.data.loans.length,
        invsCount: this.data.invs.length
      }
    });

    return {
      membersCount: this.data.members.length,
      contribsCount: this.data.contribs.length,
      loansCount: this.data.loans.length,
      invsCount: this.data.invs.length
    };
  }
}

export const state = new AppState();
