import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
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

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const email = formData.email.trim();
    const password = formData.password;
    const full_name = formData.fullName;

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



  const handleGoogleSignup = () => {
    toast('Google signup not configured', {
      description: 'Email signup with verification is enabled. We can add Google OAuth later.'
    });
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
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2 transition-all duration-200 focus:scale-[1.02]"
                  required
                />
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

            {/* Google Sign Up */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignup}
              className="w-full py-6 transition-all duration-300 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </Button>

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