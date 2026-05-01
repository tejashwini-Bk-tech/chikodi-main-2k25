import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock3, BadgeCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const Home = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('user'));
  }, []);

  const features = [
    {
      title: 'Verified Professionals',
      description: 'Every provider profile is verified to help you book with confidence.',
      icon: ShieldCheck,
    },
    {
      title: 'Fast Booking',
      description: 'Post your need, compare responses, and confirm the best provider quickly.',
      icon: Clock3,
    },
    {
      title: 'Quality Support',
      description: 'Transparent ratings and support at every step from request to completion.',
      icon: BadgeCheck,
    },
  ];

  return (
    <div className="min-h-screen pt-16 bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden px-4 py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#bae6fd_0%,#f8fafc_45%,#f1f5f9_100%)]" />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center rounded-full bg-cyan-100 text-cyan-800 px-3 py-1 text-xs font-semibold tracking-wide mb-5">
              Trusted Home Services Platform
            </p>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
              Find Skilled Service Experts Near You
            </h1>
            <p className="text-slate-600 text-lg md:text-xl mb-8 max-w-xl">
              From cleaning and plumbing to electrical and repairs, FIXORA helps you discover trusted providers and book in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => navigate(isLoggedIn ? '/providers' : '/signup')}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8"
              >
                {isLoggedIn ? 'Find Providers' : 'Get Started'} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 px-8"
              >
                {isLoggedIn ? 'Open Dashboard' : 'Sign In'}
              </Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-xl bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">What We Offer</CardTitle>
              <CardDescription>Popular services customers book every day.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {['Home Cleaning', 'Plumbing', 'Electrician', 'AC Repair', 'Painting', 'Carpentry'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Why Users Choose FIXORA</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Simple flow, reliable providers, and transparent service quality.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-slate-200 shadow-sm hover:shadow-md transition">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-cyan-700" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
