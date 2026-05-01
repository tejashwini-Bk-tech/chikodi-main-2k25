import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Search, Menu, X, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { toast } from 'sonner';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!user);
  }, [location]);

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' }
  ];

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname.startsWith('/dashboard');
  const minimalGuestNav = !isLoggedIn && isHome;

  const handleLogout = () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('isVerified');
      toast.success('Logged out', { description: 'You have been signed out.' });
    } catch {}
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-border transition-colors duration-300">
      <div className="container">
        <div className="grid grid-cols-3 items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                <Search className="w-6 h-6 text-white" />
              </div>
              <span className="display-font text-xl font-bold tracking-tight text-foreground">FIXORA</span>
            </Link>
          </div>

          {/* Center Nav - Hide overflow and prevent scroll */}
          <div className={`hidden md:flex items-center justify-center gap-1 ${minimalGuestNav ? 'opacity-0 pointer-events-none select-none' : ''} overflow-hidden`}
          >
            <Link to="/">
              <Button variant="ghost" className={`btn ${isActive('/') ? 'bg-secondary' : ''}`}>{t('home')}</Button>
            </Link>
            <Link to="/geolocation">
              <Button variant="ghost" className={`btn ${isActive('/geolocation') ? 'bg-secondary' : ''}`}>{t('map') || 'Map'}</Button>
            </Link>
            <Link to="/payments">
              <Button variant="ghost" className={`btn ${isActive('/payments') ? 'bg-secondary' : ''}`}>{t('payments') || 'Payments'}</Button>
            </Link>
            {isLoggedIn && (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className={`btn ${isActive('/dashboard') ? 'bg-secondary' : ''}`}>{t('dashboard') || 'Dashboard'}</Button>
                </Link>
                <Link to="/providers">
                  <Button variant="ghost" className={`btn ${isActive('/providers') ? 'bg-secondary' : ''}`}>{t('services') || 'Services'}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Right Controls: Theme/Language + Auth */}
          <div className="hidden md:flex items-center justify-end gap-2">
            {/* Theme Toggle (desktop) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="btn"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {isLoggedIn ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" className={`btn ${isActive('/profile') ? 'bg-secondary' : ''}`}>
                    <User className="w-4 h-4 mr-2" />
                    {t('profile') || 'Profile'}
                  </Button>
                </Link>
                {!isDashboard && (
                  <Button variant="outline" onClick={handleLogout} className="btn">{t('logout') || 'Logout'}</Button>
                )}
              </>
            ) : (
              <>
                {!minimalGuestNav && (
                  <Link to="/login">
                    <Button variant="ghost" className={`btn ${isActive('/login') ? 'bg-secondary' : ''}`}>{t('login')}</Button>
                  </Link>
                )}
                <Link to="/signup">
                  <Button className="btn btn-primary">{t('signup')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Theme/Language (mobile) + Menu button */}
          <div className="flex items-center gap-2">
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={toggleTheme}
                className="btn"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="btn md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu - Prevent scroll */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 animate-slide-up max-h-96 overflow-y-auto">
            {minimalGuestNav ? (
              <>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="btn btn-primary w-full">{t('signup')}</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="btn w-full justify-start">
                    {t('home')}
                  </Button>
                </Link>
                <Link to="/geolocation" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="btn w-full justify-start">{t('map') || 'Map'}</Button>
                </Link>
                <Link to="/payments" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="btn w-full justify-start">{t('payments') || 'Payments'}</Button>
                </Link>
                {isLoggedIn && (
                  <>
                    <Link to="/providers" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="btn w-full justify-start">{t('services') || 'Services'}</Button>
                    </Link>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="btn w-full justify-start">{t('dashboard') || 'Dashboard'}</Button>
                    </Link>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="btn w-full justify-start">
                        <User className="w-4 h-4 mr-2" />
                        {t('profile') || 'Profile'}
                      </Button>
                    </Link>
                    {!isDashboard && (
                      <Button variant="outline" className="btn w-full justify-start" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>{t('logout') || 'Logout'}</Button>
                    )}
                  </>
                )}
                {!isLoggedIn && (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="btn w-full justify-start">{t('login')}</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
