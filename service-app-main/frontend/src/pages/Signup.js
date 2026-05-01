import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [role, setRole] = useState(new URLSearchParams(location.search).get('role') === 'provider' ? 'provider' : 'user');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.fullName || !formData.email || !formData.password) return toast.error('Please fill all fields');
      if (formData.password.length < 6) return toast.error('Password must be at least 6 characters');

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.fullName, role } },
      });

      if (error) return toast.error('Signup failed', { description: error.message });

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: formData.fullName,
          email: formData.email,
          role,
          created_at: new Date().toISOString(),
        });
      }

      toast.success('Account created. Verify your email, then log in.');
      navigate('/login');
    } catch {
      toast.error('Signup failed', { description: 'Unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 bg-[#f4f7fb]">
      <div className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-center px-12 bg-[linear-gradient(145deg,#0b1324,#111827)] text-white">
          <h1 className="display-type text-5xl font-extrabold mb-4">Create Account</h1>
          <p className="text-slate-300 text-lg leading-relaxed">Start booking trusted services with a faster and simpler experience.</p>
        </div>

        <div className="flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="display-type text-3xl">Sign Up</CardTitle>
              <CardDescription>Create a simple and secure account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 p-1 rounded-lg bg-slate-100">
                  <button type="button" onClick={() => setRole('user')} className={`flex-1 py-2 rounded-md text-sm font-medium ${role === 'user' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>User</button>
                  <button type="button" onClick={() => setRole('provider')} className={`flex-1 py-2 rounded-md text-sm font-medium ${role === 'provider' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>Provider</button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="fullName" className="pl-9" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                  </div>
                </div>

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
                    <Input id="password" type={showPassword ? 'text' : 'password'} className="pl-9 pr-10" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <p className="text-sm text-slate-600 text-center mt-4">
                Already have an account? <Link to="/login" className="text-cyan-700 font-medium">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
