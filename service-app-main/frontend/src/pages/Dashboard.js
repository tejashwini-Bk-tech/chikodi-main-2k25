import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BarChart3, Users, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState('idle');
  const [selectedProviders, setSelectedProviders] = useState([]);

  useEffect(() => {
    // Load selected providers from localStorage (placeholder key)
    try {
      const raw = localStorage.getItem('selectedProviders');
      setSelectedProviders(raw ? JSON.parse(raw) : []);
    } catch {
      setSelectedProviders([]);
    }
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
              <CardTitle>{t('mySelectedProviders') || 'My Selected Providers'}</CardTitle>
              <CardDescription>{t('mySelectedProvidersDesc') || 'Your saved or booked providers'}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProviders.length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">{t('noProvidersSelected') || 'No providers selected yet. Browse providers to add to your list.'}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProviders.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border bg-white/60 dark:bg-slate-800/60">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
