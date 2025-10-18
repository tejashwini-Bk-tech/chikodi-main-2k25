import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Wallet, User, MapPin, Phone, Mail, Award, Shield, QrCode, CheckCircle2, AlertTriangle, Bell, Star, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function ReviewsPanel({ providerId }) {
  const [avg, setAvg] = useState(null);
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!providerId) return;
    let channel, channel2;
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, user_id, rating, comment, created_at')
          .eq('provider_id', providerId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && !cancelled) {
          setItems(data || []);
          if (data && data.length) {
            const sum = data.reduce((s, r) => s + (Number(r.rating) || 0), 0);
            setAvg((sum / data.length).toFixed(1));
          } else {
            setAvg(null);
          }
        }
      } catch (_) {}
    };

    load();
    try {
      channel = supabase
        .channel(`realtime-reviews-${providerId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `provider_id=eq.${providerId}` }, async () => {
          await load();
        })
        .subscribe();
    } catch (_) {}
    return () => { cancelled = true; try { channel && supabase.removeChannel(channel); } catch (_) {} };
  }, [providerId]);

  return (
    <Card className="glass-card border-0 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <span>Reviews</span>
          {avg && <span className="ml-2 text-sm text-gray-600">Avg {avg}/5</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-gray-600">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map(r => (
              <div key={r.id} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{r.user_id || 'User'}</span>
                  <span className="text-amber-600">{('★').repeat(Number(r.rating) || 0)}</span>
                  <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.comment && <div className="text-sm text-gray-700 mt-1">{r.comment}</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ProviderDashboard = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedItems, setCompletedItems] = useState([]);
  const [notifItems, setNotifItems] = useState([]);
  const [walletSum, setWalletSum] = useState(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [msgItems, setMsgItems] = useState([]);
  const [replyByMsgId, setReplyByMsgId] = useState({});
  const [profile, setProfile] = useState(null);
  const [aadhaarVal, setAadhaarVal] = useState('');
  const [panVal, setPanVal] = useState('');

  useEffect(() => {
    fetchProviderData();
  }, [providerId]);

  const fetchProviderData = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle();
      if (error) throw error;
      console.log('[ProviderDashboard] providers fetch result:', data);
      setProvider(data || null);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
      toast.error('Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    try { toast.message('Logged out'); } catch (_) {}
    navigate('/login');
  };

  const fetchProfileData = async (profileId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', profileId)
        .maybeSingle();
      if (error) throw error;
      console.log('[ProviderDashboard] profiles fetch result:', data);
      setProfile(data || null);
    } catch (e) {
      console.error('Failed to fetch profile data:', e);
    }
  };

  useEffect(() => {
    if (provider?.provider_id) {
      fetchProfileData(provider.provider_id);
    }
  }, [provider?.provider_id]);

  // Realtime payments: compute wallet sum(amount) and toast on new payments
  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    let cancelled = false;
    const refreshSum = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('amount')
          .eq('provider_id', provider.provider_id);
        if (!error && !cancelled) {
          const sum = (data || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
          setWalletSum(sum);
        }
      } catch (_) {}
    };
    refreshSum();
    try {
      channel = supabase
        .channel(`realtime-payments-${provider.provider_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `provider_id=eq.${provider.provider_id}` }, async (payload) => {
          if (payload?.eventType === 'INSERT') {
            const amt = Number(payload?.new?.amount) || 0;
            const method = payload?.new?.method || 'payment';
            if (amt > 0) {
              toast.success(`Payment received: ₹${amt.toFixed(2)}`, { description: method === 'cash' ? 'Cash payment confirmed' : 'Wallet updated' });
            }
          }
          await refreshSum();
        })
        .subscribe();
    } catch (_) {}
    return () => { cancelled = true; try { channel && supabase.removeChannel(channel); } catch (_) {} try { channel && supabase.removeChannel(channel); } catch (_) {} };
  }, [provider?.provider_id]);

  // Messages realtime for provider (recipient_id only)
