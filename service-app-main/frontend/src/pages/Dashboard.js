import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, Users, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState('idle');
  const [provider, setProvider] = useState(null);
  const [providerStatus, setProviderStatus] = useState('idle');
  const [liveProviders, setLiveProviders] = useState([]);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [userLocation, setUserLocation] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setProviderStatus('loading');
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user || null;
        if (!user?.id) {
          setProvider(null);
          setProviderStatus('unauth');
          return;
        }
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        setProvider(data || null);
        setProviderStatus('success');
      } catch (e) {
        console.error('Failed to load provider:', e);
        setProviderStatus('error');
        setProvider(null);
      }
    };
    fetchProvider();
  }, []);

  // Load saved user location (set on the Geolocation page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('userLocation');
      setUserLocation(raw ? JSON.parse(raw) : null);
    } catch {
      setUserLocation(null);
    }
  }, []);

  // Live providers with location (listens for realtime updates)
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
      } catch (e) {
        console.error('Failed to load providers for live map', e);
        setLiveStatus('error');
      }
      // subscribe to realtime updates on providers table
      try {
        channel = supabase
          .channel('realtime-providers')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' }, (payload) => {
            const row = payload.new || payload.old;
            if (!row) return;
            setLiveProviders((prev) => {
              const idx = prev.findIndex((p) => p.provider_id === row.provider_id);
              // For insert/update, upsert; for delete, remove
              if (payload.eventType === 'DELETE') {
                if (idx === -1) return prev;
                const copy = prev.slice();
                copy.splice(idx, 1);
                return copy;
              }
              const nextRow = {
                provider_id: row.provider_id,
                professions: row.professions || [],
                is_verified: !!row.is_verified,
                location: row.location || null,
                last_location_at: row.last_location_at || null,
              };
              if (idx === -1) return [nextRow, ...prev];
              const copy = prev.slice();
              copy[idx] = nextRow;
              return copy;
            });
          })
          .subscribe();
      } catch (e) {
        // ignore subscription errors
      }
    };
    load();
    return () => {
      try { channel && supabase.removeChannel(channel); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsStatus('loading');
        const url = `${process.env.REACT_APP_BACKEND_URL}/api/metrics/overview`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setMetrics(data);
        setMetricsStatus('success');
      } catch (e) {
        setMetrics({
          labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
          users: [12, 19, 7, 14, 20, 25, 22],
          providers: [5, 9, 11, 8, 12, 15, 17]
        });
        setMetricsStatus('error');
      }
    };
    fetchMetrics();
  }, []);

  // Nearby providers within 10 km from saved userLocation
  const nearbyProviders = useMemo(() => {
    if (!userLocation || !Array.isArray(liveProviders)) return [];
    const R = 6371; // km
    const toRad = (v) => (v * Math.PI) / 180;
    const distKm = (a, b) => {
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
    };
    const withDist = liveProviders.map((p) => {
      const has = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
      const d = has ? distKm(userLocation, { lat: p.location.lat, lng: p.location.lng }) : Infinity;
      return { ...p, _distance_km: d };
    });
    const filtered = withDist.filter((p) => p._distance_km <= 10);
    filtered.sort((a, b) => a._distance_km - b._distance_km);
    return filtered;
  }, [liveProviders, userLocation]);

  // Leaflet: load CSS/JS dynamically once
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const jsId = 'leaflet-js';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      script.onerror = () => {};
      document.body.appendChild(script);
    } else {
      setLeafletReady(true);
    }
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapRef.current) return;
    const L = window?.L;
    if (!L) return;
    mapRef.current = L.map(mapEl.current).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);
  }, [leafletReady]);

  // Update markers from nearbyProviders
  useEffect(() => {
    const L = window?.L;
    if (!leafletReady || !mapRef.current || !L) return;
    const map = mapRef.current;
    const markers = markersRef.current;
    const ids = new Set();
    for (const p of nearbyProviders) {
      const id = p.provider_id;
      ids.add(id);
      const ok = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
      if (!ok) continue;
      const latlng = [p.location.lat, p.location.lng];
      const label = (p.professions?.[0] || 'Provider').replace('_',' ');
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
    const latlngs = Object.values(markers).map(m => m.getLatLng());
    if (latlngs.length) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [nearbyProviders, leafletReady]);

  const chartPath = useMemo(() => {
    if (!metrics) return '';
    const width = 280;
    const height = 80;
    const pad = 8;
    const values = metrics.users || [];
    const max = Math.max(1, ...values);
    const step = (width - pad * 2) / Math.max(1, values.length - 1);
    return values
      .map((v, i) => {
        const x = pad + i * step;
        const y = height - pad - (v / max) * (height - pad * 2);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [metrics]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 p-8 rounded-3xl bg-gradient-to-r from-blue-700 via-cyan-600 to-emerald-500 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">NEXORA</h1>
            <span className="text-xs uppercase tracking-widest text-white/80">Service Platform</span>
          </div>
          <p className="mt-2 text-base md:text-lg text-white/90 leading-relaxed tracking-wide">you name it, we'll provide it</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold tracking-tight leading-tight">{t('dashboardMap') || 'Map'}</CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">{t('dashboardMapDesc') || 'View and interact with live map'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/geolocation')}>{t('openMap') || 'Open Map'}</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg font-semibold tracking-tight leading-tight">{t('dashboardAnalyses') || 'Analyses'}</CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">{t('dashboardAnalysesDesc') || 'Real-time activity overview'}</CardDescription>
            </CardHeader>
            <CardContent>
              <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path d={chartPath} fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <div className="text-xs text-slate-500 mt-2">
                {metricsStatus === 'loading' ? (t('loadingMetrics') || 'Loading metrics…') : metricsStatus === 'error' ? (t('showingDemoData') || 'Showing demo data') : (t('live') || 'Live')}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg font-semibold tracking-tight leading-tight">{t('dashboardFindProviders') || 'Find Providers'}</CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">{t('dashboardFindProvidersDesc') || 'Browse and select providers'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white" onClick={() => navigate('/providers')}>{t('browse') || 'Browse'}</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-pink-600" />
                <CardTitle className="text-lg font-semibold tracking-tight leading-tight">{t('dashboardProfile') || 'Profile'}</CardTitle>
              </div>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">{t('dashboardProfileDesc') || 'Manage your details'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/profile')}>{t('openProfile') || 'Open Profile'}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map column */}
          <Card className="border-0 shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight leading-tight">Nearby Map</CardTitle>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">Live markers for providers within 10 km</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={mapEl} className="w-full h-[380px] rounded-lg overflow-hidden border bg-white" />
              {!userLocation && (
                <div className="mt-3 text-sm text-slate-600">Tip: set your location in <button className="underline" onClick={() => navigate('/geolocation')}>Geolocation</button> to refine nearby results.</div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar list */}
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight leading-tight">Nearby Providers (≤ 10 km)</CardTitle>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">Filtered by your saved location; updates in real time</CardDescription>
            </CardHeader>
            <CardContent>
              {!userLocation && (
                <div className="text-sm text-slate-600">No saved location. Set it on the <button className="underline" onClick={() => navigate('/geolocation')}>Geolocation</button> page.</div>
              )}
              {userLocation && liveStatus === 'loading' && (
                <div className="text-sm text-slate-600">Loading providers…</div>
              )}
              {userLocation && liveStatus === 'error' && (
                <div className="text-sm text-red-600">Failed to load providers.</div>
              )}
              {userLocation && nearbyProviders.length === 0 && liveStatus === 'success' && (
                <div className="text-sm text-slate-600">No providers within 10 km right now.</div>
              )}
              {userLocation && nearbyProviders.length > 0 && (
                <div className="divide-y">
                  {nearbyProviders.map((p) => (
                    <div key={p.provider_id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{(p.professions?.[0] || 'Provider').replace('_',' ')}</div>
                        <div className="text-xs text-slate-500">ID: {p.provider_id}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {`${p._distance_km.toFixed(1)} km away`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{p.last_location_at ? new Date(p.last_location_at).toLocaleTimeString() : ''}</div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/provider/${p.provider_id}`)}>View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight leading-tight">My Provider Profile</CardTitle>
              <CardDescription className="text-sm text-slate-600 leading-relaxed">Details from Supabase providers table</CardDescription>
            </CardHeader>
            <CardContent>
              {providerStatus === 'loading' && (
                <div className="text-sm text-slate-600">Loading provider…</div>
              )}
              {providerStatus === 'unauth' && (
                <div className="text-sm text-red-600">Please login to view your provider profile.</div>
              )}
              {providerStatus === 'error' && (
                <div className="text-sm text-red-600">Failed to load provider details.</div>
              )}
              {provider && (
                <div className="space-y-2">
                  <div className="text-sm">Provider ID: <span className="font-mono">{provider.provider_id}</span></div>
                  <div className="text-sm">Professions: {(provider.professions || []).join(', ')}</div>
                  <div className="text-sm">Verified: {provider.is_verified ? 'Yes' : 'No'}</div>
                  <div className="text-sm">Location: {typeof provider?.location?.lat === 'number' && typeof provider?.location?.lng === 'number' ? `${provider.location.lat.toFixed(5)}, ${provider.location.lng.toFixed(5)}` : 'N/A'}</div>
                  <div className="text-sm">Last Location Update: {provider.last_location_at ? new Date(provider.last_location_at).toLocaleString() : 'N/A'}</div>
                  <div className="pt-2">
                    <Button variant="outline" onClick={async () => {
                      if (!('geolocation' in navigator)) { toast.error('Geolocation not supported'); return; }
                      navigator.geolocation.getCurrentPosition(async (pos) => {
                        try {
                          const { latitude, longitude, accuracy } = pos.coords || {};
                          const patch = { location: { lat: latitude, lng: longitude, accuracy }, last_location_at: new Date().toISOString() };
                          const { error } = await supabase.from('providers').update(patch).eq('provider_id', provider.provider_id);
                          if (error) throw error;
                          toast.success('Location updated');
                          setProvider(prev => prev ? { ...prev, ...patch } : prev);
                        } catch (e) {
                          console.error('Failed to update location', e);
                          toast.error('Failed to update location');
                        }
                      }, (err) => toast.error(err?.message || 'Failed to get location'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                    }}>
                      Update My Location
                    </Button>
                  </div>
                </div>
              )}
              {!provider && providerStatus === 'success' && (
                <div className="text-sm text-slate-600">No provider profile found for your account.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
