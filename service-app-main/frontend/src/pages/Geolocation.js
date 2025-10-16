import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from '../hooks/use-toast';
import { supabase } from '../lib/supabaseClient';

const Geolocation = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [liveProviders, setLiveProviders] = useState([]);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [leafletReady, setLeafletReady] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const handleAllowLocation = () => {};

  // Load providers with location and subscribe for realtime updates
  useEffect(() => {
    let channel;
    const load = async () => {
      try {
        setLiveStatus('loading');
        const { data, error } = await supabase
          .from('providers')
          .select('provider_id, professions, location, last_location_at, is_verified')
          .not('location', 'is', null)
          .order('last_location_at', { ascending: false });
        if (error) throw error;
        setLiveProviders(data || []);
        setLiveStatus('success');
      } catch (e) {
        setLiveStatus('error');
      }
      try {
        channel = supabase
          .channel('realtime-providers-geo')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' }, (payload) => {
            const row = payload.new || payload.old;
            if (!row) return;
            setLiveProviders((prev) => {
              const idx = prev.findIndex((p) => p.provider_id === row.provider_id);
              if (payload.eventType === 'DELETE') {
                if (idx === -1) return prev;
                const copy = prev.slice();
                copy.splice(idx, 1);
                return copy;
              }
              const nextRow = {
                provider_id: row.provider_id,
                professions: row.professions || [],
                location: row.location || null,
                last_location_at: row.last_location_at || null,
                is_verified: !!row.is_verified,
              };
              if (idx === -1) return [nextRow, ...prev];
              const copy = prev.slice();
              copy[idx] = nextRow;
              return copy;
            });
          })
          .subscribe();
      } catch (_) {}
    };
    load();
    return () => { try { channel && supabase.removeChannel(channel); } catch (_) {} };
  }, []);

  // Dynamically load Leaflet CSS/JS once
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    // CSS
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // JS
    const jsId = 'leaflet-js';
    if (!document.getElementById(jsId)) {
      const script = document.createElement('script');
      script.id = jsId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      script.onerror = () => toast({ title: 'Map failed to load', variant: 'destructive' });
      document.body.appendChild(script);
    } else {
      setLeafletReady(true);
    }
  }, []);

  // Initialize map once Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapRef.current) return;
    const L = window?.L;
    if (!L) return; // wait until Leaflet is actually on window
    mapRef.current = L.map(mapEl.current).setView([20.5937, 78.9629], 5); // India default
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current);
  }, [leafletReady]);

  // Update markers when providers change
  useEffect(() => {
    const L = window?.L;
    if (!leafletReady || !mapRef.current || !L) return;
    const map = mapRef.current;
    const markers = markersRef.current;

    // Maintain a set of current IDs
    const ids = new Set();
    for (const p of liveProviders) {
      const id = p.provider_id;
      ids.add(id);
      const hasCoords = typeof p?.location?.lat === 'number' && typeof p?.location?.lng === 'number';
      if (!hasCoords) continue;
      const latlng = [p.location.lat, p.location.lng];
      const label = (p.professions?.[0] || 'Provider').replace('_',' ');
      const popup = `${label}<br/>ID: ${id}<br/>Updated: ${p.last_location_at ? new Date(p.last_location_at).toLocaleTimeString() : ''}`;
      if (markers[id]) {
        markers[id].setLatLng(latlng).setPopupContent(popup);
      } else {
        markers[id] = L.marker(latlng).addTo(map).bindPopup(popup);
      }
    }
    // Remove markers for providers no longer present
    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });
    // Fit bounds to markers
    const latlngs = Object.values(markers).map(m => m.getLatLng());
    if (latlngs.length) {
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds.pad(0.2));
    }
  }, [liveProviders, leafletReady]);

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen pt-16 pb-4 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Live Providers Map</h1>
        </div>
        <div ref={mapEl} className="w-full h-[70vh] rounded-lg overflow-hidden shadow border bg-white" />
        {liveStatus === 'loading' && (
          <div className="mt-3 text-sm text-slate-600">Loading providers…</div>
        )}
        {liveStatus === 'error' && (
          <div className="mt-3 text-sm text-red-600">Failed to load providers.</div>
        )}
      </div>
    </div>
  );
};

export default Geolocation;