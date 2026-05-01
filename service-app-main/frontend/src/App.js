import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Toaster } from './components/ui/sonner';
import Chatbot from './components/Chatbot';
import MainHome from './pages/MainHome';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Geolocation from './pages/Geolocation';
import ProviderList from './pages/ProviderList';
import ProviderProfile from './pages/ProviderProfile';
import BookNow from './pages/BookNow';
import UserProfile from './pages/UserProfile';
import Payments from './pages/Payments';
import Dashboard from './pages/Dashboard'
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';

import DashboardLayout from './components/DashboardLayout';

const RequireAuth = ({ children }) => {
  const isLoggedIn = !!localStorage.getItem('user');
  // Temporarily bypass auth for testing the professional dashboard
  return true ? children : (isLoggedIn ? children : <Navigate to="/login" replace />);
};

const AuthLayout = ({ children }) => (
  <RequireAuth>
    <DashboardLayout>{children}</DashboardLayout>
  </RequireAuth>
);

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainHome />} />
              <Route path="/home" element={<Home />} />
              <Route path="/role-selection" element={<Navigate to="/signup" replace />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/geolocation" element={<AuthLayout><Geolocation /></AuthLayout>} />
              <Route path="/providers" element={<AuthLayout><ProviderList /></AuthLayout>} />
              <Route path="/provider/:id" element={<AuthLayout><ProviderProfile /></AuthLayout>} />
              <Route path="/book/:id" element={<AuthLayout><BookNow /></AuthLayout>} />
              <Route path="/profile" element={<AuthLayout><UserProfile /></AuthLayout>} />
              <Route path="/payments" element={<AuthLayout><Payments /></AuthLayout>} />
              <Route path="/dashboard" element={<AuthLayout><Dashboard /></AuthLayout>} />
            </Routes>
            <Chatbot />
          </BrowserRouter>
          <Toaster />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
