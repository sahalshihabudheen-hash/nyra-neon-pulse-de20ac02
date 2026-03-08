import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Shield, ShieldAlert, Users, LogOut, ArrowLeft, Loader2, Music, ListMusic, Clock, Gamepad2, MapPin, Smartphone, Monitor, Laptop, Tablet, Copy, KeyRound, Wrench, X, Plus, Trash2, Circle, Search, Watch, Wifi, WifiOff } from 'lucide-react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';

const VPN_KEYWORDS = ['vpn', 'proxy', 'hosting', 'datacenter', 'data center', 'cloud', 'server', 'colocation', 'colo', 'digital ocean', 'digitalocean', 'amazon', 'aws', 'google cloud', 'azure', 'linode', 'vultr', 'ovh', 'hetzner', 'contabo'];

const isLikelyVpn = (user: AdminUser): boolean => {
  if (user.location?.is_vpn) return true;
  if (!user.location?.isp) return false;
  const lower = user.location.isp.toLowerCase();
  return VPN_KEYWORDS.some((kw) => lower.includes(kw));
};

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: string[];
  display_name: string | null;
  avatar_url: string | null;
  location: {
    country: string;
    state: string;
    city: string;
    timezone: string;
    isp: string;
    last_updated: string;
    device_type: string | null;
    device_info: string | null;
    is_vpn: boolean;
  } | null;
}

interface ListeningHistoryItem {
  id: string;
  user_id: string;
  user_email: string;
  track_id: string;
  track_title: string;
  track_thumbnail: string;
  track_channel: string;
  played_at: string;
}

interface PlaylistWithItems {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  user_email: string;
  created_at: string;
  playlist_items: {
    id: string;
    track_id: string;
    track_title: string;
    track_thumbnail: string;
    track_channel: string;
  }[];
}

