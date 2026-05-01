import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles, Wrench, Star, Quote } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const MainHome = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('guest');

    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        if (storedRole) setRole(storedRole);
    }, []);

    const handleSignIn = () => {
        navigate('/login');
    };

    const handleSignUp = () => {
        navigate('/signup');
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <section className="pt-20 md:pt-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-4">
                        <p className="display-type text-xl font-extrabold tracking-tight text-slate-900">FIXORA</p>
                    </div>
                    <div className="rounded-3xl bg-[linear-gradient(120deg,#0f172a,#1e293b)] text-white p-8 md:p-14 overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-400/20 blur-3xl" />
                        <div className="absolute left-10 bottom-0 w-64 h-64 bg-emerald-400/20 blur-3xl" />
                        <div className="relative grid lg:grid-cols-12 gap-10 items-end">
                            <div className="lg:col-span-7 animate-in fade-in slide-in-from-left duration-700">
                                <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-cyan-100 mb-5">
                                    <Sparkles className="w-3 h-3" /> Home services, redesigned
                                </p>
                                <h1 className="display-type text-4xl md:text-6xl font-extrabold leading-tight mb-5">
                                    Professional help for your home, without the stress.
                                </h1>
                                <p className="text-slate-200 text-lg md:text-xl mb-8 max-w-2xl leading-relaxed">
                                    We built FIXORA for busy families who need reliable service providers fast.
                                    No random listings, no guesswork, no follow-up headache.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button onClick={handleSignUp} size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl">
                                        Start Free <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                    <Button onClick={handleSignIn} size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 rounded-xl">
                                        Sign In
                                    </Button>
                                </div>
                            </div>
                            <div className="lg:col-span-5 animate-in fade-in slide-in-from-right duration-700">
                                <div className="rounded-2xl bg-white text-slate-900 p-5 shadow-2xl">
                                    <p className="text-sm font-semibold text-slate-500 mb-3">Most Booked Services</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {['Cleaning', 'Plumbing', 'Electrician', 'AC Repair', 'Painting', 'Carpentry'].map((service) => (
                                            <div key={service} className="rounded-lg bg-slate-100 px-3 py-2 font-medium">
                                                {service}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-14">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
                    {[{
                        title: 'Verified Professionals',
                        desc: 'Each provider is screened to keep service quality high.',
                        icon: ShieldCheck
                    }, {
                        title: 'Fast Response',
                        desc: 'Get quick availability and confirm jobs in minutes.',
                        icon: Clock3
                    }, {
                        title: 'Simple Experience',
                        desc: 'Clear process from booking request to service completion.',
                        icon: CheckCircle2
                    }].map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <Card key={item.title} className="border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition animate-in fade-in slide-in-from-bottom duration-700 bg-white" style={{ animationDelay: `${i * 120}ms` }}>
                                <CardContent className="p-6">
                                    <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
                                        <Icon className="w-6 h-6 text-cyan-700" />
                                    </div>
                                    <h4 className="display-type text-xl font-semibold mb-2">{item.title}</h4>
                                    <p className="text-slate-600">{item.desc}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <section className="px-4 pb-10">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 rounded-3xl bg-white border border-slate-200 p-8 md:p-10">
                        <p className="text-cyan-700 text-sm font-semibold mb-2">Why We Exist</p>
                        <h2 className="display-type text-3xl text-slate-900 font-bold mb-3">Because finding trusted help should feel easy, not risky.</h2>
                        <p className="text-slate-600 max-w-3xl leading-relaxed">
                            People told us they were tired of late arrivals, unverified workers, and inconsistent quality.
                            FIXORA solves that with verified profiles, transparent ratings, and a simple booking journey.
                        </p>
                    </div>
                    <div className="lg:col-span-4 rounded-3xl bg-slate-900 text-white p-8 flex flex-col justify-between">
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Customer Satisfaction</p>
                            <p className="display-type text-4xl font-extrabold">4.8/5</p>
                            <div className="flex gap-1 mt-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-cyan-400 text-cyan-400" />)}</div>
                        </div>
                        <Button onClick={() => navigate('/providers')} className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900">
                            Explore Providers <Wrench className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20">
                <div className="max-w-6xl mx-auto rounded-3xl bg-white border border-slate-200 p-8 md:p-10">
                    <div className="flex items-center gap-2 mb-4 text-cyan-700">
                        <Quote className="w-5 h-5" />
                        <p className="text-sm font-semibold">User Story</p>
                    </div>
                    <p className="display-type text-2xl md:text-3xl text-slate-900 leading-snug">
                        "I needed an electrician urgently. FIXORA showed verified options instantly, and the service was on time."
                    </p>
                    <p className="text-slate-500 mt-4">A real booking experience we designed this platform for.</p>
                </div>
            </section>
        </div>
    );
};

export default MainHome;
