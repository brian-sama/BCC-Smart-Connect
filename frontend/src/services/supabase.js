import { createClient } from '@supabase/supabase-js';
import { initialIncidents, fieldTeams as mockTeams } from '../data/mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-public-key-here'
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Initial bulletins fallback
const mockBulletins = [
  {
    id: 'b-1',
    title: 'Criterion Water Works Maintenance',
    body: 'Scheduled water supply reduction in Eastern suburbs between 08:00 and 17:00 tomorrow due to valve rehabilitation.',
    category: 'Water Cut',
    target_ward: 'Eastern Suburbs',
    is_urgent: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b-2',
    title: 'Luveve Road Resurfacing Update',
    body: 'Asphalt paving along Luveve Road near Mpilo Hospital is progressing. Single lane traffic diversions in place.',
    category: 'Roads',
    target_ward: 'Luveve & Magwegwe',
    is_urgent: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b-3',
    title: 'Refuse Collection Cycle (Ward 28)',
    body: 'Domestic refuse compaction trucks will service Cowdray Park sections 1 to 6 this Friday morning.',
    category: 'Health',
    target_ward: 'Cowdray Park (Ward 28)',
    is_urgent: false,
    created_at: new Date().toISOString(),
  },
];

export const bccApi = {
  isConfigured() {
    return isConfigured;
  },

  async getIncidents() {
    if (!isConfigured) {
      return initialIncidents;
    }
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data && data.length > 0 ? data : initialIncidents;
    } catch (err) {
      console.warn('Supabase fetch incidents fallback to mock:', err.message);
      return initialIncidents;
    }
  },

  async updateIncident(id, updates) {
    if (!isConfigured) {
      return updates;
    }
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      if (updates.status === 'Resolved') {
        payload.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Also log to timeline if notes provided
      if (updates.resolution_notes || updates.status) {
        await supabase.from('incident_timeline').insert([
          {
            incident_id: id,
            actor_name: 'Chief Dispatcher',
            actor_role: 'Dispatcher',
            status: updates.status || 'Updated',
            notes: updates.resolution_notes || `Ticket updated: ${updates.status || ''}`,
          },
        ]);
      }

      return data;
    } catch (err) {
      console.error('Supabase update incident failed:', err.message);
      return updates;
    }
  },

  async getFieldTeams() {
    if (!isConfigured) {
      return mockTeams;
    }
    try {
      const { data, error } = await supabase
        .from('field_teams')
        .select('*')
        .order('name');

      if (error) throw error;
      return data && data.length > 0 ? data : mockTeams;
    } catch (err) {
      console.warn('Supabase fetch teams fallback:', err.message);
      return mockTeams;
    }
  },

  async getBulletins() {
    if (!isConfigured) {
      return mockBulletins;
    }
    try {
      const { data, error } = await supabase
        .from('bulletins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data && data.length > 0 ? data : mockBulletins;
    } catch (err) {
      console.warn('Supabase fetch bulletins fallback:', err.message);
      return mockBulletins;
    }
  },

  async createBulletin(bulletin) {
    if (!isConfigured) {
      return { id: `b-${Date.now()}`, ...bulletin, created_at: new Date().toISOString() };
    }
    try {
      const { data, error } = await supabase
        .from('bulletins')
        .insert([
          {
            title: bulletin.title,
            body: bulletin.body,
            category: bulletin.category || 'Notice',
            target_ward: bulletin.target_ward || 'All Bulawayo Wards',
            is_urgent: bulletin.target_type === 'Emergency' || bulletin.is_urgent || false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase create bulletin failed:', err.message);
      return { id: `b-${Date.now()}`, ...bulletin, created_at: new Date().toISOString() };
    }
  },

  subscribeToChanges({ onNewIncident, onUpdateIncident, onNewBulletin }) {
    if (!isConfigured) return () => {};

    const incidentChannel = supabase
      .channel('public:incidents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          if (onNewIncident) onNewIncident(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          if (onUpdateIncident) onUpdateIncident(payload.new);
        }
      )
      .subscribe();

    const bulletinChannel = supabase
      .channel('public:bulletins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bulletins' },
        (payload) => {
          if (onNewBulletin) onNewBulletin(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(bulletinChannel);
    };
  },
};
