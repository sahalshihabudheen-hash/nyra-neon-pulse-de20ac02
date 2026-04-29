import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Chrome, Mail, Lock, ArrowRight, Sparkles, Music2, ShieldCheck, Zap } from 'lucide-react';
import nyraLogo from '@/assets/nyra-logo.png';
import { useAppSettings } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';

const Auth = () => {
  const { settings: appSettings } = useAppSettings();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleGuestLogin = () => {
    toast.success('Entering Guest Mode... Enjoy the music!');
    setTimeout(() => navigate('/'), 1000);
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />
      </div>

      <div className={cn(
        "relative z-20 w-full max-w-lg transition-all duration-1000 transform",
        mounted ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      )}>
        <Card className="glass-premium border-primary/20 shadow-2xl overflow-hidden backdrop-blur-3xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="relative mb-6 group">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500 animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-0.5 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-xl float">
                  <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center overflow-hidden">
                    <img 
                      src={appSettings.app_logo_url || nyraLogo} 
                      alt={appSettings.app_name} 
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-lg shadow-lg">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                <span className="neon-text uppercase italic">{appSettings.app_name}</span>
              </h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                {appSettings.app_tagline || "Feel the Pulse of Music"}
              </p>
            </div>

            {/* Google Login Button */}
            <Button 
              onClick={handleGoogleLogin}
              variant="outline" 
              className="w-full h-12 bg-white/5 border-white/10 hover:bg-white/10 text-foreground transition-all duration-300 flex items-center justify-center gap-3 rounded-xl mb-6 group"
            >
              <Chrome className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-sm">Continue with Google</span>
            </Button>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-4 text-muted-foreground font-semibold">Or continue with</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 pl-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pl-12 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-base transition-all duration-300 shadow-lg neon-glow flex items-center justify-center gap-2 group overflow-hidden"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In to Nyra' : 'Create Account'}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </form>

            {/* Guest & Switch Options */}
            <div className="mt-8 space-y-4 text-center">
              <button
                onClick={handleGuestLogin}
                className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-primary/80 hover:text-primary transition-all duration-300 hover:scale-105"
              >
                <Music2 className="w-4 h-4" />
                Continue as Guest (No Login)
              </button>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-all"
                >
                  {isLogin ? "New here? Create account" : 'Already have an account? Sign in'}
                </button>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  SECURED BY NYRA
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-muted-foreground/40 font-medium">
          © 2026 NYRA NEON PULSE. ALL RIGHTS RESERVED.
          <br />
          <span className="hover:text-primary cursor-pointer transition-colors">PRIVACY POLICY</span> • <span className="hover:text-primary cursor-pointer transition-colors">TERMS OF SERVICE</span>
        </p>
      </div>
    </div>
  );
};

export default Auth;

