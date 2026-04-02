import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Search, UserCog, Trash2, KeyRound, Wrench, Settings2, MessageCircle, RefreshCw } from 'lucide-react';

interface ActivityLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action_type: string;
  action_details: string | null;
  target_user_id: string | null;
  target_email: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const ACTION_ICONS: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  role_change: { icon: UserCog, color: 'text-blue-500', label: 'Role Change' },
  user_delete: { icon: Trash2, color: 'text-destructive', label: 'User Deleted' },
  password_reset: { icon: KeyRound, color: 'text-orange-500', label: 'Password Reset' },
  maintenance_toggle: { icon: Wrench, color: 'text-yellow-500', label: 'Maintenance' },
  settings_update: { icon: Settings2, color: 'text-purple-500', label: 'Settings Update' },
  chat_message: { icon: MessageCircle, color: 'text-green-500', label: 'Chat Message' },
  login: { icon: Shield, color: 'text-emerald-500', label: 'Admin Login' },
};

const AdminActivityLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setLogs(data as ActivityLog[]);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.admin_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action_details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.action_type === filterType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionInfo = (type: string) => ACTION_ICONS[type] || { icon: Shield, color: 'text-muted-foreground', label: type };

  const actionTypes = ['all', ...Object.keys(ACTION_ICONS)];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Activity Logs
            </CardTitle>
            <CardDescription>Track every action performed by administrators</CardDescription>
          </div>
          <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by admin, target, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {actionTypes.map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="text-xs capitalize"
              >
                {type === 'all' ? 'All' : getActionInfo(type).label}
              </Button>
            ))}
          </div>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {logs.length === 0 ? 'No activity logs yet. Actions will be recorded here.' : 'No logs match your filter.'}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredLogs.map(log => {
                const actionInfo = getActionInfo(log.action_type);
                const ActionIcon = actionInfo.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className={`mt-0.5 p-1.5 rounded-full bg-muted ${actionInfo.color}`}>
                      <ActionIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.admin_email}</span>
                        <Badge variant="outline" className="text-[10px]">{actionInfo.label}</Badge>
                      </div>
                      {log.action_details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.action_details}</p>
                      )}
                      {log.target_email && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Target: <span className="font-medium text-foreground">{log.target_email}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminActivityLogs;
