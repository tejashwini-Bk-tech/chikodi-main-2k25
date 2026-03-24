import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import ProviderRegistration from './components/ProviderRegistration';
import ProviderDashboard from './components/ProviderDashboard';
import Account from './components/Account';
import AuthCallback from './components/AuthCallback';
import { Toaster } from './components/ui/sonner';
import Chatbot from './components/Chatbot';
import MainHome from './components/MainHome';
import Home from './components/Home';
import Privacy from './components/Privacy';
import Login from './components/Login';
import AdminPage from './pages/AdminPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { supabase } from './lib/supabaseClient';

const RequireProviderAuth = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState('loading'); // loading | authed | anon

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user || null;
        if (!cancelled) setStatus(user?.id ? 'authed' : 'anon');
      } catch (_) {
        if (!cancelled) setStatus('anon');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') return null;
  if (status === 'anon') {
    // If trying to access registration (signup flow), redirect to login but allow signup
    // For other routes, redirect to login
    if (location.pathname.includes('/register')) {
      return <Login />;
    }
    const redirectTo = `${location.pathname}${location.search || ''}`;
    return <Login redirectTo={redirectTo} />;
  }
  return children;
};

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <BrowserRouter>
          <Routes>

            <Route path="/" element={<Home />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RequireProviderAuth><ProviderRegistration /></RequireProviderAuth>} />
            <Route path="/register/step/:step" element={<RequireProviderAuth><ProviderRegistration /></RequireProviderAuth>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard/:providerId" element={<RequireProviderAuth><ProviderDashboard /></RequireProviderAuth>} />
            <Route path="/account/:providerId" element={<RequireProviderAuth><Account /></RequireProviderAuth>} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          <Chatbot />
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </LanguageProvider>
  );
}

export default App;
