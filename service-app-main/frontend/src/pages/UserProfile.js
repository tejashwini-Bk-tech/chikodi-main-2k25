import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, LogOut, Edit, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const UserProfile = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [latestBooking, setLatestBooking] = useState(null);
  const [latestProvider, setLatestProvider] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [providersById, setProvidersById] = useState({});
  const [mapForProviderId, setMapForProviderId] = useState(null);
  const [userMapLocation, setUserMapLocation] = useState(null);
  const [messageByBooking, setMessageByBooking] = useState({});
  const [replies, setReplies] = useState([]);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const sendMessage = async (booking) => {
    const text = (messageByBooking[booking.id] || '').trim();
    if (!text) return;
    let uid = user?.id;
    if (!uid) {
      try { const { data: s } = await supabase.auth.getSession(); uid = s?.session?.user?.id || null; } catch {}
    }
    if (!uid) { toast.error('Not logged in'); return; }
    const base = { recipient_id: booking.provider_id, sender_id: uid, booking_id: booking.id };
    try {
      // First try with 'content'
      let { error } = await supabase.from('messages').insert({ ...base, content: text });
      if (error) {
        console.error('Supabase messages insert error:', error);
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('column') && msg.includes('sender_id')) {
          // Retry without sender_id if column not present
          let { error: e2 } = await supabase.from('messages').insert({ recipient_id: booking.provider_id, booking_id: booking.id, content: text });
          if (!e2) { toast.success('Message sent'); setMessageByBooking((m) => ({ ...m, [booking.id]: '' })); return; }
          error = e2;
        }
        if (String(error.message || '').toLowerCase().includes('column') && String(error.message || '').toLowerCase().includes('content')) {
          // Retry with alternate column name 'message'
          const retry = await supabase.from('messages').insert({ recipient_id: booking.provider_id, sender_id: uid, booking_id: booking.id, message: text });
          if (retry.error) throw retry.error;
        } else if (msg.includes('relation') && msg.includes('messages')) {
          toast.error('Messages table missing', { description: 'Please create table public.messages (booking_id, provider_id, user_id, content/text, created_at).' });
          return;
        } else if (msg.includes('rls') || msg.includes('not authorized')) {
          toast.error('Not authorized', { description: 'Check Supabase RLS policies for inserting into messages.' });
          return;
        } else {
          throw error;
        }
      }
      toast.success('Message sent');
      setMessageByBooking((m) => ({ ...m, [booking.id]: '' }));
    } catch (e) {
      console.error('Message send failed:', e);
      toast.error(e?.message || 'Failed to send message');
    }
  };

  const getGeolocation = () => new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        resolve({ lat: latitude, lng: longitude });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const haversineKm = (a, b) => {
    if (!a || !b) return null;
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

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

  useEffect(() => {
    let cancelled = false;
    const loadLatest = async () => {
      try {
        if (!user?.id) return;
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('requested_at', { ascending: false })
          .limit(1);
        const bk = bookings?.[0] || null;
        if (cancelled) return;
        setLatestBooking(bk);
        if (bk?.provider_id) {
          const { data: prov } = await supabase
            .from('providers')
            .select('provider_id, professions, location, last_location_at')
            .eq('provider_id', bk.provider_id)
            .maybeSingle();
          if (!cancelled) setLatestProvider(prov || null);
        } else {
          setLatestProvider(null);
        }
      } catch (_) {}
    };
    loadLatest();
    try {
      const ch = user?.id ? supabase
        .channel(`rt-user-latest-booking-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, loadLatest)
        .subscribe() : null;
      return () => { cancelled = true; if (ch) try { supabase.removeChannel(ch); } catch (_) {} };
    } catch (_) {
      return () => { cancelled = true; };
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let channel;
    let cancelled = false;
    const storageKey = `messages_last_read_user_${user.id}`;
    const computeUnread = (items) => {
      const last = Number(localStorage.getItem(storageKey) || 0);
      const count = (items || []).filter(m => m.created_at && new Date(m.created_at).getTime() > last).length;
      setUnreadCount(count);
    };
    const loadReplies = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, booking_id, sender_id, recipient_id, content, created_at')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && !cancelled) {
          setReplies(data || []);
          computeUnread(data || []);
        }
      } catch (_) {}
    };
    loadReplies();
    try {
      channel = supabase
        .channel(`rt-user-messages-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq."${user.id}"` },
          async () => { await loadReplies(); }
        )
        .subscribe();
    } catch (_) {}
    return () => { cancelled = true; try { channel && supabase.removeChannel(channel); } catch (_) {} };
  }, [user?.id]);

  useEffect(() => {
    if (!repliesOpen) return;
    if (!user?.id) return;
    const storageKey = `messages_last_read_user_${user.id}`;
    localStorage.setItem(storageKey, String(Date.now()));
    // Recompute unread after marking read
    const last = Number(localStorage.getItem(storageKey) || 0);
    const count = (replies || []).filter(m => m.created_at && new Date(m.created_at).getTime() > last).length;
    setUnreadCount(count);
  }, [repliesOpen, user?.id, replies]);

  useEffect(() => {
    if (!latestBooking?.provider_id) return;
    let cancelled = false;
    const subscribe = () => {
      try {
        const ch = supabase
          .channel(`rt-provider-${latestBooking.provider_id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'providers', filter: `provider_id=eq.${latestBooking.provider_id}` }, async () => {
            try {
              const { data: prov } = await supabase
                .from('providers')
                .select('provider_id, professions, location, last_location_at')
                .eq('provider_id', latestBooking.provider_id)
                .maybeSingle();
              if (!cancelled) setLatestProvider(prov || null);
            } catch (_) {}
          })
          .subscribe();
        return ch;
      } catch (_) {
        return null;
      }
    };
    const ch = subscribe();
    return () => {
      cancelled = true;
      if (ch) try { supabase.removeChannel(ch); } catch (_) {}
    };
  }, [latestBooking?.provider_id]);

  useEffect(() => {
    let cancelled = false;
    const loadPending = async () => {
      try {
        if (!user?.id) return;
        const { data: books } = await supabase
          .from('bookings')
          .select('id, provider_id, status, address, notes, scheduled_date, scheduled_time, requested_at')
          .eq('user_id', user.id)
          .in('status', ['booked', 'requested'])
          .order('requested_at', { ascending: false });
        if (cancelled) return;
        setPendingBookings(books || []);
        const ids = Array.from(new Set((books || []).map(b => b.provider_id).filter(Boolean)));
        if (ids.length) {
          const { data: provs } = await supabase
            .from('providers')
            .select('provider_id, professions, location, last_location_at, is_available')
            .in('provider_id', ids);
          if (!cancelled) {
            const map = {};
            for (const p of provs || []) map[p.provider_id] = p;
            setProvidersById(map);
          }
        } else {
          setProvidersById({});
        }
      } catch (_) {}
    };
    loadPending();
    // Realtime subscription to user's bookings changes
    let chB = null;
    try {
      if (user?.id) {
        chB = supabase
          .channel(`rt-user-pending-bookings-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, loadPending)
          .subscribe();
      }
    } catch (_) {}
    return () => { cancelled = true; if (chB) try { supabase.removeChannel(chB); } catch (_) {} };
  }, [user?.id]);

  useEffect(() => {
    // Subscribe to providers shown in pending list for live location
    const ids = Array.from(new Set(pendingBookings.map(b => b.provider_id).filter(Boolean)));
    const channels = [];
    const onUpdate = async (pid) => {
      try {
        const { data: prov } = await supabase
          .from('providers')
          .select('provider_id, professions, location, last_location_at, is_available')
          .eq('provider_id', pid)
          .maybeSingle();
        setProvidersById(prev => ({ ...prev, [pid]: prov || prev[pid] }));
      } catch (_) {}
    };
    try {
      for (const pid of ids) {
        const ch = supabase
          .channel(`rt-provider-pending-${pid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'providers', filter: `provider_id=eq.${pid}` }, () => onUpdate(pid))
          .subscribe();
        channels.push(ch);
      }
    } catch (_) {}
    return () => {
      for (const ch of channels) {
        try { supabase.removeChannel(ch); } catch (_) {}
      }
    };
  }, [pendingBookings]);

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
            {t('myProfile') || 'My Profile'}
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
                  {t('verifiedBadge') || 'Verified'}
                </Badge>
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editing ? (t('closeEditor') || 'Close Editor') : (t('editProfile') || 'Edit Profile')}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" onClick={() => setRepliesOpen(true)} className="relative mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 transition text-sm font-medium text-slate-700">
                      <MessageSquare className="w-4 h-4" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-semibold">F</span>
                        <span>Fixapp Chat</span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-2">
                      {replies.length === 0 ? (
                        <div className="text-sm text-slate-600">No messages yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {replies.map((m) => {
                            const isIncoming = true; // provider -> user
                            const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                            return (
                              <div key={m.id} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm ${isIncoming ? 'bg-gray-100 text-slate-900 rounded-bl-sm' : 'bg-blue-600 text-white rounded-br-sm'}`}>
                                  <div className="text-sm whitespace-pre-wrap break-words">{m.content || ''}</div>
                                  <div className={`text-[10px] mt-1 text-right ${isIncoming ? 'text-slate-500' : 'text-blue-100'}`}>{timeStr}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader>
              <CardTitle className="text-2xl">{t('accountInformation') || 'Account Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editing && (
                <form onSubmit={handleSave} className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <Label htmlFor="fullName">{t('fullNameLabel') || 'Full Name'}</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      placeholder={t('enterFullName') || 'Enter your full name'}
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="avatarUrl">{t('avatarUrlLabel') || 'Avatar URL (optional)'}</Label>
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
                      {saving ? 'Saving...' : (t('saveChanges') || 'Save Changes')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { setEditing(false); setForm({ fullName: user.fullName || '', avatarUrl: user.avatarUrl || '' }); }}>
                      {t('cancel') || 'Cancel'}
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
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('emailLabel') || 'Email'}</p>
                    <p className="font-semibold">{user.email || 'Not provided'}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('phoneLabel') || 'Phone'}</p>
                    <p className="font-semibold">{user.phone || 'Not provided'}</p>
                    {!user.phone && (
                      <div className="mt-2">
                        <Button size="sm" onClick={() => navigate('/verify-otp')}>
                          {t('verifyNumber') || 'Verify Number'}
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
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t('memberSince') || 'Member Since'}</p>
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
                {t('logout') || 'Logout'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Booking History */}
        <Card className="mt-6 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-1000">
          <CardHeader>
            <CardTitle className="text-2xl">{t('recentBookings') || 'Recent Bookings'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!latestBooking ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                <p>{t('noBookingsYet') || 'No bookings yet. Start by finding a service provider!'}</p>
                <Button
                  onClick={() => navigate('/providers')}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
                >
                  {t('browseProviders') || 'Browse Providers'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold">Booking ID {(latestBooking.id || '').toString().slice(0, 8)}</div>
                    {latestBooking.scheduled_date || latestBooking.scheduled_time ? (
                      <div className="text-xs text-slate-600 mt-1">{t('when') || 'When'}: {latestBooking.scheduled_date || ''} {latestBooking.scheduled_time || ''}</div>
                    ) : null}
                    {latestBooking.address ? (
                      <div className="text-xs text-slate-600 mt-1">{t('address') || 'Address'}: {latestBooking.address}</div>
                    ) : null}
                    {latestBooking.notes ? (
                      <div className="text-xs text-slate-500 mt-1">{t('notes') || 'Notes'}: {latestBooking.notes}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {t('status') || 'Status'}: {latestBooking.status || 'unknown'}
                    </Badge>
                    {latestProvider && (
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setMapForProviderId(latestBooking.provider_id);
                            const loc = await getGeolocation();
                            if (loc) setUserMapLocation(loc);
                          }}
                          className="inline-flex"
                          title={t('showLiveLocation') || 'Show live location'}
                        >
                          <Badge variant="outline" className="flex items-center gap-1 cursor-pointer">
                            <MapPin className="w-3 h-3" />
                          </Badge>
                        </button>
                      </div>
                    )}
                    {latestProvider?.last_location_at ? (
                      <div className="mt-1 text-[11px] text-slate-500">Updated {new Date(latestProvider.last_location_at).toLocaleString()}</div>
                    ) : null}
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => navigate(`/book/${latestBooking.provider_id}`)}>
                    {t('bookAgain') || 'Book Again'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Pending Bookings */}
        <Card className="mt-6 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-1000">
          <CardHeader>
            <CardTitle className="text-2xl">{t('pendingBookings') || 'Pending Bookings'}</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingBookings.length === 0 ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('noPendingBookings') || 'No pending bookings.'}</div>
            ) : (
              <div className="divide-y">
                {pendingBookings.map((b) => {
                  const p = providersById[b.provider_id];
                  const hasLoc = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
                  return (
                    <div key={b.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Booking ID: {(b.id || '').toString().slice(0, 8)}</div>
                        <div className="text-xs text-slate-600">Status: {b.status}</div>
                        {(b.scheduled_date || b.scheduled_time) && (
                          <div className="text-xs text-slate-600">When: {b.scheduled_date || ''} {b.scheduled_time || ''}</div>
                        )}
                        {b.address && <div className="text-xs text-slate-600">Address: {b.address}</div>}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge variant={p?.is_available ? 'default' : 'outline'} className={p?.is_available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : ''}>
                          {p?.is_available ? (t('available') || 'Available') : (t('busy') || 'Busy')}
                        </Badge>
                        <button
                          type="button"
                          onClick={async () => {
                            setMapForProviderId(b.provider_id);
                            const loc = await getGeolocation();
                            if (loc) setUserMapLocation(loc);
                          }}
                          className="inline-flex"
                          title="Show live location"
                        >
                          <Badge variant="outline" className="flex items-center gap-1 cursor-pointer">
                            <MapPin className="w-3 h-3" />
                          </Badge>
                        </button>
                      </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t('messageProviderPlaceholder') || 'Message provider…'}
                        value={messageByBooking[b.id] || ''}
                        onChange={(e) => setMessageByBooking((m) => ({ ...m, [b.id]: e.target.value }))}
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <Button variant="outline" onClick={() => sendMessage(b)}>{t('send') || 'Send'}</Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Map Modal */}
      {mapForProviderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMapForProviderId(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-[95vw] max-w-2xl p-4 z-10">
            {(() => {
              const prov = providersById[mapForProviderId] || (latestProvider?.provider_id === mapForProviderId ? latestProvider : null);
              const hasLoc = typeof prov?.location?.lat === 'number' && typeof prov?.location?.lng === 'number';
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-semibold">Live Location</div>
                      <div className="text-xs text-slate-500">Provider ID: {mapForProviderId}</div>
                    </div>
                    <Button variant="outline" onClick={() => setMapForProviderId(null)}>Close</Button>
                  </div>
                  <div className="w-full h-72 rounded-lg overflow-hidden border">
                    {hasLoc ? (
                      <iframe
                        title="provider-live-map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${prov.location.lat},${prov.location.lng}&z=15&output=embed`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">Location not available</div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {hasLoc ? `${prov.location.lat.toFixed(5)}, ${prov.location.lng.toFixed(5)}` : 'N/A'}
                      </div>
                      {userMapLocation && hasLoc ? (
                        <div>
                          Distance: {(() => {
                            const d = haversineKm(userMapLocation, { lat: prov.location.lat, lng: prov.location.lng });
                            return d ? `${d.toFixed(2)} km (approx)` : 'N/A';
                          })()}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      {prov?.last_location_at ? `Updated ${new Date(prov.last_location_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;