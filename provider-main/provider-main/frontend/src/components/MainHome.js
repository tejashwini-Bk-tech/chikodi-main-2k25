import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

const MainHome = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('guest');

    useEffect(() => {
        const storageRole = localStorage.getItem('role');
        if (storageRole) setRole(storageRole);
    }, []);

    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-950">
            <div className="mx-auto max-w-5xl rounded-3xl bg-white/80 dark:bg-slate-800/80 p-10 shadow-2xl border border-slate-200 dark:border-slate-700">
                <h1 className="text-5xl font-extrabold text-emerald-700 dark:text-emerald-300">FIXORA</h1>
                <p className="mt-4 text-lg text-slate-700 dark:text-slate-200">Unified gateway for providers and customers. Pick your app and continue.</p>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={() => navigate('/register/step/1')} className="py-5 bg-emerald-600 text-white">Provider Dashboard</Button>
                    <Button onClick={() => navigate('/dashboard')} className="py-5 bg-blue-600 text-white">Service Dashboard</Button>
                </div>

                <div className="mt-6 p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Current stored role: </span>
                    <span className="font-semibold text-slate-800 dark:text-white">{role}</span>
                </div>
            </div>
        </div>
    );
};

export default MainHome;
