import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import nyraLogo from '@/assets/nyra-logo.png';
import { useAppSettings } from '@/hooks/useAppSettings';

const Auth = () => {
  const { settings: appSettings } = useAppSettings();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        // Redirect admin to admin dashboard
        if (data.user?.email === 'admin@gmail.com') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Check if email confirmation is needed
        if (data.user && !data.session) {
          toast.success('🎉 Check your email to verify your account!', { duration: 8000 });
          setIsLogin(true);
          return;
        }
        toast.success('Account created! Welcome to NYRA');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="flex flex-col items-center mb-8">
          <img src={appSettings.app_logo_url || nyraLogo} alt={appSettings.app_name} className="w-16 h-16 rounded-xl mb-4" />
          <h1 className="text-3xl font-bold neon-text">{appSettings.app_name}</h1>
          <p className="text-muted-foreground mt-2">{appSettings.app_tagline}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary border-border"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
            disabled={loading}
          >
            {loading ? 'Loading...' : isLogin ? 'Log In' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
