import React, { useEffect, useMemo, useState } from 'react';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('dashboardTitle') || 'Your Dashboard'}</h1>
          <p className="text-slate-600 dark:text-slate-300">{t('dashboardSubtitle') || 'Quick access to maps, analytics, providers, and profile.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <CardTitle>{t('dashboardMap') || 'Map'}</CardTitle>
              </div>
              <CardDescription>{t('dashboardMapDesc') || 'View and interact with live map'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/geolocation')}>{t('openMap') || 'Open Map'}</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <CardTitle>{t('dashboardAnalyses') || 'Analyses'}</CardTitle>
              </div>
              <CardDescription>{t('dashboardAnalysesDesc') || 'Real-time activity overview'}</CardDescription>
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
                <CardTitle>{t('dashboardFindProviders') || 'Find Providers'}</CardTitle>
              </div>
              <CardDescription>{t('dashboardFindProvidersDesc') || 'Browse and select providers'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white" onClick={() => navigate('/providers')}>{t('browse') || 'Browse'}</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-pink-600" />
                <CardTitle>{t('dashboardProfile') || 'Profile'}</CardTitle>
              </div>
              <CardDescription>{t('dashboardProfileDesc') || 'Manage your details'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/profile')}>{t('openProfile') || 'Open Profile'}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle>My Provider Profile</CardTitle>
              <CardDescription>Details from Supabase providers table</CardDescription>
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
