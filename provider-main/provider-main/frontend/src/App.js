import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import ProviderRegistration from './components/ProviderRegistration';
import ProviderDashboard from './components/ProviderDashboard';
import Account from './components/Account';
import AuthCallback from './components/AuthCallback';
import { Toaster } from './components/ui/sonner';
import Chatbot from './components/Chatbot';
import Home from './components/Home';
import Privacy from './components/Privacy';
import Login from './components/Login';
import AdminPage from './pages/AdminPage';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<ProviderRegistration />} />
          <Route path="/register/step/:step" element={<ProviderRegistration />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard/:providerId" element={<ProviderDashboard />} />
          <Route path="/account/:providerId" element={<Account />} />
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