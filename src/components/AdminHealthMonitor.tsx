import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2, Wrench, Shield, Zap } from 'lucide-react';

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'fixed';
  message: string;
  autoFixable: boolean;
  fixApplied?: string;
}

interface HealthReport {
  overallStatus: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  timestamp: string;
}

const AdminHealthMonitor = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        toast.error('Health check failed');
      }
    } catch (err) {
      toast.error('Failed to run health check');
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async (checkId: string) => {
    setFixing(checkId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fix: checkId }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReport(data);
        toast.success('Fix applied successfully!');
      }
    } catch {
      toast.error('Failed to apply fix');
    } finally {
      setFixing(null);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runHealthCheck, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'fixed': return <Wrench className="w-5 h-5 text-blue-500" />;
      default: return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-500';
      case 'fixed': return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
      default: return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getOverallGlow = (status: string) => {
    switch (status) {
      case 'healthy': return 'shadow-[0_0_30px_rgba(34,197,94,0.15)]';
      case 'warning': return 'shadow-[0_0_30px_rgba(234,179,8,0.15)]';
      case 'critical': return 'shadow-[0_0_30px_rgba(239,68,68,0.2)]';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={report ? getOverallGlow(report.overallStatus) : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                report ? getStatusColor(report.overallStatus) : 'bg-muted'
              } border`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  System Health Monitor
                  {report && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(report.overallStatus)}`}>
                      {report.overallStatus.toUpperCase()}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {report ? `Last checked: ${new Date(report.timestamp).toLocaleTimeString()}` : 'Run a health check to see system status'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'border-green-500/50 text-green-500' : ''}
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
              </Button>
              <Button onClick={runHealthCheck} disabled={loading} size="sm">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                {loading ? 'Checking...' : 'Run Check'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Health Checks */}
      {report && (
        <div className="grid gap-3">
          {report.checks.map((check) => (
            <Card key={check.id} className={`border ${
              check.status === 'critical' ? 'border-red-500/30' :
              check.status === 'warning' ? 'border-yellow-500/30' :
              check.status === 'fixed' ? 'border-blue-500/30' :
              'border-border'
            }`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(check.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{check.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                      {check.fixApplied && (
                        <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> {check.fixApplied}
                        </p>
                      )}
                    </div>
                  </div>
                  {check.autoFixable && check.status !== 'fixed' && check.status !== 'healthy' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyFix(check.id)}
                      disabled={fixing === check.id}
                      className="ml-3 border-primary/50 text-primary hover:bg-primary/10"
                    >
                      {fixing === check.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5 mr-1" />
                      )}
                      Auto-Fix
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Click "Run Check" to analyze system health</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminHealthMonitor;
