import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Users,
  User,
  CreditCard,
  LogOut,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabaseClient';

const DashboardLayout = ({ children }) => {
  const { t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUserEmail(data.session.user.email);
      }
    };
    fetchUser();
  }, []);

  // Close mobile sidebar on navigate
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: t('dashboard') || 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: t('map') || 'Live Map', icon: MapPin, path: '/geolocation' },
    { name: t('providers') || 'Providers', icon: Users, path: '/providers' },
    { name: t('payments') || 'Bookings & Payments', icon: CreditCard, path: '/payments' },
    { name: t('profile') || 'Profile', icon: User, path: '/profile' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-xl border-r border-slate-200/70 shadow-[4px_0_24px_rgba(15,23,42,0.04)]">
      {/* Brand */}
      <div className="p-6 flex items-center justify-center border-b border-slate-200/60">
        <h1 className="display-font text-3xl font-black bg-gradient-to-br from-slate-900 to-cyan-600 bg-clip-text text-transparent tracking-tight">
          FIXORA
        </h1>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 relative">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 ease-out group relative overflow-hidden ${
                isActive
                  ? 'bg-cyan-600 shadow-[0_4px_16px_rgba(8,145,178,0.35)] text-white'
                  : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-500 opacity-100 z-0"></div>
              )}
              <item.icon
                className={`w-5 h-5 relative z-10 transition-transform duration-300 ${
                  isActive ? 'text-white' : 'group-hover:scale-110 group-hover:text-cyan-700'
                }`}
              />
              <span className={`font-medium relative z-10 transition-colors ${isActive ? 'text-white' : ''}`}>
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Area */}
      <div className="p-4 border-t border-slate-200/60">
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-100 to-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
            <User className="w-5 h-5 text-cyan-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {userEmail.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{userEmail || 'Loading...'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors duration-200 text-sm font-medium group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          {t('logout') || 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[280px] fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[280px] min-h-screen flex flex-col relative transition-all duration-300">
        {/* Top Header / Mobile Nav Toggle */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-lg border-b border-slate-200/60 shadow-sm px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 display-font capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8 flex-1 w-full max-w-7xl mx-auto animate-fade-in relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
