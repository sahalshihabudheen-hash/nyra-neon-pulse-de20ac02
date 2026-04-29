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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Check your email.');
        setIsForgotPassword(false);
        setIsLogin(true);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        if (data.user?.email === 'admin@gmail.com' || data.user?.email === 'sahalshihabudheen@gmail.com') {
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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
      
      <Card className="w-full max-w-md p-8 glass-premium border-white/10 relative z-10 animate-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <img 
              src={appSettings.app_logo_url || nyraLogo} 
              alt={appSettings.app_name} 
              className="relative w-20 h-20 rounded-2xl object-cover shadow-2xl transition-transform duration-500 group-hover:scale-110" 
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter neon-text mb-1">{appSettings.app_name}</h1>
          <p className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase opacity-70">
            {appSettings.app_tagline}
          </p>
        </div>

        <div className="space-y-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-white text-black hover:bg-gray-100 border-none transition-all duration-300 font-semibold flex items-center justify-center gap-3 rounded-xl shadow-xl"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-transparent px-4 text-muted-foreground font-bold">Or use email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all duration-300"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all duration-200 font-bold rounded-xl shadow-lg neon-glow-premium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </div>
              ) : isForgotPassword ? 'Send Reset Link' : isLogin ? 'Launch Nyra' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center space-y-3 pt-2">
            {isLogin && !isForgotPassword && (
              <button
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-muted-foreground hover:text-primary transition-all duration-300 font-medium tracking-wide block w-full"
              >
                Forgot your password?
              </button>
            )}

            {isForgotPassword ? (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="text-xs text-muted-foreground hover:text-primary transition-all duration-300 font-medium tracking-wide"
              >
                Back to login
              </button>
            ) : (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-muted-foreground hover:text-primary transition-all duration-300 font-medium tracking-wide"
              >
                {isLogin ? (
                  <span>New here? <span className="text-primary underline underline-offset-4 decoration-primary/30">Create an account</span></span>
                ) : (
                  <span>Already a member? <span className="text-primary underline underline-offset-4 decoration-primary/30">Log in instead</span></span>
                )}
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};


export default Auth;
