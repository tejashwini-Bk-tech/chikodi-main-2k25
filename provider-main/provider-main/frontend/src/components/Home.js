import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../lib/supabaseClient';

function Home() {
  const navigate = useNavigate();
  const gridImages = [
    { src: '/images/carpenter.jpg', label: 'Carpenter' },
    { src: '/images/electrician.jpg', label: 'Electrician' },
    { src: '/images/home_cleaner.jpg', label: 'House Cleaner' },
    { src: '/images/makeup.jpg', label: 'Makeup Artist' },
    { src: '/images/mehndi.jpg', label: 'Mehndi Artist' },
    { src: '/images/plumber.jpg', label: 'Plumber' },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user || null;
        if (!user) return;
        const { data: p, error } = await supabase
          .from('providers')
          .select('provider_id, user_id, is_available')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled && !error && p?.provider_id && p.is_available) {
          navigate(`/dashboard/${p.provider_id}`, { replace: true });
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-950 dark:to-black py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 mb-12">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
          <div className="relative z-10 grid md:grid-cols-1 gap-8 items-center">
            <div>
              <h1 className="display-font text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">Welcome to FIXORA</h1>
              <p className="mt-4 text-slate-700 dark:text-slate-300 text-lg">Fixora helps you find trusted local experts — from plumbers to mehndi artists — all in one place.<br/>Quick search, verified profiles, secure payments, and even a voice assistant to guide you.<br/><span className="font-semibold">Smart. Simple. Reliable.</span></p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white" onClick={() => navigate('/privacy')}>Become a Provider</Button>
                <Button variant="outline" className="h-11 px-6 border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={() => navigate('/login')}>Provider Login</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          {gridImages.map((img, index) => (
            <div key={index} className="relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <img 
                src={img.src} 
                alt={img.label}
                className="w-full h-48 object-cover brightness-90 group-hover:brightness-75 transition-all duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-lg font-semibold drop-shadow-md">{img.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Why FIXORA?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">Fixora is like “Urban Company for smaller cities.” Find verified local professionals, check ratings, connect instantly, pay securely, and even use our voice assistant to get things done faster.</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Start Your Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">Join FIXORA and build a reliable client base. We verify, promote, and support your growth every step of the way.</p>
              <Button className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white" onClick={() => navigate('/privacy')}>Become a Provider</Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Empower Your Career</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300 mb-4">Upskill with FIXORA. Access premium bookings, collaborate in teams, and take on high-scale projects.</p>
              <Button variant="outline" className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white" onClick={() => navigate('/privacy')}>Learn More</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Home;
