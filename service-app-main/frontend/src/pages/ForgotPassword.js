import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendReset = async (e) => {
    e.preventDefault();
    const emailTrim = (email || '').trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
    if (!emailValid) {
      toast.error('Invalid email', { description: 'Please enter a valid email address.' });
      return;
    }
    toast('Sending reset email...');
    setSending(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo });
      if (error) throw error;
      toast.success('Password reset email sent', { description: `Check ${emailTrim} for the link` });
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      toast.error('Failed to send email', { description: String(err?.message || err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('forgotPasswordTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('forgotPasswordSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendReset} className="space-y-4 animate-in fade-in duration-300">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
              >
                {sending ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;