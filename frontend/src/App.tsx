import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';

type ViewState = 'login' | 'register' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);

  // التحقق من وجود توكن تسجيل دخول محفوظ مسبقاً عند تحميل الصفحة
  useEffect(() => {
    const savedToken = localStorage.getItem('solar_clean_token');
    const savedUser = localStorage.getItem('solar_clean_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: any) => {
    setToken(newToken);
    setUser(loggedUser);
    localStorage.setItem('solar_clean_token', newToken);
    localStorage.setItem('solar_clean_user', JSON.stringify(loggedUser));
    setView('dashboard');
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
          onNavigateToRegister={() => setView('register')} 
        />
      )}
      
      {view === 'register' && (
        <Register 
          onRegisterSuccess={handleLoginSuccess} 
          onNavigateToLogin={() => setView('login')} 
        />
      )}

      {view === 'dashboard' && token && user && (
        <Dashboard 
          token={token} 
          user={user} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
}
