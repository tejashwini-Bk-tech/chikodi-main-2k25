import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast('Updating password...');
    if (!password || password.length < 8) {
      toast.error('Weak password', { description: 'Use at least 8 characters' });
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match', { description: 'Please re-enter' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated', { description: 'You can now log in with your new password' });
      try { await supabase.auth.signOut(); } catch (_) {}
      try { localStorage.removeItem('user'); } catch (_) {}
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Reset failed', { description: String(err?.message || err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Reset Password
            </CardTitle>
            <CardDescription className="text-base">Enter and confirm your new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="mt-2 pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-2 pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
