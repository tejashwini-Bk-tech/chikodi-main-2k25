import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';


const Signup = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [role, setRole] = useState('user');
  const [fieldVisible, setFieldVisible] = useState({
    fullName: false,
    emailOrPhone: false,
    password: false
  });
  const [allFieldsFilled, setAllFieldsFilled] = useState(false);
  const [showPwSuggestion, setShowPwSuggestion] = useState(false);
  const [suggestedPw, setSuggestedPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Sequential animation for fields
    setTimeout(() => setFieldVisible(prev => ({ ...prev, fullName: true })), 100);
    setTimeout(() => setFieldVisible(prev => ({ ...prev, emailOrPhone: true })), 300);
    setTimeout(() => setFieldVisible(prev => ({ ...prev, password: true })), 500);
  }, []);

  useEffect(() => {
    // Check if all fields are filled (fullName, email, password)
    const filled = [formData.fullName, formData.email, formData.password].every(val => val.trim() !== '');
    setAllFieldsFilled(filled);
  }, [formData]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const generateStrongPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const syms = '!@#$%^&*()-_=+[]{}';
    const all = upper + lower + nums + syms;
    const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
    const base = pick(upper, 2) + pick(lower, 4) + pick(nums, 2) + pick(syms, 2) + pick(all, 4);
    return base.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const handlePasswordFocus = () => {
    if (!formData.password) {
      const pw = generateStrongPassword();
      setSuggestedPw(pw);
      setShowPwSuggestion(true);
    }
  };

  const acceptSuggestedPassword = () => {
    setFormData((f) => ({ ...f, password: suggestedPw }));
    setShowPwSuggestion(false);
  };

  const declineSuggestedPassword = () => {
    setShowPwSuggestion(false);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  toast('Creating account...');
  const full_name = (formData.fullName || '').trim();
  const email = (formData.email || '').trim();
  const password = formData.password || '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!full_name) {
    toast.error('Full name required', { description: 'Please enter your full name.' });
    return;
  }
  if (!emailValid) {
    toast.error('Invalid email', { description: 'Please enter a valid email address.' });
    return;
  }
  if (password.length < 8) {
    toast.error('Weak password', { description: 'Use at least 8 characters.' });
    return;
  }
  try {
    

    // ✅ Sign up user (Supabase handles existing/unconfirmed cases)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name, role },
      },
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered')) {
        toast.error('Signup failed', {
          description: 'User already exists with this email. Please log in instead.',
        });
      } else {
        toast.error('Signup failed', {
          description: error.message,
        });
      }
      return;
    }

    // ✅ If user exists but unconfirmed, Supabase returns user with empty identities -> verification resent
    const wasExistingUnconfirmed = Array.isArray(data?.user?.identities) && data.user.identities.length === 0;
    if (wasExistingUnconfirmed) {
      toast('email alreay exist!!', {
        description: 'This email is already registered.',
      });
    } else {
      toast.success('Verification email sent', {
        description: 'Please verify your email to activate your account.',
      });
    }

    // ❌ Do NOT navigate yet — wait until verification link is clicked
  } catch (err) {
    toast.error('Signup error', {
      description: String(err),
    });
  }
};


 

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {t('signupTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('signupSubtitle')}
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name Field */}
              <div
                className={`transition-all duration-500 transform ${
                  fieldVisible.fullName
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-8 opacity-0'
                }`}
              >
                <Label htmlFor="fullName" className="text-sm font-medium">
                  {t('fullName')}
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
              </div>

              {/* Email Field */}
              <div
                className={`transition-all duration-500 transform ${
                  fieldVisible.emailOrPhone
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-8 opacity-0'
                }`}
              >
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
              </div>

              {/* Phone field removed: phone will be collected on OTP page after login */}

              {/* Password Field */}
              <div
                className={`transition-all duration-500 transform ${
                  fieldVisible.password
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-8 opacity-0'
                }`}
              >
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={handlePasswordFocus}
                    className="mt-2 pr-10 transition-all duration-200 focus:scale-[1.02]"
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
                {showPwSuggestion && !formData.password && (
                  <div className="mt-2 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                    <div className="text-sm mb-2">We generated a strong password for you:</div>
                    <div className="font-mono text-sm break-all bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {suggestedPw}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" onClick={acceptSuggestedPassword} className="px-3 py-2">Use suggested</Button>
                      <Button type="button" variant="secondary" onClick={declineSuggestedPassword} className="px-3 py-2">I'll create my own</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className={`w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 ${
                  allFieldsFilled ? 'animate-pulse' : ''
                } hover:scale-[1.02]`}
              >
                {t('signupButton')}
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

            

            {/* Login Link */}
            <div className="mt-6 text-center animate-in fade-in duration-700 delay-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('alreadyAccount')}{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-cyan-500 font-medium transition-colors duration-200 hover:underline"
                >
                  {t('loginLink')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;