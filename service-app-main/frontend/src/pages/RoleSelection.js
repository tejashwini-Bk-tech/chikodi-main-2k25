import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const RoleSelection = () => {
    const navigate = useNavigate();

    const handleSelect = (role) => {
        localStorage.setItem('role', role);
        navigate(`/signup?role=${role}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-6">
            <div className="w-full max-w-md space-y-6 bg-white/90 dark:bg-slate-800/90 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Choose your role</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">Select if you are signing up as a provider or as a customer.</p>
                <div className="grid grid-cols-1 gap-4">
                    <Button onClick={() => handleSelect('provider')} className="bg-emerald-600 text-white py-4">Provider</Button>
                    <Button onClick={() => handleSelect('user')} className="bg-blue-600 text-white py-4">User</Button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
