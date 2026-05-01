import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { Wallet, User, Bell, Star, MessageSquare, CheckCircle2, AlertTriangle, Award, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function ReviewsPanel({ providerId }) {
  const [avg, setAvg] = useState(null);
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!providerId) return;
    let channel;
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
          if (data?.length) {
            const sum = data.reduce((s, r) => s + (Number(r.rating) || 0), 0);
            setAvg((sum / data.length).toFixed(1));
          } else {
            setAvg(null);
          }
        }
      } catch { }
    };
    load();
    channel = supabase
      .channel(`realtime-reviews-${providerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `provider_id=eq.${providerId}` }, load)
      .subscribe();
    return () => {
      cancelled = true;
      try { channel && supabase.removeChannel(channel); } catch { }
    };
  }, [providerId]);

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Star className="h-5 w-5 text-amber-500" /> Reviews {avg && <span className="text-sm text-slate-500">Avg {avg}/5</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-sm text-slate-500">No reviews yet.</p> : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{r.user_id || 'User'}</span>
                  <span className="text-amber-500">{'*'.repeat(Number(r.rating) || 0)}</span>
                  <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.comment && <p className="text-sm text-slate-700 mt-1">{r.comment}</p>}
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
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedItems, setCompletedItems] = useState([]);
  const [walletSum, setWalletSum] = useState(null);
  const [msgCount, setMsgCount] = useState(0);
  const [msgItems, setMsgItems] = useState([]);
  const [aadhaarVal, setAadhaarVal] = useState('');
  const [panVal, setPanVal] = useState('');

  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string' && addr.toLowerCase().startsWith('live location:')) return 'Customer shared live location';
    return addr;
  };

  useEffect(() => { fetchProviderData(); }, [providerId]);

  const fetchProviderData = async () => {
    try {
      const { data, error } = await supabase.from('providers').select('*').eq('provider_id', providerId).maybeSingle();
      if (error) throw error;
      setProvider(data || null);
    } catch {
      toast.error('Failed to load provider data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileData = async (id) => {
    const { data } = await supabase.from('profiles').select('full_name, phone').eq('id', id).maybeSingle();
    setProfile(data || null);
  };
  useEffect(() => { if (provider?.provider_id) fetchProfileData(provider.provider_id); }, [provider?.provider_id]);

  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    const refresh = async () => {
      const { data } = await supabase.from('payments').select('amount').eq('provider_id', provider.provider_id);
      const sum = (data || []).reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
      setWalletSum(sum);
    };
    refresh();
    channel = supabase.channel(`rt-payments-${provider.provider_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `provider_id=eq.${provider.provider_id}` }, refresh).subscribe();
    return () => { try { channel && supabase.removeChannel(channel); } catch { } };
  }, [provider?.provider_id]);

  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    const load = async () => {
      const { data } = await supabase.from('messages').select('id, booking_id, sender_id, content, created_at').eq('recipient_id', provider.provider_id).order('created_at', { ascending: false }).limit(20);
      setMsgItems(data || []);
      setMsgCount((data || []).length);
    };
    load();
    channel = supabase.channel(`rt-messages-${provider.provider_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${provider.provider_id}` }, load).subscribe();
    return () => { try { channel && supabase.removeChannel(channel); } catch { } };
  }, [provider?.provider_id]);

  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    const refresh = async () => {
      const { data } = await supabase.from('bookings').select('id').eq('provider_id', provider.provider_id).in('status', ['booked', 'requested']);
      setNotifCount((data || []).length);
    };
    refresh();
    channel = supabase.channel(`rt-bookings-${provider.provider_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.provider_id}` }, refresh).subscribe();
    return () => { try { channel && supabase.removeChannel(channel); } catch { } };
  }, [provider?.provider_id]);

  useEffect(() => {
    if (!provider?.provider_id) return;
    let channel;
    const refresh = async () => {
      const { data } = await supabase.from('bookings').select('id').eq('provider_id', provider.provider_id).eq('status', 'completed');
      setCompletedCount((data || []).length);
    };
    refresh();
    channel = supabase.channel(`rt-bookings-completed-${provider.provider_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${provider.provider_id}` }, refresh).subscribe();
    return () => { try { channel && supabase.removeChannel(channel); } catch { } };
  }, [provider?.provider_id]);

  const loadLatestBookings = async () => {
    const { data, error } = await supabase.from('bookings').select('id,user_id,status,address,notes,user_location,requested_at,scheduled_date,scheduled_time').eq('provider_id', provider.provider_id).in('status', ['booked', 'requested']).order('requested_at', { ascending: false }).limit(20);
    if (error) return toast.error('Failed to load bookings');
    setNotifItems(data || []);
  };

  const loadCompletedJobs = async () => {
    const { data, error } = await supabase.from('bookings').select('id,user_id,status,address,notes,user_location,requested_at,scheduled_date,scheduled_time').eq('provider_id', provider.provider_id).eq('status', 'completed').order('requested_at', { ascending: false }).limit(20);
    if (error) return toast.error('Failed to load completed jobs');
    setCompletedItems(data || []);
  };

  const toggleAvailability = async () => {
    if (!provider) return;
    setIsTogglingAvail(true);
    try {
      const next = !Boolean(provider.is_available);
      const { error } = await supabase.from('providers').update({ is_available: next }).eq('provider_id', provider.provider_id);
      if (error) throw error;
      setProvider((p) => ({ ...p, is_available: next }));
      toast.success(next ? 'You are now Available' : 'You are now Busy');
    } catch {
      toast.error('Failed to update availability');
    } finally { setIsTogglingAvail(false); }
  };

  const verifyIdentity = async () => {
    const a = (aadhaarVal || '').replace(/\D/g, '');
    const p = (panVal || '').toUpperCase().trim();
    if (!/^\d{12}$/.test(a)) return toast.error('Enter a valid 12-digit Aadhaar number');
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) return toast.error('Enter a valid PAN (e.g., ABCDE1234F)');
    const { error } = await supabase.from('providers').update({ is_verified: true, verification_date: new Date().toISOString() }).eq('provider_id', provider.provider_id);
    if (error) return toast.error('Failed to verify identity');
    setProvider((x) => ({ ...x, is_verified: true, verification_date: new Date().toISOString() }));
    toast.success('Identity verified');
  };

  const markWorkDone = async (bookingId) => {
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId).eq('provider_id', provider.provider_id);
    if (error) return toast.error('Failed to mark as completed');
    toast.success('Marked as completed');
    loadLatestBookings();
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { }
    navigate('/');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="loading-shimmer w-96 h-64 rounded-lg" /></div>;
  if (!provider) return <div className="min-h-screen flex items-center justify-center"><Card className="p-8"><CardTitle className="text-red-600">Provider Not Found</CardTitle></Card></div>;

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-10">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Provider Dashboard</h1>
            <p className="text-xs text-slate-500">Operations overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog><DialogTrigger asChild><button type="button" onClick={loadLatestBookings} className="relative px-3 py-2 rounded-full bg-slate-100 text-slate-700"><Bell className="h-4 w-4" />{notifCount > 0 && <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1">{notifCount}</span>}</button></DialogTrigger><DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Recent Bookings</DialogTitle></DialogHeader><div className="mt-4 space-y-3">{notifItems.length === 0 ? <p className="text-sm text-slate-500">No recent bookings.</p> : notifItems.map((b) => { const lat = b?.user_location?.lat; const lng = b?.user_location?.lng; const mapsUrl = (typeof lat === 'number' && typeof lng === 'number') ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null; return <div key={b.id} className="p-3 border border-slate-200 rounded-xl"><div className="flex items-center gap-2"><Badge className={b.status === 'booked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{b.status}</Badge><span className="text-xs text-slate-500">{b.requested_at ? new Date(b.requested_at).toLocaleString() : ''}</span></div><p className="text-sm mt-1">Address: {formatAddress(b.address)}</p>{(b.scheduled_date || b.scheduled_time) && <p className="text-xs text-slate-500">When: {b.scheduled_date || ''} {b.scheduled_time || ''}</p>}<div className="mt-3 flex gap-2">{mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="px-3 py-2 text-sm border rounded-md">Open Maps</a> : <span className="text-xs text-slate-500">No location</span>}<button onClick={() => markWorkDone(b.id)} className="px-3 py-2 text-sm border rounded-md">Mark Done</button></div></div> })}</div></DialogContent></Dialog>
            <Dialog><DialogTrigger asChild><button className="relative px-3 py-2 rounded-full bg-slate-100 text-slate-700"><MessageSquare className="h-4 w-4" />{msgCount > 0 && <span className="absolute -top-1 -right-1 text-xs bg-blue-600 text-white rounded-full px-1">{msgCount}</span>}</button></DialogTrigger><DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Messages</DialogTitle></DialogHeader><div className="mt-4 space-y-3">{msgItems.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : msgItems.map((m) => <div key={m.id} className="p-3 border border-slate-200 rounded-xl"><p className="text-sm">From: {m.sender_id || 'user'}</p><p className="text-sm text-slate-700 mt-1">{m.content || ''}</p></div>)}</div></DialogContent></Dialog>
            <Dialog><DialogTrigger asChild><button type="button" onClick={loadCompletedJobs} className="px-3 py-2 rounded-full bg-slate-100 text-slate-700">Completed <span className="ml-1 text-xs bg-emerald-600 text-white rounded-full px-1">{completedCount}</span></button></DialogTrigger><DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Completed Jobs</DialogTitle></DialogHeader><div className="mt-4 space-y-3">{completedItems.length === 0 ? <p className="text-sm text-slate-500">No completed jobs yet.</p> : completedItems.map((b) => <div key={b.id} className="p-3 border border-slate-200 rounded-xl"><p className="text-sm">Address: {formatAddress(b.address)}</p></div>)}</div></DialogContent></Dialog>
            <Dialog><DialogTrigger asChild><button className="px-3 py-2 rounded-full bg-slate-100 text-slate-700"><Wallet className="h-4 w-4" /></button></DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Wallet Balance</DialogTitle></DialogHeader><div className="wallet-card p-6 mt-4"><p className="text-white/80 text-sm">Current Balance</p><p className="text-3xl font-bold text-white">Rs {Number.isFinite(walletSum) ? walletSum.toFixed(2) : (Number(provider?.wallet_balance || 0)).toFixed(2)}</p></div></DialogContent></Dialog>
            <button onClick={handleLogout} className="px-3 py-2 rounded-full bg-slate-100 text-slate-700">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-3xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] text-white p-8 mb-6">
          <p className="text-slate-300 text-sm">Welcome back</p>
          <h2 className="text-3xl font-bold mt-1">{profile?.full_name || 'Provider'}</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="rounded-2xl border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Availability</p><div className="mt-2 flex items-center justify-between"><Badge className={provider.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{provider.is_available ? 'Available' : 'Busy'}</Badge><Button onClick={toggleAvailability} disabled={isTogglingAvail}>{isTogglingAvail ? 'Updating...' : (provider.is_available ? 'Set Busy' : 'Set Available')}</Button></div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Verification</p><div className="mt-2">{provider.is_verified ? <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge> : <Badge variant="outline">Pending</Badge>}</div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Completed Jobs</p><p className="text-3xl font-bold text-slate-900 mt-2">{completedCount}</p></CardContent></Card>
        </div>

        {!provider.is_verified && <Card className="border-slate-200 rounded-2xl mb-6"><CardHeader><CardTitle>Identity Verification</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-3"><div><label className="text-sm text-slate-700">Aadhaar Number</label><Input value={aadhaarVal} onChange={(e) => setAadhaarVal(e.target.value)} placeholder="1234 5678 9012" /></div><div><label className="text-sm text-slate-700">PAN</label><Input value={panVal} onChange={(e) => setPanVal(e.target.value)} placeholder="ABCDE1234F" /></div></div><Button onClick={verifyIdentity} className="mt-4">Verify</Button></CardContent></Card>}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-slate-200 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-cyan-700" />Professional Status</CardTitle></CardHeader><CardContent className="space-y-3">{(provider.professions || []).map((profession) => { const st = provider.professional_status?.[profession]; const isP = st === 'Professional'; return <div key={profession} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"><p className="font-medium capitalize">{profession.replace('_', ' ')}</p><Badge className={isP ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{isP ? 'Professional' : 'Amateur/Freelancer'}</Badge></div> })}</CardContent></Card>
          <Card className="border-slate-200 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-cyan-700" />Document Status</CardTitle></CardHeader><CardContent className="space-y-3">{[{ k: 'Trade License', v: provider.has_trade_license }, { k: 'Health Permit', v: provider.has_health_permit }, { k: 'Certificates', v: provider.has_certificates }, { k: 'ID Verification', v: provider.is_verified }].map((d) => <div key={d.k} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"><span className="font-medium">{d.k}</span><Badge className={d.v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{d.v ? 'Uploaded' : 'Not Uploaded'}</Badge></div>)}</CardContent></Card>
        </div>

        <div className="mt-6"><ReviewsPanel providerId={provider.provider_id} /></div>
      </div>
    </div>
  );
};

export default ProviderDashboard;


