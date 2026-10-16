/**
 * Sumukha Co-Op Society - State Management & Data Store
 * Supports Dual-Mode: Local Storage & Supabase Cloud Integration
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
    { id: 6, name: "Naveen", email: "naveenkumarm6563@gmail.com", phone: "8951264083", monthly: 5000, is_admin: true, password: "Naveen@123" },
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
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('sumukha_society_v3') || localStorage.getItem('sumukha_society_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          // Strictly configure Admin 1: Sagar
          const sagar = parsed.members.find(m => m.id === 10 || m.name.toLowerCase() === 'sagar');
          if (sagar) {
            sagar.id = 10;
            sagar.name = "Sagar";
            sagar.email = "mysagar95@gmail.com";
            sagar.phone = "8892983068";
            sagar.is_admin = true;
            if (!sagar.password) sagar.password = "sagar@123";
          }

          // Strictly configure Admin 2: Naveen
          const naveen = parsed.members.find(m => m.id === 6 || m.name.toLowerCase() === 'naveen');
          if (naveen) {
            naveen.id = 6;
            naveen.name = "Naveen";
            naveen.email = "naveenkumarm6563@gmail.com";
            naveen.phone = "8951264083";
            naveen.is_admin = true;
            if (!naveen.password) naveen.password = "Naveen@123";
          }

          // Strictly ensure ONLY Sagar and Naveen have admin role
          parsed.members.forEach(m => {
            if (m.id !== 10 && m.id !== 6) {
              m.is_admin = false;
              delete m.password;
            }
          });

          // Save into v4 storage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch (e) {}

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
      // Clear any legacy persistent admin sessions from localStorage
      localStorage.removeItem(SESSION_KEY);
      const stored = sessionStorage.getItem(SESSION_KEY);
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

  // Session & Authentication
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

  async updateAdminPassword(adminId, newPassword) {
    const admin = this.data.members.find(m => m.id === Number(adminId) && m.is_admin);
    if (!admin) return { success: false, message: 'Admin account not found.' };

    const trimmed = String(newPassword || '').trim();
    if (trimmed.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    admin.password = trimmed;
    this.save();

    // Persist to Supabase if available
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('members').update({ password: admin.password }).eq('id', admin.id);
      }
    } catch (e) {
      console.warn('Supabase password sync note:', e);
    }

    return { success: true, message: `Password for ${admin.name} updated successfully and saved in database!` };
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
    try {
      const client = getSupabaseClient();
      if (client) {
        const payload = {
          name: member.name,
          email: member.email,
          phone: member.phone,
          monthly_commitment: member.monthly || 5000,
          is_admin: member.is_admin
        };
        if (member.password) payload.password = member.password;

        await client
          .from('members')
          .update(payload)
          .eq('id', member.id);
      }
    } catch (e) {
      console.warn('Supabase member update sync notice:', e);
    }

    return { success: true, message: `Details for "${member.name}" successfully updated and saved in database.` };
  }
}

export const state = new AppState();
