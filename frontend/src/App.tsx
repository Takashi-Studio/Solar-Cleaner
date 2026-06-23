import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { HardwareTest } from './components/HardwareTest';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; name: string; username: string; role?: string } | null>(null);
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || '#/login');

  // الاستماع لتغيرات مسار الصفحة (Hash Routing)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // التحقق من التوكن المحفوظ عند تحميل الصفحة لأول مرة
  useEffect(() => {
    const savedToken = localStorage.getItem('solar_clean_token');
    const savedUser = localStorage.getItem('solar_clean_user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      
      // التوجيه التلقائي للمسار الافتراضي بناءً على الدور إذا لم يكن هناك مسار محدد
      const current = window.location.hash;
      if (!current || current === '#/login' || current === '#/') {
        if (parsedUser.role === 'ADMIN') {
          window.location.hash = '#/admin/overview';
        } else {
          window.location.hash = '#/dashboard';
        }
      }
    } else {
      window.location.hash = '#/login';
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('solar_clean_token', newToken);
    localStorage.setItem('solar_clean_user', JSON.stringify(loggedUser));
    
    // توجيه الأدمن أو المستخدم العادي لصفحته المخصصة بعد نجاح الدخول
    if (loggedUser.role === 'ADMIN') {
      window.location.hash = '#/admin/overview';
    } else {
      window.location.hash = '#/dashboard';
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('solar_clean_token');
    localStorage.removeItem('solar_clean_user');
    window.location.hash = '#/login';
  };

  const isLoggedIn = !!token && !!user;

  // إذا لم يكن مسجلاً، فاعرض صفحة الدخول دائماً
  if (!isLoggedIn) {
    if (currentHash !== '#/login') {
      window.location.hash = '#/login';
    }
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
        <Login 
          onLogin={handleLoginSuccess} 
          onNavigateToRegister={() => {}} 
        />
      </div>
    );
  }

  // إذا كان مسجلاً ويحاول فتح صفحة الدخول، فوجهه للداشبورد
  if (currentHash === '#/login') {
    if (user?.role === 'ADMIN') {
      window.location.hash = '#/admin/overview';
    } else {
      window.location.hash = '#/dashboard';
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
      {currentHash.startsWith('#/hardware-test') ? (
        <HardwareTest 
          token={token!} 
          user={user!} 
          onNavigateBack={() => { window.location.hash = user!.role === 'ADMIN' ? '#/admin/overview' : '#/dashboard'; }}
        />
      ) : currentHash.startsWith('#/admin') && user!.role === 'ADMIN' ? (
        <AdminPanel 
          token={token!} 
          user={user!} 
          onLogout={handleLogout} 
          onNavigateToDashboard={() => { window.location.hash = '#/dashboard'; }}
        />
      ) : (
        <Dashboard 
          token={token!} 
          user={user!} 
          onLogout={handleLogout} 
          onNavigateToAdmin={user!.role === 'ADMIN' ? () => { window.location.hash = '#/admin/overview'; } : undefined}
        />
      )}
    </div>
  );
}
