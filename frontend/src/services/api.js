/**
 * BCC SmartConnect — Frontend API Client
 * Connects to the Express backend via REST + Socket.io (not Supabase SDK)
 * Base URL is controlled by VITE_API_URL environment variable.
 */

import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Token helpers (stored in sessionStorage for the admin portal) ─────────────
function getToken() {
  return sessionStorage.getItem('bcc_token');
}
function setToken(token) {
  if (token) sessionStorage.setItem('bcc_token', token);
  else sessionStorage.removeItem('bcc_token');
}
function setUser(user) {
  if (user) sessionStorage.setItem('bcc_user', JSON.stringify(user));
  else sessionStorage.removeItem('bcc_user');
}
export function getSavedUser() {
  try {
    const raw = sessionStorage.getItem('bcc_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Auth-aware fetch wrapper ─────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}



// ─── Socket.io singleton for realtime dispatch updates ─────────────────────────
let _socket = null;
function getSocket() {
  if (_socket) return _socket;
  const token = getToken();
  _socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
    auth: { token: token || '' },
    query: { room: 'admin' },
    autoConnect: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  _socket.on('connect', () => console.log('[Socket.io] Connected to BCC backend'));
  _socket.on('disconnect', (reason) => console.warn('[Socket.io] Disconnected:', reason));
  _socket.on('connect_error', (err) => console.warn('[Socket.io] Connect error:', err.message));
  return _socket;
}

// ─── Main API object ─────────────────────────────────────────────────────────
export const bccApi = {
  // Check if backend is reachable
  async isReachable() {
    try {
      await fetch(`${API_BASE}/health`);
      return true;
    } catch {
      return false;
    }
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  async register(first_name, last_name, email, password, phone) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, email, password, phone }),
    });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  async loginAsGuest() {
    const data = await apiFetch('/api/auth/guest', { method: 'POST' });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  logout() {
    setToken(null);
    setUser(null);
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
  },

  // ── Incidents ──────────────────────────────────────────────────────────────
  async getIncidents() {
    try {
      const data = await apiFetch('/api/incidents');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('getIncidents failed:', err.message);
      return [];
    }
  },

  async updateIncident(id, updates) {
    try {
      return await apiFetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('updateIncident failed:', err.message);
      return updates;
    }
  },

  async getIncidentByRef(reference) {
    try {
      return await apiFetch(`/api/incidents/track/${reference}`);
    } catch (err) {
      console.error('getIncidentByRef failed:', err.message);
      return null;
    }
  },

  async reportIncident(payload) {
    return apiFetch('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Field Teams ────────────────────────────────────────────────────────────
  async getFieldTeams() {
    try {
      const data = await apiFetch('/api/teams');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('getFieldTeams failed:', err.message);
      return [];
    }
  },

  async updateTeam(id, updates) {
    return apiFetch(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // ── Bulletins ──────────────────────────────────────────────────────────────
  async getBulletins() {
    try {
      const data = await apiFetch('/api/bulletins');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('getBulletins failed:', err.message);
      return [];
    }
  },

  async createBulletin(bulletin) {
    try {
      return await apiFetch('/api/bulletins', {
        method: 'POST',
        body: JSON.stringify(bulletin),
      });
    } catch (err) {
      console.error('createBulletin failed:', err.message);
      return { id: `b-${Date.now()}`, ...bulletin, created_at: new Date().toISOString() };
    }
  },

  // ── WhatsApp & Community Channels ─────────────────────────────────────────
  async getWhatsAppChannels(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.ward) query.set('ward', params.ward);
      if (params.search) query.set('search', params.search);
      const url = `/api/whatsapp/channels${query.toString() ? `?${query.toString()}` : ''}`;
      return await apiFetch(url);
    } catch (err) {
      console.warn('getWhatsAppChannels failed:', err.message);
      return [];
    }
  },

  async createWhatsAppChannel(channel) {
    return apiFetch('/api/whatsapp/channels', {
      method: 'POST',
      body: JSON.stringify(channel),
    });
  },

  async formatWhatsAppBroadcast(broadcast) {
    try {
      return await apiFetch('/api/whatsapp/format-broadcast', {
        method: 'POST',
        body: JSON.stringify(broadcast),
      });
    } catch {
      // Offline fallback formatter
      const text = `🏛️ *CITY OF BULAWAYO — SMARTCONNECT*\n📢 *PUBLIC NOTICE*\n━━━━━━━━━━━━━━━━━━\n📌 *${broadcast.title}*\n📍 *Area:* ${broadcast.target_ward || 'All Wards'}\n\n${broadcast.body}\n━━━━━━━━━━━━━━━━━━\n📢 Official Channel: https://whatsapp.com/channel/0029VbA48WT1iUxQRxulvU41\n💬 Customer Care (0784 136 505): https://wa.me/263784136505\n💧 Water Meter Readings (0713 347 319): https://wa.me/263713347319`;
      return {
        formattedMessage: text,
        shareUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
        webShareUrl: `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      };
    }
  },

  async getWhatsAppSupportLink(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiFetch(`/api/whatsapp/support-link?${query}`);
    } catch {
      if (params.purpose === 'meter_reading') {
        const text = 'Hello City of Bulawayo,\n\nI am submitting my monthly water meter reading.\nAccount No: \nAddress: \nMeter Reading: ';
        return {
          phoneNumber: '+263 71 334 7319',
          whatsappUrl: `https://wa.me/263713347319?text=${encodeURIComponent(text)}`,
          text,
        };
      }
      const bccNumber = '263784136505';
      const text = params.ref
        ? `Hello City of Bulawayo Customer Care, inquiring about Report Ref: ${params.ref} (${params.type || 'Fault'})`
        : 'Hello City of Bulawayo Customer Care, I would like to inquire about municipal services.';
      return {
        phoneNumber: '+263 78 413 6505',
        whatsappUrl: `https://wa.me/${bccNumber}?text=${encodeURIComponent(text)}`,
        text,
      };
    }
  },

  // ── Real-time Socket.io subscriptions ─────────────────────────────────────
  subscribeToChanges({ onNewIncident, onUpdateIncident, onNewBulletin, onTeamUpdate }) {
    const socket = getSocket();

    if (onNewIncident) {
      socket.on('incident:new', onNewIncident);
    }
    if (onUpdateIncident) {
      socket.on('incident:update', onUpdateIncident);
    }
    if (onNewBulletin) {
      socket.on('bulletin:new', onNewBulletin);
    }
    if (onTeamUpdate) {
      socket.on('team:update', onTeamUpdate);
    }

    // Return cleanup function
    return () => {
      socket.off('incident:new', onNewIncident);
      socket.off('incident:update', onUpdateIncident);
      socket.off('bulletin:new', onNewBulletin);
      socket.off('team:update', onTeamUpdate);
    };
  },
};
