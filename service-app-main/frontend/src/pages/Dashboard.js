import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, MapPin, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabaseClient';

const SERVICE_CATEGORIES = [
  { name: 'Home Cleaning', key: 'cleaning' },
  { name: 'Plumbing', key: 'plumbing' },
  { name: 'Electrician', key: 'electrical' },
  { name: 'AC Repair', key: 'ac_repair' },
  { name: 'Painting', key: 'painting' },
  { name: 'Carpentry', key: 'carpentry' },
  { name: 'Salon At Home', key: 'salon' },
  { name: 'Appliance Repair', key: 'appliance_repair' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [liveProviders, setLiveProviders] = useState([]);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [providerMeta, setProviderMeta] = useState({});
  const [leafletReady, setLeafletReady] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const [markersRef] = [useRef({})];

  useEffect(() => {
    try {
      const raw = localStorage.getItem('userLocation');
      setUserLocation(raw ? JSON.parse(raw) : null);
    } catch {
      setUserLocation(null);
    }
  }, []);

  useEffect(() => {
    let channel;
    const loadRecentBookings = async () => {
      try {
        setBookingStatus('loading');
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) {
          setRecentBookings([]);
          setBookingStatus('success');
          return;
        }
        const { data, error } = await supabase
          .from('bookings')
          .select('id, provider_id, status, scheduled_date, scheduled_time, requested_at')
          .eq('user_id', userId)
          .order('requested_at', { ascending: false })
          .limit(8);
        if (error) throw error;
        const rows = data || [];
        setRecentBookings(rows);

        const providerIds = Array.from(new Set(rows.map((r) => r.provider_id).filter(Boolean)));
        if (providerIds.length > 0) {
          const { data: providersData } = await supabase
            .from('providers')
            .select('provider_id, user_id, professions, is_verified')
            .in('provider_id', providerIds);

          const userIds = Array.from(new Set((providersData || []).map((p) => p.user_id).filter(Boolean)));
          let profilesById = {};
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name, phone, email')
              .in('id', userIds);
            profilesById = (profilesData || []).reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {});
          }

          const meta = (providersData || []).reduce((acc, p) => {
            const profile = profilesById[p.user_id] || {};
            acc[p.provider_id] = {
              name: profile.full_name || 'Service Provider',
              phone: profile.phone || '',
              email: profile.email || '',
              profession: (p.professions && p.professions[0]) ? String(p.professions[0]).replace('_', ' ') : 'General Service',
              verified: !!p.is_verified,
            };
            return acc;
          }, {});
          setProviderMeta(meta);
        } else {
          setProviderMeta({});
        }
        setBookingStatus('success');
      } catch {
        setBookingStatus('error');
      }
    };
    loadRecentBookings();
    channel = supabase
      .channel('realtime-user-bookings-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        loadRecentBookings();
      })
      .subscribe();
    return () => { try { channel && supabase.removeChannel(channel); } catch {} };
  }, []);

  useEffect(() => {
    let channel;
    const load = async () => {
      try {
        setLiveStatus('loading');
        const { data, error } = await supabase
          .from('providers')
          .select('provider_id, professions, is_verified, location, last_location_at')
          .not('location', 'is', null)
          .order('last_location_at', { ascending: false });
        if (error) throw error;
        setLiveProviders(data || []);
        setLiveStatus('success');
      } catch {
        setLiveStatus('error');
      }
      channel = supabase
        .channel('realtime-providers-market')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' }, () => {
          load();
        })
        .subscribe();
    };
    load();
    return () => { try { channel && supabase.removeChannel(channel); } catch {} };
  }, []);

  const nearbyProviders = useMemo(() => {
    if (!userLocation || !Array.isArray(liveProviders)) return [];
    const R = 6371;
    const toRad = (v) => (v * Math.PI) / 180;
    const distKm = (a, b) => {
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
    };

    return liveProviders
      .map((p) => {
        const has = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
        const d = has ? distKm(userLocation, { lat: p.location.lat, lng: p.location.lng }) : Infinity;
        return { ...p, _distance_km: d };
      })
      .filter((p) => p._distance_km <= 15)
      .sort((a, b) => a._distance_km - b._distance_km)
      .slice(0, 8);
  }, [liveProviders, userLocation]);

  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      document.body.appendChild(script);
    } else {
      setLeafletReady(true);
    }
  }, []);

  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapRef.current || !window?.L) return;
    const L = window.L;
    mapRef.current = L.map(mapEl.current).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(mapRef.current);
  }, [leafletReady]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current || !window?.L) return;
    const L = window.L;
    const map = mapRef.current;
    const markers = markersRef.current;
    const ids = new Set();

    for (const p of nearbyProviders) {
      const id = p.provider_id;
      ids.add(id);
      if (typeof p?.location?.lat !== 'number' || typeof p?.location?.lng !== 'number') continue;
      const latlng = [p.location.lat, p.location.lng];
      const label = (p.professions?.[0] || 'Provider').replace('_', ' ');
      const popup = `${label}<br/>${p._distance_km?.toFixed(1)} km away`;
      if (markers[id]) {
        markers[id].setLatLng(latlng).setPopupContent(popup);
      } else {
        markers[id] = L.marker(latlng).addTo(map).bindPopup(popup);
      }
    }

    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });

    const latlngs = Object.values(markers).map((m) => m.getLatLng());
    if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
  }, [nearbyProviders, leafletReady]);

  const filteredServices = SERVICE_CATEGORIES.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-16">
      <section className="pt-20 px-4">
        <div className="max-w-6xl mx-auto rounded-3xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] text-white p-8 md:p-12 relative overflow-hidden min-h-[320px] flex items-center">
          <div className="absolute -right-10 -top-10 w-52 h-52 bg-cyan-200/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-cyan-100 text-sm font-semibold mb-3"><Sparkles className="w-4 h-4" /> Find trusted home services</p>
            <h1 className="display-type text-4xl md:text-5xl font-extrabold mb-3">What do you need today?</h1>
            <p className="text-slate-200 max-w-2xl">Choose a service, compare nearby professionals, and book quickly.</p>
            <div className="mt-6 max-w-xl relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search service (e.g. plumbing, cleaning)"
                className="w-full rounded-xl border border-white/30 bg-white text-slate-900 pl-10 pr-4 py-3 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="display-type text-2xl font-bold text-slate-900 mb-4">Popular Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredServices.map((service, i) => (
              <button
                key={service.key}
                onClick={() => navigate('/providers')}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="font-semibold text-slate-900">{service.name}</p>
                <p className="text-xs text-slate-500 mt-1">Browse providers</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 min-h-[430px]">
            <h3 className="display-type text-xl font-bold mb-4">Live Providers Near You</h3>
            <div className="relative">
              <div ref={mapEl} className="w-full h-[360px] rounded-xl overflow-hidden border" />
              {!userLocation && <div className="absolute inset-0 rounded-xl bg-white/90 flex items-center justify-center text-slate-500">Set location to view nearby providers</div>}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 min-h-[430px]">
            <h3 className="display-type text-xl font-bold mb-4">Recent Bookings</h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {bookingStatus === 'loading' && <p className="text-sm text-slate-500">Loading bookings...</p>}
              {bookingStatus === 'error' && <p className="text-sm text-red-500">Unable to load bookings right now.</p>}
              {bookingStatus === 'success' && recentBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-slate-900">Booking #{String(b.id).slice(0, 8)}</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">
                    {providerMeta[b.provider_id]?.name || 'Service Provider'}
                  </p>
                  <div className="mt-1 text-xs text-slate-500 space-y-1">
                    <p>Service: <span className="font-medium text-slate-700 capitalize">{providerMeta[b.provider_id]?.profession || 'General Service'}</span></p>
                    <p>Status: <span className="font-medium text-slate-700 capitalize">{b.status || 'requested'}</span></p>
                    <p>Date: <span className="font-medium text-slate-700">{b.scheduled_date || 'Not scheduled'}</span></p>
                    <p>Time: <span className="font-medium text-slate-700">{b.scheduled_time || 'Not set'}</span></p>
                    {providerMeta[b.provider_id]?.phone && (
                      <p>Phone: <span className="font-medium text-slate-700">{providerMeta[b.provider_id].phone}</span></p>
                    )}
                  </div>
                </div>
              ))}
              {bookingStatus === 'success' && recentBookings.length === 0 && <p className="text-sm text-slate-500">No recent bookings yet.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="max-w-6xl mx-auto rounded-2xl bg-white border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="display-type text-2xl font-bold text-slate-900">Need all providers?</h3>
            <p className="text-slate-600 mt-1">Explore full list and pick exactly what you want.</p>
          </div>
          <Button onClick={() => navigate('/providers')} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            Explore All Providers <Star className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