useEffect(() => {
  if (!provider?.provider_id) return; // Exit if no provider ID

  let channel;
  let cancelled = false;
  let firstLoad = true;

  // Function to fetch latest messages
  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, booking_id, sender_id, recipient_id, content, created_at')
        .or(`recipient_id.eq.${provider.provider_id},sender_id.eq.${provider.provider_id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) { try { toast.error('Failed to load messages'); } catch (_) {} return; }
      if (!cancelled) {
        setMsgItems(data || []);
        setMsgCount((data || []).length);

        if (firstLoad) { try { toast.message(`Messages loaded: ${(data || []).length}`); } catch (_) {} firstLoad = false; }
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  loadMessages(); // Initial load

  // Set up real-time subscription
  try {
    channel = supabase
      .channel(`realtime-messages-${provider.provider_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq."${provider.provider_id}"`, // UUID must be in quotes
        },
        async (payload) => {
          if (payload?.eventType === 'INSERT') {
            setMsgCount((c) => c + 1);
            toast.success('New message received');
          }
          await loadMessages(); // Refresh messages
        }
      )
      .subscribe();
  } catch (err) {
    console.error('Realtime subscription error:', err);
  }

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel); // Clean up subscription
  };
}, [provider?.provider_id]);

  const sendReply = async (targetUserId, bookingId, msgId) => {
    const text = (replyByMsgId[msgId] || '').trim();
    if (!text) return;
    if (!provider?.provider_id) return;
    const base = { recipient_id: targetUserId, sender_id: provider.provider_id, booking_id: bookingId };
    try {
      let { error } = await supabase.from('messages').insert({ ...base, content: text });
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('column') && msg.includes('content')) {
          const retry = await supabase.from('messages').insert({ ...base, message: text });
          if (retry.error) throw retry.error;
        } else if (msg.includes('relation') && msg.includes('messages')) {
          try { toast.error('Messages table missing'); } catch (_) {}
          return;
        } else {
          throw error;
        }
      }
      try { toast.success('Reply sent'); } catch (_) {}
      // Optimistically add to chat so it appears immediately
      setMsgItems(prev => [
        { id: `local-${Date.now()}`, booking_id: bookingId, sender_id: provider.provider_id, recipient_id: targetUserId, content: text, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setReplyByMsgId(prev => ({ ...prev, [msgId]: '' }));
    } catch (e) {
      console.error('Reply failed:', e);
      try { toast.error(e?.message || 'Failed to send reply'); } catch (_) {}
    }
  };


  const markWorkDone = async (bookingId) => {
    console.log('Marking booking as completed:', bookingId);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)
        .eq('provider_id', provider.provider_id)
        .select();
      if (error) throw error;
      console.log('Booking updated successfully:', data);
      toast.success('Marked as completed');
      // Refresh notifications and count
      await loadLatestBookings();
      // Trigger count refresh by reusing realtime refresh
      setNotifCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark done', e);
      toast.error('Failed to mark as completed');
    }
  };

  // Realtime notifications for bookings
  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    let cancelled = false;
    const refreshCount = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('provider_id', provider.provider_id)
          .in('status', ['booked', 'requested']);
        if (!error && !cancelled) setNotifCount((data || []).length);
      } catch (_) {}
    };
    refreshCount();
    try {
      channel = supabase
        .channel(`realtime-bookings-${provider.provider_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.provider_id}` }, async (payload) => {
          // Safest: recompute count on any change involving this provider
          await refreshCount();
        })
        .subscribe();
    } catch (_) {}
    return () => {
      cancelled = true;
      try { channel && supabase.removeChannel(channel); } catch (_) {}
    };
  }, [provider?.provider_id]);

  // Realtime completed jobs count
  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    let cancelled = false;
    const refreshCompleted = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id')
          .eq('provider_id', provider.provider_id)
          .eq('status', 'completed');
        if (!error && !cancelled) setCompletedCount((data || []).length);
      } catch (_) {}
    };
    refreshCompleted();
    try {
      channel = supabase
        .channel(`realtime-bookings-completed-${provider.provider_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.provider_id}` }, async () => {
          await refreshCompleted();
        })
        .subscribe();
    } catch (_) {}
    return () => { cancelled = true; try { channel && supabase.removeChannel(channel); } catch (_) {} };
  }, [provider?.provider_id]);

  const loadLatestBookings = async () => {
    console.log('Loading latest bookings for provider:', provider?.provider_id);
    if (!provider?.provider_id) {
      console.log('No provider ID available');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, status, address, notes, user_location, requested_at, scheduled_date, scheduled_time')
        .eq('provider_id', provider.provider_id)
        .in('status', ['booked','requested'])
        .order('requested_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Fetched recent bookings:', data);
      setNotifItems(data || []);
    } catch (e) {
      console.error('Failed to load bookings', e);
      toast.error('Failed to load notifications');
    }
  };

  const loadCompletedJobs = async () => {
    console.log('Loading completed jobs for provider:', provider?.provider_id);
    if (!provider?.provider_id) {
      console.log('No provider ID available for completed jobs');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, status, address, notes, user_location, requested_at, scheduled_date, scheduled_time')
        .eq('provider_id', provider.provider_id)
        .eq('status', 'completed')
        .order('requested_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Supabase error for completed jobs:', error);
        throw error;
      }
      console.log('Fetched completed jobs:', data);
      setCompletedItems(data || []);
    } catch (e) {
      console.error('Failed to load completed jobs', e);
      toast.error('Failed to load completed jobs');
    }
  };

  const toggleAvailability = async () => {
    if (!provider) return;
    try {
      setIsTogglingAvail(true);
      const next = !Boolean(provider.is_available);
      const { error } = await supabase
        .from('providers')
        .update({ is_available: next })
        .eq('provider_id', provider.provider_id);
      if (error) throw error;
      setProvider(prev => prev ? { ...prev, is_available: next } : prev);
      toast.success(next ? 'You are now Available' : 'You are now Busy');
    } catch (e) {
      console.error('Failed to toggle availability', e);
      toast.error('Failed to update availability');
    } finally {
      setIsTogglingAvail(false);
    }
  };

  const verifyIdentity = async () => {
    try {
      const a = (aadhaarVal || '').replace(/\D/g, '');
      const aOk = /^\d{12}$/.test(a);
      const p = (panVal || '').toUpperCase().trim();
      const pOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p);
      if (!aOk) { toast.error('Enter a valid 12-digit Aadhaar number'); return; }
      if (!pOk) { toast.error('Enter a valid PAN (e.g., ABCDE1234F)'); return; }
      const { error } = await supabase
        .from('providers')
        .update({ is_verified: true, verification_date: new Date().toISOString() })
        .eq('provider_id', provider.provider_id);
      if (error) throw error;
      setProvider(prev => prev ? { ...prev, is_verified: true, verification_date: new Date().toISOString() } : prev);
      toast.success('Identity verified');
    } catch (e) {
      toast.error('Failed to verify identity');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-shimmer w-96 h-64 rounded-lg"></div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card border-0 shadow-2xl p-8 text-center">
          <CardTitle className="text-2xl text-red-600 mb-4">Provider Not Found</CardTitle>
          <p className="text-gray-600">The provider ID you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-800">FIXORA</h1>
              <div className="hidden md:flex items-center space-x-6 ml-8">
                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition">Dashboard</button>
                <button onClick={() => navigate(`/account/${providerId}`)} className="text-sm font-medium text-gray-600 hover:text-gray-700 transition">Account</button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" onClick={() => loadLatestBookings()} className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700">
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">Recent</span>
                    {notifCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-red-600 text-white">
                        {notifCount}
                      </span>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Recent Bookings</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    {notifItems.length === 0 ? (
                      <div className="text-sm text-gray-600">No recent bookings.</div>
                    ) : (
                      <div className="divide-y space-y-4">
                        {notifItems.map((b) => {
                          const lat = typeof b?.user_location?.lat === 'number' ? b.user_location.lat : null;
                          const lng = typeof b?.user_location?.lng === 'number' ? b.user_location.lng : null;
                          const mapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
                          return (
                            <div key={b.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge className={b.status === 'booked' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                    {b.status === 'booked' ? 'Booked' : 'Requested'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{new Date(b.requested_at).toLocaleString()}</span>
                                </div>
                                <div className="mt-1 text-sm text-gray-800 truncate">
                                  Customer: {b.user_id || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-700 truncate">Address: {b.address || 'N/A'}</div>
                                {b.notes && <div className="text-xs text-gray-600 mt-1">Notes: {b.notes}</div>}
                                {(b.scheduled_date || b.scheduled_time) && (
                                  <div className="text-xs text-gray-600 mt-1">When: {b.scheduled_date || ''} {b.scheduled_time || ''}</div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                {mapsUrl ? (
                                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">Open in Maps</a>
                                ) : (
                                  <span className="text-xs text-gray-500">No location</span>
                                )}
                                <button type="button" onClick={() => markWorkDone(b.id)} className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">Mark Done</button>
                                {/* Removed provider-side 'Record Payment' button; payments are initiated by user */}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" onClick={() => setMsgOpen(true)} className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Fixapp</span>
                    {msgCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                        {msgCount}
                      </span>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-sm font-semibold">F</span>
                      <span>Fixapp Chat</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-2">
                    {msgItems.length === 0 ? (
                      <div className="text-sm text-gray-600">No messages yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {msgItems.map((m) => {
                          const isIncoming = m.sender_id && m.sender_id !== provider.provider_id;
                          const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                          return (
                            <div key={m.id} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm ${isIncoming ? 'bg-gray-100 text-gray-800 rounded-bl-sm' : 'bg-emerald-600 text-white rounded-br-sm'}`}>
                                <div className="text-sm whitespace-pre-wrap break-words">{m.content || ''}</div>
                                <div className={`text-[10px] mt-1 text-right ${isIncoming ? 'text-gray-500' : 'text-emerald-100'}`}>{timeStr}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    placeholder="Reply…"
                                    value={replyByMsgId[m.id] || ''}
                                    onChange={(e) => setReplyByMsgId(prev => ({ ...prev, [m.id]: e.target.value }))}
                                  />
                                  <Button size="sm" variant={isIncoming ? 'outline' : 'secondary'} onClick={() => sendReply(m.sender_id, m.booking_id, m.id)}>Send</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" onClick={() => loadCompletedJobs()} className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700">
                    <span className="hidden sm:inline">Completed</span>
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                      {completedCount}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Completed Jobs</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    {completedItems.length === 0 ? (
                      <div className="text-sm text-gray-600">No completed jobs yet.</div>
                    ) : (
                      <div className="divide-y space-y-4">
                        {completedItems.map((b) => {
                          const lat = typeof b?.user_location?.lat === 'number' ? b.user_location.lat : null;
                          const lng = typeof b?.user_location?.lng === 'number' ? b.user_location.lng : null;
                          const mapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
                          return (
                            <div key={b.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    Completed
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {b.requested_at ? new Date(b.requested_at).toLocaleString() : 'Recently completed'}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-800 truncate">
                                  Customer: {b.user_id || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-700 truncate">Address: {b.address || 'N/A'}</div>
                                {b.notes && <div className="text-xs text-gray-600 mt-1">Notes: {b.notes}</div>}
                                {(b.scheduled_date || b.scheduled_time) && (
                                  <div className="text-xs text-gray-600 mt-1">When: {b.scheduled_date || ''} {b.scheduled_time || ''}</div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                {mapsUrl ? (
                                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">View Location</a>
                                ) : (
                                  <span className="text-xs text-gray-500">No location</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <button type="button" className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">Wallet</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Wallet Balance
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <div className="wallet-card p-6">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white/80 text-sm font-medium">Current Balance</p>
                            <p className="text-3xl font-bold text-white" data-testid="wallet-balance">
                              ₹{Number.isFinite(walletSum) ? walletSum.toFixed(2) : (Number.isFinite(provider?.wallet_balance) ? Number(provider.wallet_balance).toFixed(2) : '0.00')}
                            </p>
                          </div>
                          <div className="text-white/60">
                            <Wallet className="h-8 w-8" />
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/20">
                          <p className="text-white/80 text-sm">Provider ID: {provider.provider_id}</p>
                          <p className="text-white/60 text-xs mt-1">
                            Member since {new Date(provider.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700">
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-left mb-3">
            <h2 className="text-5xl font-bold text-emerald-600">Provider Dashboard</h2>
          </div>

          {/* User Info */}
          <div className="text-left mb-8">
            <p className="text-3xl font-bold text-gray-800">Welcome back,</p>
            
            {provider.is_verified && (
              <Badge className="professional-badge text-lg px-6 py-2" data-testid="verification-status">
                ✓ Verified Provider
              </Badge>
            )}
          </div>
        </div>

        {/* Collapsible Panels */}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Content */}
          {/* Availability - Moved to top */}
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {provider.is_available ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                )}
                <span>Availability Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <Badge className={`px-4 py-2 text-base font-semibold ${provider.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {provider.is_available ? 'Available' : 'Busy'}
                </Badge>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{provider.is_available ? 'On' : 'Off'}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.is_available}
                      onChange={toggleAvailability}
                      disabled={isTogglingAvail}
                      className="sr-only peer"
                    />
                    <div className={`w-16 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:w-14 peer-checked:h-7 after:content-[''] after:absolute after:top-[4px] after:left-[4px] peer-checked:after:top-[2px] peer-checked:after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 peer-checked:after:h-6 peer-checked:after:w-6 after:transition-all peer-checked:bg-green-600 ${isTogglingAvail ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Verification - Moved to second position */}
          {!provider.is_verified && (
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle>Identity Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-700">Aadhaar Number</label>
                    <Input value={aadhaarVal} onChange={(e) => setAadhaarVal(e.target.value)} placeholder="1234 5678 9012" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">PAN</label>
                    <Input value={panVal} onChange={(e) => setPanVal(e.target.value)} placeholder="ABCDE1234F" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={verifyIdentity}>Verify</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Status */}
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-6 w-6 text-emerald-600" />
                <span>Professional Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {provider.professions.map(profession => {
                  const status = provider.professional_status[profession];
                  const isProfessional = status === 'Professional';
                  return (
                    <div key={profession} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800 capitalize">
                          {profession.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        {isProfessional ? (
                          <Badge className="professional-badge">
                            Professional
                          </Badge>
                        ) : (
                          <Badge className="amateur-badge">
                            Amateur/Freelancer
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Documents Status */}
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <span>Document Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Trade License</span>
                  <Badge variant={provider.has_trade_license ? 'default' : 'secondary'}>
                    {provider.has_trade_license ? '✓ Uploaded' : '✗ Not Uploaded'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Health Permit</span>
                  <Badge variant={provider.has_health_permit ? 'default' : 'secondary'}>
                    {provider.has_health_permit ? '✓ Uploaded' : '✗ Not Uploaded'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Certificates</span>
                  <Badge variant={provider.has_certificates ? 'default' : 'secondary'}>
                    {provider.has_certificates ? '✓ Uploaded' : '✗ Not Uploaded'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">ID Verification</span>
                  <Badge className="professional-badge">
                    ✓ Verified
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews - Moved to bottom */}
          <ReviewsPanel providerId={provider.provider_id} />
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;