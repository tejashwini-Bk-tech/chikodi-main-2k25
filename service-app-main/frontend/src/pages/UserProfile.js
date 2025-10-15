import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, LogOut, Edit } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const UserProfile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      // Load session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const supaUser = session?.user;
      if (!supaUser) {
        navigate('/login');
        return;
      }
      // Fetch profile (full_name, phone, role)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, role, avatar_url')
        .eq('id', supaUser.id)
        .maybeSingle();

      if (!active) return;
      const localFallback = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        id: supaUser.id,
        email: supaUser.email,
        fullName: profile?.full_name || localFallback.fullName || 'User',
        phone: profile?.phone || '',
        role: profile?.role || localStorage.getItem('role') || 'user',
        avatarUrl: profile?.avatar_url || '',
      });
      setForm({ fullName: profile?.full_name || localFallback.fullName || '', avatarUrl: profile?.avatar_url || '' });
    };
    load();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    const refetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const supaUser = session?.user;
      if (!supaUser) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, role, avatar_url')
        .eq('id', supaUser.id)
        .maybeSingle();
      setUser((prev) => prev ? ({
        ...prev,
        fullName: profile?.full_name || prev.fullName,
        phone: profile?.phone || '',
        role: profile?.role || prev.role,
        avatarUrl: profile?.avatar_url || '',
      }) : prev);
    };
    const onFocus = () => { refetch(); };
    const onProfileUpdated = () => { refetch(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('profile-updated', onProfileUpdated);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('isVerified');
    toast.success('Logged Out', { description: 'You have been logged out successfully' });
    navigate('/login');
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!user?.id) return;
    const full_name = (form.fullName || '').trim();
    const avatar_url = (form.avatarUrl || '').trim();
    if (!full_name) {
      toast.error('Name required', { description: 'Please enter your full name' });
      return;
    }
    if (avatar_url && !/^https?:\/\//i.test(avatar_url)) {
      toast.error('Invalid URL', { description: 'Avatar URL must start with http:// or https://' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, avatar_url })
        .eq('id', user.id);
      if (error) throw error;
      // Update local UI and storage
      const updated = { ...user, fullName: full_name, avatarUrl: avatar_url };
      setUser(updated);
      const local = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...local, fullName: full_name }));
      toast.success('Profile updated', { description: 'Your changes have been saved' });
      setEditing(false);
    } catch (err) {
      toast.error('Update failed', { description: String(err?.message || err) });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-in fade-in duration-500">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            My Profile
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="md:col-span-1 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 ring-4 ring-blue-600">
                  <AvatarImage src={user.avatarUrl || ''} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                    {user.fullName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold mb-1">{user.fullName || 'User'}</h2>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Verified
                </Badge>
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editing ? 'Close Editor' : 'Edit Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader>
              <CardTitle className="text-2xl">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editing && (
                <form onSubmit={handleSave} className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                    <Input
                      id="avatarUrl"
                      value={form.avatarUrl}
                      onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                      placeholder="https://..."
                      className="mt-2"
                    />
                    {/* By default, leave avatar empty. No default image will be set. */}
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving} className="min-w-24">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { setEditing(false); setForm({ fullName: user.fullName || '', avatarUrl: user.avatarUrl || '' }); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Full Name</p>
                    <p className="font-semibold">{user.fullName || 'Not provided'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                    <p className="font-semibold">{user.email || 'Not provided'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                    <p className="font-semibold">{user.phone || 'Not provided'}</p>
                    {!user.phone && (
                      <div className="mt-2">
                        <Button size="sm" onClick={() => navigate('/verify-otp')}>
                          Verify Number
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Member Since</p>
                    <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full mt-6 transition-all duration-300 hover:scale-[1.02]"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Booking History */}
        <Card className="mt-6 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-1000">
          <CardHeader>
            <CardTitle className="text-2xl">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              <p>No bookings yet. Start by finding a service provider!</p>
              <Button
                onClick={() => navigate('/providers')}
                className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              >
                Browse Providers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;