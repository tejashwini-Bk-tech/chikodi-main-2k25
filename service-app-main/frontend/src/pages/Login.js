import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const exchange = async () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.hash);
          window.history.replaceState(null, '', window.location.pathname);
          if (error) return;
          const user = data?.user;
          if (!user) return;
          const { data: prof } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
          const roleFromDb = prof?.role || 'user';
          localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email, fullName: prof?.full_name }));
          localStorage.setItem('role', roleFromDb);
          localStorage.setItem('isVerified', 'true');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (error) return toast.error('Login failed', { description: error.message });
      const user = data?.user;
      if (!user) return toast.error('Login failed', { description: 'No user data received' });
      const { data: prof } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
      const roleFromDb = prof?.role || 'user';
      localStorage.setItem('user', JSON.stringify({ id: user.id, email: user.email, fullName: prof?.full_name || user.email?.split('@')[0] }));
      localStorage.setItem('role', roleFromDb);
      localStorage.setItem('isVerified', user.email_confirmed_at ? 'true' : 'false');
      toast.success('Welcome back');
      const providerUrl = process.env.REACT_APP_PROVIDER_URL;
      if (roleFromDb === 'provider' && providerUrl) {
        window.location.href = providerUrl;
      } else {
        navigate('/dashboard');
      }
    } catch {
      toast.error('Login failed', { description: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) return toast.error('Email required', { description: 'Please enter your email address' });
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
    if (error) return toast.error('Reset failed', { description: error.message });
    toast.success('Password reset link sent');
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen pt-16 bg-[#f4f7fb]">
      <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-center px-12 bg-[linear-gradient(145deg,#020617,#0f172a)] text-white">
          <h1 className="display-type text-5xl font-extrabold mb-4">Welcome Back</h1>
          <p className="text-slate-300 text-lg leading-relaxed">Continue with FIXORA and manage bookings in a clean, focused workspace.</p>
        </div>

        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="display-type text-3xl">Sign In</CardTitle>
              <CardDescription>Access your account dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="email" type="email" className="pl-9" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} className="pl-9 pr-10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="text-sm text-slate-600 hover:text-slate-900">
                Forgot password?
              </button>

              {showForgotPassword && (
                <form onSubmit={handleForgotPassword} className="space-y-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <p className="text-sm text-slate-600">We will send a reset link to your email.</p>
                  <Button type="submit" variant="outline" className="w-full">Send Reset Link</Button>
                </form>
              )}

              <p className="text-sm text-slate-600 text-center">
                New user? <Link to="/signup" className="text-cyan-700 font-medium">Create account</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