interface GameSession {
  id: string;
  user_id: string;
  user_email: string;
  game_name: string;
  score: number;
  gems_collected: number;
  duration_seconds: number;
  track_playing: string | null;
  track_source: string | null;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [activeGamersCount, setActiveGamersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin login state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Delete user state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Maintenance mode
  const { maintenance, toggleMaintenance, updateAllowedEmails } = useMaintenanceMode();
  const [allowedEmailInput, setAllowedEmailInput] = useState('');
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'Phone' | 'Desktop PC' | 'Laptop' | 'Tablet' | 'Smartwatch'>('all');
  const [vpnFilter, setVpnFilter] = useState<'all' | 'vpn' | 'no-vpn'>('all');

  const handleToggleAdminRole = async (targetUser: AdminUser) => {
    const isCurrentlyAdmin = targetUser.roles.includes('admin');
    const action = isCurrentlyAdmin ? 'revoke' : 'grant';
    
    try {
      setRoleLoading(targetUser.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-role`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ target_user_id: targetUser.id, action }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(data.message);
      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === targetUser.id) {
          return {
            ...u,
            roles: action === 'grant' 
              ? [...u.roles, 'admin']
              : u.roles.filter(r => r !== 'admin'),
          };
        }
        return u;
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setRoleLoading(null);
    }
  };

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      if (!user) {
        setIsAdminLoggedIn(false);
        setLoading(false);
        return;
      }
      if (user.email === 'admin@gmail.com') {
        setIsAdminLoggedIn(true);
        setLoading(false);
        return;
      }
      // Check database role
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (data) {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
        setError('Access denied. You are not an admin.');
      }
      setLoading(false);
    };
    checkAdmin();
  }, [user, authLoading]);

  // Fetch data when admin is logged in
  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAllData();
    }
  }, [isAdminLoggedIn]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchActivity(), fetchGameSessions()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        const sorted = (data.users || []).sort((a: AdminUser, b: AdminUser) => {
          const dateA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
          const dateB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(sorted);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-activity`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setListeningHistory(data.listeningHistory || []);
        setPlaylists(data.playlists || []);
      }
    } catch (err: any) {
      console.error('Error fetching activity:', err);
    }
  };

  const fetchGameSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-game-sessions`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setGameSessions(data.gameSessions || []);
        setActiveGamersCount(data.activeCount || 0);
      }
    } catch (err: any) {
      console.error('Error fetching game sessions:', err);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);

    try {
      if (email !== 'admin@gmail.com') {
        throw new Error('Invalid admin credentials. Only admin@gmail.com can access this.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message?.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/admin`,
            },
          });

          if (signUpError) throw signUpError;
          
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (loginError) throw loginError;
          
          if (loginData.user) {
            setIsAdminLoggedIn(true);
            toast.success('Admin account created and logged in!');
          }
        } else {
          throw signInError;
        }
      } else if (data.user) {
        setIsAdminLoggedIn(true);
        toast.success('Logged in as admin');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsAdminLoggedIn(false);
    navigate('/');
  };

  const copyPlaylistToAdmin = async (playlist: PlaylistWithItems) => {
    try {
      if (!user) return;
      
      // Create a new playlist for the admin
      const { data: newPlaylist, error: createError } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name: `${playlist.name} (from ${playlist.user_email})`,
          description: playlist.description || `Copied from ${playlist.user_email}`,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy all playlist items
      if (playlist.playlist_items.length > 0) {
        const items = playlist.playlist_items.map((item, index) => ({
          playlist_id: newPlaylist.id,
          track_id: item.track_id,
          track_title: item.track_title,
          track_thumbnail: item.track_thumbnail,
          track_channel: item.track_channel,
          position: index,
        }));

        const { error: itemsError } = await supabase
          .from('playlist_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success(`Playlist "${playlist.name}" copied to your account!`);
    } catch (err: any) {
      console.error('Error copying playlist:', err);
      toast.error('Failed to copy playlist');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser || !newPassword) return;
    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: resetTargetUser.id,
            newPassword,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(`Password updated for ${resetTargetUser.email}`);
      setResetDialogOpen(false);
      setNewPassword('');
      setResetTargetUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ target_user_id: deleteTargetUser.id }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(`User ${deleteTargetUser.email} deleted`);
      setUsers(prev => prev.filter(u => u.id !== deleteTargetUser.id));
      setDeleteDialogOpen(false);
      setDeleteTargetUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUserOnline = (u: AdminUser): boolean => {
    const lastActive = u.location?.last_updated || u.last_sign_in_at;
    if (!lastActive) return false;
    const diffMs = Date.now() - new Date(lastActive).getTime();
    return diffMs < 5 * 60 * 1000; // 5 minutes
  };

  const onlineCount = users.filter(isUserOnline).length;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Show login form if not authenticated or not admin
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login as Admin'
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              <span className="hidden sm:inline">Playlists</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Games</span>
              {activeGamersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500 text-white rounded-full">
                  {activeGamersCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Maintenance</span>
              {maintenance.enabled && (
                <span className="ml-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Registered Users</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {users.length} total users
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                          {onlineCount} online
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={fetchAllData} variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {users.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No users found</div>
                      ) : (
                        users.map((u) => {
                          const online = isUserOnline(u);
                          return (
                            <div
                              key={u.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                            >
                              {/* Online indicator + Avatar + Email */}
                              <div className="flex items-center gap-3 min-w-0 sm:w-[240px]">
                                <div className="relative flex-shrink-0">
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary uppercase overflow-hidden">
                                    {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      u.email?.[0] || '?'
                                    )}
                                  </div>
                                  <Circle
                                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                                      online
                                        ? 'fill-emerald-500 text-emerald-500'
                                        : 'fill-muted-foreground/40 text-muted-foreground/40'
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  {u.display_name && (
                                    <p className="text-sm font-semibold truncate text-foreground">{u.display_name}</p>
                                  )}
                                  <p className={`text-sm truncate ${u.display_name ? 'text-muted-foreground text-xs' : 'font-medium'}`}>{u.email}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {online ? (
                                      <span className="text-emerald-500 font-medium">Online now</span>
                                    ) : (
                                      <>Last seen {formatDate(u.last_sign_in_at)}</>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Location */}
                              <div className="flex items-center gap-2 sm:w-[180px] min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                {u.location ? (
                                  <div className="min-w-0">
                                    <p className="text-sm truncate">
                                      {u.location.city}, {u.location.state}
                                      {isLikelyVpn(u) && (
                                        <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive">
                                          <ShieldAlert className="w-2.5 h-2.5" />
                                          VPN
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">{u.location.country}</p>
                                    {u.location.isp && (
                                      <p className="text-[10px] text-muted-foreground/70 truncate">📡 {u.location.isp}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No data</span>
                                )}
                              </div>

                              {/* Device */}
                              <div className="flex items-center gap-2 sm:w-[160px] min-w-0">
                                {u.location?.device_type ? (
                                  <>
                                    {u.location.device_type === 'Phone' ? (
                                      <Smartphone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    ) : u.location.device_type === 'Tablet' ? (
                                      <Tablet className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    ) : u.location.device_type === 'Laptop' ? (
                                      <Laptop className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    ) : (
                                      <Monitor className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm">{u.location.device_type}</p>
                                      {u.location.device_info && (
                                        <p className="text-[11px] text-muted-foreground truncate">{u.location.device_info}</p>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Monitor className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground italic">Unknown</span>
                                  </>
                                )}
                              </div>

                              {/* Role + Status badges */}
                              <div className="flex items-center gap-1.5 sm:w-[120px]">
                                {u.roles.includes('admin') && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/15 text-primary font-semibold">
                                    <Shield className="w-3 h-3" />
                                    Admin
                                  </span>
                                )}
                                {u.email_confirmed_at ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-500">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-500">
                                    Pending
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                                {u.email !== user?.email && !u.roles.includes('admin') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleAdminRole(u)}
                                    disabled={roleLoading === u.id}
                                    className="text-xs h-7 gap-1"
                                  >
                                    {roleLoading === u.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Shield className="w-3 h-3" />
                                        Admin
                                      </>
                                    )}
                                  </Button>
                                )}
                                {u.email !== user?.email && u.roles.includes('admin') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleAdminRole(u)}
                                    disabled={roleLoading === u.id}
                                    className="text-xs text-destructive hover:text-destructive h-7 px-2"
                                  >
                                    {roleLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Revoke'}
                                  </Button>
                                )}
                                {user?.email === 'admin@gmail.com' && u.email !== 'admin@gmail.com' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setResetTargetUser(u);
                                        setNewPassword('');
                                        setResetDialogOpen(true);
                                      }}
                                      className="text-xs h-7 gap-1"
                                    >
                                      <KeyRound className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setDeleteTargetUser(u);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-xs text-destructive hover:text-destructive h-7"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Listening Activity</CardTitle>
                    <CardDescription>See what users are listening to</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {listeningHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No listening activity yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {listeningHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50"
                        >
                          <img
                            src={item.track_thumbnail}
                            alt={item.track_title}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.track_title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.track_channel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary">{item.user_email}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(item.played_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ListMusic className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>User Playlists</CardTitle>
                    <CardDescription>Browse all user playlists</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {playlists.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No playlists created yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {playlists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="p-4 rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{playlist.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                by {playlist.user_email} • {playlist.playlist_items.length} tracks
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyPlaylistToAdmin(playlist)}
                                className="flex items-center gap-1.5"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy to Mine
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(playlist.created_at)}
                              </span>
                            </div>
                          </div>
                          {playlist.playlist_items.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {playlist.playlist_items.slice(0, 5).map((item) => (
                                <img
                                  key={item.id}
                                  src={item.track_thumbnail}
                                  alt={item.track_title}
                                  title={item.track_title}
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                />
                              ))}
                              {playlist.playlist_items.length > 5 && (
                                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                                  +{playlist.playlist_items.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Game Sessions</CardTitle>
                      <CardDescription>
                        Monitor users playing games
                        {activeGamersCount > 0 && (
                          <span className="ml-2 text-green-500 font-medium">
                            ({activeGamersCount} playing now)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={fetchAllData} variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {gameSessions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No game sessions recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gameSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-4 rounded-lg border ${
                            session.is_active 
                              ? 'border-green-500/50 bg-green-500/5' 
                              : 'border-border bg-secondary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                session.is_active ? 'bg-green-500/20' : 'bg-primary/20'
                              }`}>
                                <Gamepad2 className={`w-5 h-5 ${
                                  session.is_active ? 'text-green-500' : 'text-primary'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {session.game_name}
                                  {session.is_active && (
                                    <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full animate-pulse">
                                      LIVE
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">{session.user_email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{session.score} pts</p>
                              <p className="text-xs text-muted-foreground">
                                💎 {session.gems_collected}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {session.track_playing && (
                                <span className="flex items-center gap-1">
                                  <Music className="w-3 h-3" />
                                  <span className="truncate max-w-[150px]">{session.track_playing}</span>
                                  {session.track_source && (
                                    <span className="text-primary">({session.track_source})</span>
                                  )}
                                </span>
                              )}
                              <span>
                                ⏱️ {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                              </span>
                            </div>
                            <span>{formatTimeAgo(session.started_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Maintenance Mode</CardTitle>
                      <CardDescription>
                        Enable maintenance mode to restrict access to selected users only
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${maintenance.enabled ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {maintenance.enabled ? 'ACTIVE' : 'Off'}
                    </span>
                    <Switch
                      checked={maintenance.enabled}
                      onCheckedChange={async (checked) => {
                        try {
                          await toggleMaintenance(checked);
                          toast.success(checked ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
                        } catch {
                          toast.error('Failed to toggle maintenance mode');
                        }
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {maintenance.enabled && (
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <p className="text-sm text-destructive font-medium mb-1">⚠️ Maintenance mode is active</p>
                    <p className="text-xs text-muted-foreground">
                      Only users listed below can access the app. Everyone else sees the maintenance page.
                      Admin dashboard (/admin) is always accessible.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Allowed Users</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    These users can access the app even during maintenance mode.
                  </p>

                  {/* Add email input */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Enter email to whitelist..."
                      value={allowedEmailInput}
                      onChange={(e) => setAllowedEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && allowedEmailInput.trim()) {
                          const email = allowedEmailInput.trim();
                          if (!maintenance.allowed_emails.includes(email)) {
                            updateAllowedEmails([...maintenance.allowed_emails, email]);
                            toast.success(`${email} added to whitelist`);
                          }
                          setAllowedEmailInput('');
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const email = allowedEmailInput.trim();
                        if (email && !maintenance.allowed_emails.includes(email)) {
                          updateAllowedEmails([...maintenance.allowed_emails, email]);
                          toast.success(`${email} added to whitelist`);
                        }
                        setAllowedEmailInput('');
                      }}
                      disabled={!allowedEmailInput.trim()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Quick add from existing users */}
                  {users.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Quick add from registered users:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {users
                          .filter(u => !maintenance.allowed_emails.includes(u.email))
                          .slice(0, 10)
                          .map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                updateAllowedEmails([...maintenance.allowed_emails, u.email]);
                                toast.success(`${u.email} added to whitelist`);
                              }}
                              className="px-2 py-1 text-xs rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                            >
                              + {u.email}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Whitelisted emails */}
                  {maintenance.allowed_emails.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">
                      No users whitelisted yet. Add emails above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {maintenance.allowed_emails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <span className="text-sm font-medium">{email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateAllowedEmails(maintenance.allowed_emails.filter(e => e !== email));
                              toast.success(`${email} removed from whitelist`);
                            }}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">User</p>
              <p className="font-medium">{resetTargetUser?.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || newPassword.length < 6}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </p>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="font-medium text-sm">{deleteTargetUser?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                All their data (playlists, favorites, history) will be removed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
