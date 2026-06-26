import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onNavigateToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial-gradient px-4 relative overflow-hidden">
      {/* خلفية جمالية ملونة متدرجة */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl relative z-10 border border-slate-700/50">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-cyan-500/10 text-cyan-400 rounded-2xl mb-4">
            <LogIn size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-wide">تسجيل الدخول</h2>
          <p className="text-slate-400 text-sm mt-2">مرحباً بك في نظام APW System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm animate-shake">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">اسم المستخدم</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-500">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                className="w-full pl-4 pr-12 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white text-sm transition-all placeholder:text-slate-600"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">كلمة المرور</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-4 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-white text-sm transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-4 flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-600/30 transition-all duration-300 transform active:scale-95"
          >
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* تم إخفاء رابط التسجيل العام لأن إنشاء الحسابات يتم من خلال لوحة الأدمن فقط */}
      </div>
    </div>
  );
};
