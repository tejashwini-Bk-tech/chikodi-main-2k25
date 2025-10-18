import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Globe, Search, Menu, X, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
                <Search className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">FIXORA</span>
            </Link>
          </div>

          {/* Center Nav */}
          <div className={`hidden md:flex items-center justify-center gap-1 ${minimalGuestNav ? 'opacity-0 pointer-events-none select-none' : ''} whitespace-nowrap overflow-x-auto`}
          >
            <Link to="/">
              <Button variant="ghost" className={`px-3 ${isActive('/') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('home')}</Button>
            </Link>
            <Link to="/geolocation">
              <Button variant="ghost" className={`px-3 ${isActive('/geolocation') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('map') || 'Map'}</Button>
            </Link>
            <Link to="/payments">
              <Button variant="ghost" className={`px-3 ${isActive('/payments') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('payments') || 'Payments'}</Button>
            </Link>
            {isLoggedIn && (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className={`px-3 ${isActive('/dashboard') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('dashboard') || 'Dashboard'}</Button>
                </Link>
                <Link to="/providers">
                  <Button variant="ghost" className={`px-3 ${isActive('/providers') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('services') || 'Services'}</Button>
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
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {/* Language Dropdown (desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="w-4 h-4" /> {language.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`cursor-pointer ${
                      language === lang.code ? 'bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isLoggedIn ? (
              <>
                <Link to="/profile">
                  <Button variant="ghost" className={`px-4 ${isActive('/profile') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                    <User className="w-4 h-4 mr-2" />
                    {t('profile') || 'Profile'}
                  </Button>
                </Link>
                {!isDashboard && (
                  <Button variant="outline" onClick={handleLogout}>{t('logout') || 'Logout'}</Button>
                )}
              </>
            ) : (
              <>
                {!minimalGuestNav && (
                  <Link to="/login">
                    <Button variant="ghost" className={`px-4 ${isActive('/login') ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{t('login')}</Button>
                  </Link>
                )}
                <Link to="/signup">
                  <Button className="px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">{t('signup')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Theme/Language (mobile) + Menu button */}
          <div className="flex items-center space-x-2">
            <div className="md:hidden flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="w-4 h-4" /> {language.toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`cursor-pointer ${
                        language === lang.code ? 'bg-slate-100 dark:bg-slate-800' : ''
                      }`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 animate-in slide-in-from-top duration-200">
            {minimalGuestNav ? (
              <>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">{t('signup')}</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    {t('home')}
                  </Button>
                </Link>
                <Link to="/geolocation" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">{t('map') || 'Map'}</Button>
                </Link>
                <Link to="/payments" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">{t('payments') || 'Payments'}</Button>
                </Link>
                {isLoggedIn && (
                  <>
                    <Link to="/providers" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">{t('services') || 'Services'}</Button>
                    </Link>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">{t('dashboard') || 'Dashboard'}</Button>
                    </Link>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="w-4 h-4 mr-2" />
                        {t('profile') || 'Profile'}
                      </Button>
                    </Link>
                    {!isDashboard && (
                      <Button variant="outline" className="w-full justify-start" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>{t('logout') || 'Logout'}</Button>
                    )}
                  </>
                )}
                {!isLoggedIn && (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">{t('login')}</Button>
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