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

// Drop the current socket so the next subscription reconnects with the new token
function resetSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

// ─── Main API object ─────────────────────────────────────────────────────────
export const bccApi = {
  // Check if backend is reachable
  async isReachable() {
    try {
      const response = await fetch(`${API_BASE}/health/ready`);
      return response.ok;
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
    resetSocket();
    return data;
  },

  async register(first_name, last_name, email, password, phone) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, email, password, phone }),
    });
    setToken(data.access);
    setUser(data.user);
    resetSocket();
    return data;
  },

  async loginAsGuest() {
    const data = await apiFetch('/api/auth/guest', { method: 'POST' });
    setToken(data.access);
    setUser(data.user);
    resetSocket();
    return data;
  },

  async createStaffAccount({ first_name, last_name, email, phone, password, role }) {
    return apiFetch('/api/auth/staff', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, email, phone, password, role }),
    });
  },

  async getStaffAccounts() {
    return apiFetch('/api/auth/staff');
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
    const data = await apiFetch('/api/incidents');
    return Array.isArray(data) ? data : [];
  },

  // Throws on failure so the caller can roll back its optimistic update
  async updateIncident(id, updates) {
    return apiFetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
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
    const data = await apiFetch('/api/teams');
    return Array.isArray(data) ? data : [];
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

  // Throws on failure so the UI never reports an unpublished bulletin as sent
  async createBulletin(bulletin) {
    return apiFetch('/api/bulletins', {
      method: 'POST',
      body: JSON.stringify(bulletin),
    });
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
    } catch (error) {
      throw new Error(`Could not prepare a manual share message: ${error.message}`);
    }
  },

  async getWhatsAppSupportLink(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      return await apiFetch(`/api/whatsapp/support-link?${query}`);
    } catch (error) {
      throw new Error(`No verified contact channel is available: ${error.message}`);
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
