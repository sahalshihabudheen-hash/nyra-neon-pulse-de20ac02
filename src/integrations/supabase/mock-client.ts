import { famousSongs } from '@/data/famousSongs';

// Mock Supabase Client for local-only mode
export const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
    getUser: async () => ({ data: { user: mockUser }, error: null }),
    signInWithPassword: async () => ({ data: { user: mockUser, session: {} }, error: null }),
    signUp: async () => ({ data: { user: mockUser, session: {} }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      callback('SIGNED_IN', { user: mockUser });
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    updateUser: async () => ({ data: { user: mockUser }, error: null }),
  },
  from: (table: string) => {
    let currentData = getLocalData(table);
    return {
      select: () => ({
        eq: (col: string, val: any) => ({
          single: async () => ({ data: currentData.find((item: any) => item[col] === val) || null, error: null }),
          maybeSingle: async () => ({ data: currentData.find((item: any) => item[col] === val) || null, error: null }),
          order: async () => ({ data: currentData.filter((item: any) => item[col] === val), error: null }),
        }),
        order: async () => ({ data: currentData, error: null }),
        async then(resolve: any) { resolve({ data: currentData, error: null }) }
      }),
      insert: (data: any) => ({
        async then(resolve: any) {
          saveLocalData(table, data);
          resolve({ data, error: null });
        }
      }),
      upsert: (data: any) => ({
        async then(resolve: any) {
          saveLocalData(table, data);
          resolve({ data, error: null });
        }
      }),
      update: (data: any) => ({
        eq: () => ({
          async then(resolve: any) { resolve({ data, error: null }) }
        })
      }),
      delete: () => ({
        eq: (col: string, val: any) => ({
          async then(resolve: any) {
            const filtered = currentData.filter((item: any) => item[col] !== val);
            localStorage.setItem(`mock_${table}`, JSON.stringify(filtered));
            resolve({ error: null });
          }
        })
      }),
    }
  },
  rpc: async (name: string) => {
    if (name === 'has_role') return { data: true, error: null };
    return { data: null, error: null };
  },
  functions: {
    invoke: async (name: string, options: any) => {
      if (name === 'youtube-search') {
        const query = options.query?.q?.toLowerCase() || '';
        const results = famousSongs.filter(s => 
          s.title.toLowerCase().includes(query) || 
          s.channel.toLowerCase().includes(query)
        );
        return { data: results.length > 0 ? results : famousSongs.slice(0, 5), error: null };
      }
      return { data: null, error: null };
    }
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=128&h=128&fit=crop' } }),
    })
  }
};

const mockUser = {
  id: 'guest-user',
  email: 'guest@example.com',
  user_metadata: { display_name: 'Guest User' },
  role: 'authenticated',
  created_at: new Date().toISOString(),
};

// Helper to handle local storage
const getLocalData = (table: string) => {
  const data = localStorage.getItem(`mock_${table}`);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = (table: string, newItem: any) => {
  const existing = getLocalData(table);
  const updated = Array.isArray(newItem) ? [...existing, ...newItem] : [...existing, newItem];
  localStorage.setItem(`mock_${table}`, JSON.stringify(updated));
};
