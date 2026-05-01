import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../lib/supabaseClient';

function Home() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data?.session?.user);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  const handleDashboardClick = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user || null;
      if (user) {
        const { data: prov, error: provErr } = await supabase
          .from('providers')
          .select('provider_id, user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!provErr && prov?.provider_id) {
          navigate(`/dashboard/${prov.provider_id}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
    }
  };

  const gridImages = [
    { src: '/images/carpenter.jpg', label: 'Carpenter', description: 'Professional woodworking' },
    { src: '/images/electrician.jpg', label: 'Electrician', description: 'Expert electrical services' },
    { src: '/images/home_cleaner.jpg', label: 'House Cleaner', description: 'Thorough cleaning solutions' },
    { src: '/images/makeup.jpg', label: 'Makeup Artist', description: 'Beauty and styling' },
    { src: '/images/mehndi.jpg', label: 'Mehndi Artist', description: 'Traditional henna art' },
    { src: '/images/plumber.jpg', label: 'Plumber', description: 'Reliable plumbing work' },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-2xl font-bold text-primary">FIXORA</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button
              className="text-gray-700 hover:text-primary transition"
              onClick={() => navigate('/')}
            >
              Home
            </button>
            <button
              className="text-gray-700 hover:text-primary transition"
              onClick={() => navigate('/privacy')}
            >
              About
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button
                size="sm"
                className="btn btn-primary"
                onClick={handleDashboardClick}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="btn btn-secondary hidden sm:inline-flex"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="btn btn-primary"
                  onClick={() => navigate('/register/step/1')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-gray-50">
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-slide-up">
              <h1 className="display-font text-responsive-2xl font-bold text-balance mb-6">
                Find Trusted Local
                <span className="text-primary"> Professionals</span>
              </h1>
              <p className="text-responsive-lg text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
                Connect with verified experts in your area. From home repairs to beauty services,
                FIXORA makes finding reliable help simple and secure.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Button
                  size="lg"
                  className="btn btn-primary btn-large"
                  onClick={() => navigate('/privacy')}
                >
                  Become a Provider
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="btn btn-secondary btn-large"
                  onClick={() => navigate('/register/step/1')}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      </section>

      {/* Services Grid */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="display-font text-responsive-xl font-bold mb-4">Popular Services</h2>
            <p className="text-responsive-base text-muted-foreground max-w-2xl mx-auto">
              Browse through our most in-demand professional services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridImages.map((service, index) => (
              <Card
                key={index}
                className="card group cursor-pointer animate-slide-up"
                style={{ animationDelay: `${0.1 * index}s` }}
                onClick={() => navigate('/register/step/1')}
              >
                <div className="relative overflow-hidden rounded-t-xl">
                  <img
                    src={service.src}
                    alt={service.label}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-semibold text-lg">{service.label}</h3>
                    <p className="text-sm opacity-90">{service.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="card shadow-soft-lg p-8 md:p-12">
              <div className="text-center">
                <h2 className="display-font text-responsive-xl font-bold mb-6">Why Choose FIXORA?</h2>
                <div className="grid md:grid-cols-3 gap-8 mt-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Verified Professionals</h3>
                    <p className="text-sm text-muted-foreground">All service providers are thoroughly vetted and background checked</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
                    <p className="text-sm text-muted-foreground">Safe and secure payment processing with refund protection</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Quick Booking</h3>
                    <p className="text-sm text-muted-foreground">Instant booking with real-time availability and scheduling</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="card p-8">
                <h3 className="display-font text-responsive-lg font-bold mb-4">Join as Provider</h3>
                <p className="text-muted-foreground mb-6">
                  Grow your business with FIXORA. Reach more customers and build your professional reputation.
                </p>
                <Button
                  className="btn btn-primary"
                  onClick={() => navigate('/privacy')}
                >
                  Get Started
                </Button>
              </Card>

              <Card className="card p-8">
                <h3 className="display-font text-responsive-lg font-bold mb-4">Find Services</h3>
                <p className="text-muted-foreground mb-6">
                  Discover trusted professionals for all your needs. Quality service guaranteed.
                </p>
                <Button
                  variant="outline"
                  className="btn btn-secondary"
                  onClick={() => navigate('/register/step/1')}
                >
                  Explore Services
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
