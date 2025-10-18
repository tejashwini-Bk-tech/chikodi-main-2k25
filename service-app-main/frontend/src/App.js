import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import OTPVerification from './pages/OTPVerification';
import Geolocation from './pages/Geolocation';
import ProviderList from './pages/ProviderList';
import ProviderProfile from './pages/ProviderProfile';
import BookNow from './pages/BookNow';
import UserProfile from './pages/UserProfile';
import Payments from './pages/Payments';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';

const RequireAuth = ({ children }) => {
  const isLoggedIn = !!localStorage.getItem('user');
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const ConditionalNavbar = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-otp';
  return hideNavbar ? null : <Navbar />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="App">
          <BrowserRouter>
            <ConditionalNavbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
              <Route path="/geolocation" element={<Geolocation />} />
              <Route
                path="/providers"
                element={
                  <RequireAuth>
                    <ProviderList />
                  </RequireAuth>
                }
              />
              <Route path="/provider/:id" element={<ProviderProfile />} />
              <Route path="/book/:id" element={<BookNow />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/payments" element={<Payments />} />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
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