import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Download, Wallet, User, MapPin, Phone, Mail, Award, Shield, QrCode, CheckCircle2, AlertTriangle, Bell, Star, MessageSquare } from 'lucide-react';
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
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const [walletSum, setWalletSum] = useState(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [msgItems, setMsgItems] = useState([]);

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
      setProvider(data || null);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
      toast.error('Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  };

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
    return () => { cancelled = true; try { channel && supabase.removeChannel(channel); } catch (_) {} try { channel2 && supabase.removeChannel(channel2); } catch (_) {} };
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
        .eq('recipient_id', provider.provider_id) // Must be valid UUID
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
          filter: `recipient_id=eq."${provider.provider_id}"`, // ✅ UUID must be in quotes
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


  const markWorkDone = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)
        .eq('provider_id', provider.provider_id);
      if (error) throw error;
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
    if (!provider?.provider_id) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, user_id, status, address, notes, user_location, requested_at, scheduled_date, scheduled_time')
        .eq('provider_id', provider.provider_id)
        .in('status', ['booked','requested'])
        .order('requested_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifItems(data || []);
    } catch (e) {
      console.error('Failed to load bookings', e);
      toast.error('Failed to load notifications');
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

  const downloadIdCard = async () => {
    try {
      if (!provider?.id_card_path) {
        toast.error('ID card not available');
        return;
      }
      const isBase64 = provider.id_card_path.length > 100 && !provider.id_card_path.includes('/');
      let href = '';
      if (isBase64) {
        href = `data:image/png;base64,${provider.id_card_path}`;
      } else {
        const { data, error } = await supabase.storage.from('provider-docs').createSignedUrl(provider.id_card_path, 60);
        if (error) throw error;
        href = data.signedUrl;
      }
      const link = document.createElement('a');
      link.href = href;
      link.download = `provider-id-${providerId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ID Card downloaded successfully');
    } catch (error) {
      console.error('Failed to download ID card:', error);
      toast.error('Failed to download ID card');
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-800">Provider Dashboard</h1>
              <p className="text-gray-600">Welcome back, Provider ID: {provider.provider_id}</p>
            </div>
          </div>
          
          {provider.is_verified && (
            <Badge className="professional-badge text-lg px-6 py-2" data-testid="verification-status">
              ✓ Verified Provider
            </Badge>
          )}

          <div className="mt-3 flex justify-center gap-3 flex-wrap">
            <button type="button" onClick={() => { setNotifOpen(v => !v); if (!notifOpen) loadLatestBookings(); }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition">
              <Bell className="h-4 w-4 text-gray-700" />
              <span className="text-sm text-gray-700">Notifications</span>
              {notifCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-red-600 text-white">
                  {notifCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setMsgOpen(v => !v)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition">
              <MessageSquare className="h-4 w-4 text-gray-700" />
              <span className="text-sm text-gray-700">Messages</span>
              {msgCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                  {msgCount}
                </span>
              )}
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              <span className="text-sm text-gray-700">Completed Jobs</span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                {completedCount}
              </span>
            </div>
          </div>
        </div>

        {msgOpen && (
          <div className="max-w-6xl mx-auto mb-6">
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                {msgItems.length === 0 ? (
                  <div className="text-sm text-gray-600">No messages yet.</div>
                ) : (
                  <div className="divide-y">
                    {msgItems.map((m) => (
                      <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-800 truncate">From: {m.sender_id || 'user'}</div>
                          {m.booking_id && <div className="text-xs text-gray-600">Booking: {m.booking_id}</div>}
                          <div className="text-sm text-gray-700 mt-1 break-words">{m.content || ''}</div>
                        </div>
                        <div className="shrink-0 text-xs text-gray-500">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {notifOpen && (
          <div className="max-w-6xl mx-auto mb-6">
            <Card className="border-0 shadow-2xl">
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {notifItems.length === 0 ? (
                  <div className="text-sm text-gray-600">No bookings yet.</div>
                ) : (
                  <div className="divide-y">
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
                            <div className="mt-1 text-sm text-gray-800 truncate">User: {b.user_id || 'N/A'}</div>
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
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ID Card */}
          <div className="lg:col-span-1">
            <Card className="id-card border-0 shadow-2xl">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="id-card-header">Service Provider ID</div>
                  
                  <div className="provider-id text-4xl font-black" data-testid="provider-id-display">
                    {provider.provider_id}
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div className="space-y-2 text-left">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{provider.mobile_number}</span>
                    </div>
                    {provider.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{provider.email}</span>
                        <Badge variant={provider.email_verified ? 'default' : 'secondary'} className="ml-2">
                          {provider.email_verified ? 'Email Verified' : 'Email Unverified'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Professions:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.professions.map(profession => (
                        <Badge key={profession} variant="secondary" className="text-xs">
                          {profession.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {provider.qr_code && (
                    <div className="qr-code-container">
                      <img 
                        src={`data:image/png;base64,${provider.qr_code}`}
                        alt="Provider QR Code"
                        className="w-24 h-24 mx-auto"
                        data-testid="qr-code-image"
                      />
                    </div>
                  )}
                  
                  <Button 
                    onClick={downloadIdCard}
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                    data-testid="download-id-card-btn"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download ID Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reviews (Realtime) */}
            <ReviewsPanel providerId={provider.provider_id} />
            {/* Availability */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {provider.is_available ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  )}
                  <span>Availability</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Current status:</span>
                    <Badge className={provider.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {provider.is_available ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                  <Button onClick={toggleAvailability} disabled={isTogglingAvail}>
                    {isTogglingAvail ? 'Updating…' : provider.is_available ? 'Set Busy' : 'Set Available'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* Wallet */}
            <Card className="glass-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-6 w-6 text-purple-600" />
                  <span>Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="wallet-card">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white/80 text-sm font-medium">Current Balance</p>
                        <p className="text-4xl font-bold text-white" data-testid="wallet-balance">
                          ₹{Number.isFinite(walletSum) ? walletSum.toFixed(2) : (Number.isFinite(provider?.wallet_balance) ? Number(provider.wallet_balance).toFixed(2) : '0.00')}
                        </p>
                      </div>
                      <div className="text-white/60">
                        <Wallet className="h-8 w-8" />
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <p className="text-white/80 text-sm">Provider ID: {provider.provider_id}</p>
                      <p className="text-white/60 text-xs mt-1">
                        Member since {new Date(provider.created_at).toLocaleDateString()}
                      </p>
                      {/* Removed provider-side test payment button */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;