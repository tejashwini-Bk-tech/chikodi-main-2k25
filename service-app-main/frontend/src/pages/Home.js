import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Star, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const Home = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [offerings, setOfferings] = useState([]);
  const [offeringsStatus, setOfferingsStatus] = useState('idle'); // idle|loading|error|success
  const [metrics, setMetrics] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState('idle');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!user);
  }, []);

  // Fetch offerings (what we offer)
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setOfferingsStatus('loading');
        const url = `${process.env.REACT_APP_BACKEND_URL}/api/offerings`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setOfferings(Array.isArray(data) ? data : (data.items || []));
        setOfferingsStatus('success');
      } catch (e) {
        // Fallback mock
        setOfferings([
          { id: 'cleaning', title: t('fallbackCleaningTitle'), desc: t('fallbackCleaningDesc') },
          { id: 'plumbing', title: t('fallbackPlumbingTitle'), desc: t('fallbackPlumbingDesc') },
          { id: 'electrical', title: t('fallbackElectricalTitle'), desc: t('fallbackElectricalDesc') },
          { id: 'painting', title: t('fallbackPaintingTitle'), desc: t('fallbackPaintingDesc') },
        ]);
        setOfferingsStatus('error');
      }
    };
    fetchOfferings();
  }, []);

  // Fetch simple metrics for chart
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
        // Fallback mock metrics
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

  // Get geolocation for map preview
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setCoords(null),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
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

  const features = [
    {
      icon: Search,
      title: t('findProvider'),
      description: 'Browse hundreds of verified service providers in your area',
      gradient: 'from-blue-500 to-cyan-400'
    },
    {
      icon: Star,
      title: t('readReviews'),
      description: 'Read authentic reviews from customers like you',
      gradient: 'from-purple-500 to-pink-400'
    },
    {
      icon: Users,
      title: t('howItWorks'),
      description: 'Simple 3-step process to book your service',
      gradient: 'from-orange-500 to-red-400'
    },
    {
      icon: Zap,
      title: t('requestService'),
      description: 'Get instant responses from available providers',
      gradient: 'from-green-500 to-emerald-400'
    }
  ];

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-700 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
            {t('homeHeroTitle')}
          </h1>
          <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto">
            {t('homeHeroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {isLoggedIn ? (
              <>
                <Button
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium px-8 py-6 text-lg transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {t('openDashboard')}
                </Button>
                <Button
                  onClick={() => navigate('/providers')}
                  size="lg"
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 font-medium px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
                >
                  {t('findProviders')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium px-8 py-6 text-lg transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  {t('getStarted')}
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  size="lg"
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 font-medium px-8 py-6 text-lg transition-all duration-300 hover:scale-105"
                >
                  {t('createAccount')}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Dynamic Offerings */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('whatWeOffer')}</h2>
            <div className="text-sm text-slate-500">{t('curatedForYou')}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {offeringsStatus === 'loading' && Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-28 animate-pulse" />
            ))}
            {offerings.map((o) => (
              <Card key={o.id} className="border-0 shadow hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{o.title}</CardTitle>
                  <CardDescription>{o.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Map Preview & Live Chart */}
      <section className="py-16 px-4 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Preview */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>{t('liveMapInteraction')}</CardTitle>
              <CardDescription>{t('liveMapPreviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border">
                {coords ? (
                  <iframe
                    title="map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon-0.02}%2C${coords.lat-0.02}%2C${coords.lon+0.02}%2C${coords.lat+0.02}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
                    className="w-full h-64"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-slate-500">{t('locationUnavailable')}</div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500">{t('livePreviewNote')}</div>
            </CardContent>
          </Card>

          {/* Live Chart */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>{t('liveActivity')}</CardTitle>
              <CardDescription>{t('usersVsProvidersDaily')}</CardDescription>
            </CardHeader>
            <CardContent>
              <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
                <path d={chartPath} fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
              <div className="text-xs text-slate-500 mt-2">
                {metricsStatus === 'loading' ? t('loadingMetrics') : metricsStatus === 'error' ? t('showingDemoData') : t('live')}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Chatbot & Payments */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <CardTitle>{t('aiChatbot')}</CardTitle>
              <CardDescription>{t('askFixora')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-300">{t('chatAvailabilityNote')}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow hover:shadow-md transition">
            <CardHeader>
              <CardTitle>{t('paymentsTitle')}</CardTitle>
              <CardDescription>{t('paymentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600 dark:text-slate-300">{t('checkoutNote')}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom"
                  style={{ animationDelay: `${index * 150}ms` }}
                  onClick={() => navigate('/providers')}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mx-auto mb-3 shadow-md`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-in fade-in slide-in-from-bottom duration-700">
              <h3 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                10,000+
              </h3>
              <p className="text-xl text-slate-600 dark:text-slate-300">{t('verifiedProvidersStat')}</p>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '150ms' }}>
              <h3 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                50,000+
              </h3>
              <p className="text-xl text-slate-600 dark:text-slate-300">{t('happyCustomersStat')}</p>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '300ms' }}>
              <h3 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                4.9/5
              </h3>
              <p className="text-xl text-slate-600 dark:text-slate-300">{t('averageRatingStat')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;