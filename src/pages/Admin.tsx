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
import { toast } from 'sonner';
import { Shield, Users, LogOut, ArrowLeft, Loader2, Music, ListMusic, Clock, Gamepad2, MapPin, Smartphone, Monitor, Copy } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  location: {
    country: string;
    state: string;
    city: string;
    timezone: string;
    isp: string;
    last_updated: string;
    device_type: string | null;
    device_info: string | null;
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

  // Check if current user is admin
  useEffect(() => {
    if (!authLoading) {
      if (user && user.email === 'admin@gmail.com') {
        setIsAdminLoggedIn(true);
        setLoading(false);
      } else if (user && user.email !== 'admin@gmail.com') {
        setIsAdminLoggedIn(false);
        setError('Access denied. You are not an admin.');
        setLoading(false);
      } else if (!user) {
        setIsAdminLoggedIn(false);
        setLoading(false);
      }
    }
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
        setUsers(data.users);
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
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
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
                      <CardDescription>View all users who have signed up</CardDescription>
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
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                         <TableHead>Email</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Location
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              Device
                            </div>
                          </TableHead>
                          <TableHead>Signed Up</TableHead>
                          <TableHead>Last Sign In</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.email}</TableCell>
                              <TableCell>
                                {u.location ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium">{u.location.city}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {u.location.state}, {u.location.country}
                                    </p>
                                    {u.location.timezone && (
                                      <p className="text-[10px] text-muted-foreground/70">
                                        🕐 {u.location.timezone}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    No location data
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(u.created_at)}</TableCell>
                              <TableCell>{formatDate(u.last_sign_in_at)}</TableCell>
                              <TableCell>
                                {u.email_confirmed_at ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500">
                                    Confirmed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                                    Pending
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 text-sm text-muted-foreground">
                  Total users: {users.length}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
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
                            <span className="text-xs text-muted-foreground">
                              {formatDate(playlist.created_at)}
                            </span>
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
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
