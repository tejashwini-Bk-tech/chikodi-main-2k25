import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // const sendMagicLink = async () => {
  //   const e = (email || '').trim().toLowerCase();
  //   if (!e) { toast.error('Enter your email'); return; }
  //   setLoading(true);
  //   try {
  //     const redirectTo = `${window.location.origin}/auth/callback`;
  //     const { error } = await supabase.auth.signInWithOtp({
  //       email: e,
  //       options: { emailRedirectTo: redirectTo }
  //     });
  //     if (error) throw error;
  //     toast.success('Magic link sent. Check your email.');
  //   } catch (err) {
  //     toast.error(err?.message || 'Failed to send magic link');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const signInWithPassword = async () => {
    const e = (email || '').trim().toLowerCase();
    const p = password || '';
    if (!e || !p) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw error;
      toast.success('Logged in');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user || null;
        if (user) {
          const { data: prov, error: provErr } = await supabase
            .from('providers')
            .select('provider_id, user_id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!provErr && prov?.provider_id) {
            navigate(`/dashboard/${prov.provider_id}`, { replace: true });
            return;
          }
        }
      } catch (_) {}
      const fallback = location.state?.redirect || '/register/step/1';
      navigate(fallback, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPassword = async () => {
    const e = (email || '').trim().toLowerCase();
    const p = password || '';
    if (!e || !p) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({ email: e, password: p, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      if (data?.user && !data.session) {
        toast.success('Account created. Please check your email to confirm.');
      } else {
        toast.success('Account created and logged in');
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user || null;
          if (user) {
            const { data: prov, error: provErr } = await supabase
              .from('providers')
              .select('provider_id, user_id')
              .eq('user_id', user.id)
              .maybeSingle();
            if (!provErr && prov?.provider_id) {
              navigate(`/dashboard/${prov.provider_id}`, { replace: true });
              return;
            }
          }
        } catch (_) {}
        const fallback = location.state?.redirect || '/register/step/1';
        navigate(fallback, { replace: true });
      }
    } catch (err) {
      toast.error(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Provider Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={signInWithPassword} disabled={loading} className="h-11 flex-1">
              {loading ? 'Please wait...' : 'Sign In'}
            </Button>
            <Button onClick={signUpWithPassword} disabled={loading} variant="outline" className="h-11 flex-1">
              {loading ? 'Please wait...' : 'Create Account'}
            </Button>
          </div>
          {/* <Button onClick={sendMagicLink} disabled={loading} className="w-full h-11">
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button> */}
          <div className="text-center text-sm text-gray-600">
            <p>
              By continuing you agree to our{' '}
              <Link to="/privacy" className="text-blue-600 underline">Privacy Policy</Link>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
