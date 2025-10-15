import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [role, setRole] = useState('user');

  // Handle email verification redirect (exchange code for session)
  useEffect(() => {
    const exchange = async () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.hash);
          // Clean the hash from URL regardless
          window.history.replaceState(null, '', window.location.pathname);
          if (error) return;
          const user = data?.user;
          if (!user) return;
          // Fetch role and redirect like a normal login
          const { data: prof } = await supabase
            .from('profiles')
            .select('role, full_name, phone')
            .eq('id', user.id)
            .maybeSingle();
          const roleFromDb = prof?.role || 'user';
          localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email, fullName: prof?.full_name }));
          localStorage.setItem('role', roleFromDb);
          localStorage.setItem('isVerified', 'true');
          toast.success('Email verified', { description: 'Your email has been confirmed.' });
          // If phone missing and no pending verifiedPhone, send user to OTP page
          const hasPhone = !!prof?.phone;
          const pendingVerifiedPhone = !!localStorage.getItem('verifiedPhone');
          if (!hasPhone && !pendingVerifiedPhone) {
            navigate('/verify-otp');
            return;
          }
          const providerUrl = process.env.REACT_APP_PROVIDER_URL;
          if (roleFromDb === 'provider' && providerUrl) {
            window.location.href = providerUrl;
          } else {
            navigate('/dashboard');
          }
        } catch {}
      }
    };
    exchange();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('user not found')) {
          toast('No account found', { description: 'Please sign up to continue.' });
        } else {
          toast.error('Error', { description: error.message });
        }
        setShowForgotPassword(true);
        return;
      }
      const user = data.user;
      if (!user) {
        toast.error('Error', { description: 'No user session returned' });
        return;
      }
      // Fetch role from profiles
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('id', user.id)
        .maybeSingle();
      const roleFromDb = prof?.role || 'user';
      // If phone was verified via OTP page, persist it to profile
      const verifiedPhone = localStorage.getItem('verifiedPhone');
      if (verifiedPhone) {
        try {
          await supabase.from('profiles').update({ phone: verifiedPhone }).eq('id', user.id);
        } catch (e) {
          // Non-blocking: ignore profile phone update error
        } finally {
          localStorage.removeItem('verifiedPhone');
        }
      }
      // Persist minimal info for UI
      localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email, fullName: prof?.full_name }));
      localStorage.setItem('role', roleFromDb);
      localStorage.setItem('isVerified', 'true');
      toast.success('Welcome back!', { description: 'Login successful' });
      // If phone still missing, require OTP verification
      const refreshed = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();
      const hasPhone = !!(refreshed.data?.phone);
      if (!hasPhone) {
        navigate('/verify-otp');
        return;
      }
      const providerUrl = process.env.REACT_APP_PROVIDER_URL;
      if (roleFromDb === 'provider' && providerUrl) {
        window.location.href = providerUrl;
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Login error', { description: String(err) });
    }
  };

  const handleGoogleLogin = () => {
    (async () => {
      try {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline',
            },
          },
        });
        if (error) throw error;
        // Supabase will handle redirect to Google; no further action here.
      } catch (err) {
        toast.error('Google login failed', { description: String(err?.message || err) });
      }
    })();
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('loginTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('loginSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection */}
            <div className="mb-4">
              <Label className="text-sm font-medium">Select Role</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={role === 'user'}
                    onChange={() => setRole('user')}
                  />
                  <span>User</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="provider"
                    checked={role === 'provider'}
                    onChange={() => setRole('provider')}
                  />
                  <span>Provider</span>
                </label>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
              </div>
              {showForgotPassword && (
                <div className="animate-in slide-in-from-top duration-300">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-cyan-500 transition-colors duration-200"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
              >
                {t('loginButton')}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full py-6 transition-all duration-300 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login with Google
            </Button>

            {/* Signup Link */}
            <div className="mt-6 text-center animate-in fade-in duration-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('noAccount')}{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-cyan-500 font-medium transition-colors duration-200 hover:underline"
                >
                  {t('signupLink')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;