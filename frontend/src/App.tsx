import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';

type ViewState = 'login' | 'dashboard' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role?: string } | null>(null);

  // التحقق من وجود توكن تسجيل دخول محفوظ مسبقاً عند تحميل الصفحة
  useEffect(() => {
    const savedToken = localStorage.getItem('solar_clean_token');
    const savedUser = localStorage.getItem('solar_clean_user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      
      // توجيه الأدمن مباشرة للوحة التحكم الخاصة به
      if (parsedUser.role === 'ADMIN') {
        setView('admin');
      } else {
        setView('dashboard');
      }
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('solar_clean_token', newToken);
    localStorage.setItem('solar_clean_user', JSON.stringify(loggedUser));
    
    // التوجيه بناءً على نوع الحساب
    if (loggedUser.role === 'ADMIN') {
      setView('admin');
    } else {
      setView('dashboard');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('solar_clean_token');
    localStorage.removeItem('solar_clean_user');
    setView('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
      {view === 'login' && (
        <Login 
          onLogin={handleLoginSuccess} 
          onNavigateToRegister={() => {}} 
        />
      )}
      
      {view === 'dashboard' && token && user && (
        <Dashboard 
          token={token} 
          user={user} 
          onLogout={handleLogout} 
          onNavigateToAdmin={user.role === 'ADMIN' ? () => setView('admin') : undefined}
        />
      )}

      {view === 'admin' && token && user && (
        <AdminPanel 
          token={token} 
          user={user} 
          onLogout={handleLogout} 
          onNavigateToDashboard={() => setView('dashboard')}
        />
      )}
    </div>
  );
}
