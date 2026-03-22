import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

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
        navigate('/role-selection');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-8">
            <div className="mx-auto max-w-5xl text-center space-y-8">
                <h1 className="text-5xl font-extrabold text-slate-800 dark:text-white">FIXORA</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                    One place for users and providers. Select your entry point below.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={handleSignIn} className="bg-blue-600 text-white py-5 text-lg">Sign In</Button>
                    <Button onClick={handleSignUp} className="bg-emerald-600 text-white py-5 text-lg">Sign Up</Button>
                </div>

                <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Current Session Role:</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">{role === 'guest' ? 'Not logged in yet' : role}</p>
                    {role !== 'guest' && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Redirecting to {role === 'provider' ? 'provider dashboard' : 'user dashboard'} is also possible from your login flow.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MainHome;
