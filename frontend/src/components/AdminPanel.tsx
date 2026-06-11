import React, { useState, useEffect } from 'react';
import { 
  Users, Cpu, Plus, Trash2, LogOut, Key, UserPlus, 
  Shield, Check, X, AlertTriangle, RefreshCw, LayoutDashboard, Loader2
} from 'lucide-react';
import { API_URL } from '../config';

interface AdminPanelProps {
  token: string;
  user: { id: number; name: string; email: string; role?: string };
  onLogout: () => void;
  onNavigateToDashboard: () => void;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  _count: {
    devices: number;
  };
}

interface DeviceItem {
  id: string;
  name: string;
  status: string;
  state: string;
  water_level: number;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  token, 
  user, 
  onLogout, 
  onNavigateToDashboard 
}) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // فورم إضافة مستخدم
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('USER');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // فورم تسجيل جهاز
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceSuccess, setDeviceSuccess] = useState<string | null>(null);

  // لتأكيد الحذف
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [deletingDevice, setDeletingDevice] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDevices(data);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDevices();
  }, []);

  // إضافة مستخدم جديد
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setUserError('جميع الحقول مطلوبة.');
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إضافة المستخدم');
      }
      setUserSuccess(`تم إنشاء الحساب بنجاح للمستخدم: ${newUserName}`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('USER');
      fetchUsers();
    } catch (err: any) {
      setUserError(err.message || 'خطأ أثناء إنشاء الحساب.');
    } finally {
      setCreatingUser(false);
    }
  };

  // تسجيل جهاز وربطه بمستخدم
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);
    setDeviceSuccess(null);
    if (!newDeviceId || !newDeviceName || !targetUserId) {
      setDeviceError('جميع الحقول مطلوبة لربط الجهاز.');
      return;
    }
    setRegisteringDevice(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newDeviceId.trim(),
          name: newDeviceName,
          userId: Number(targetUserId)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الجهاز');
      }
      setDeviceSuccess(`تم ربط الجهاز (${newDeviceName}) بنجاح.`);
      setNewDeviceId('');
      setNewDeviceName('');
      setTargetUserId('');
      fetchDevices();
      fetchUsers(); // لتحديث عدد الأجهزة للمستخدمين
    } catch (err: any) {
      setDeviceError(err.message || 'حدث خطأ أثناء ربط الجهاز.');
    } finally {
      setRegisteringDevice(false);
    }
  };

  // إلغاء ربط جهاز
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    setDeletingDevice(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/${deviceToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إلغاء ربط الجهاز');
      }
      setShowDeleteConfirm(false);
      setDeviceToDelete(null);
      fetchDevices();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف الجهاز');
    } finally {
      setDeletingDevice(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* رأس الصفحة */}
      <header className="glass-panel p-6 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              لوحة الإدارة والتحكم
            </h1>
            <p className="text-slate-400 text-xs mt-1">المسؤول: {user.name} ({user.email})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-700/60 hover:border-cyan-500 hover:text-cyan-400 rounded-2xl text-sm font-semibold transition-all duration-300 transform active:scale-95 shadow-lg shadow-slate-950/20"
          >
            <LayoutDashboard size={18} />
            <span>لوحة الأجهزة العادية</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-sm font-semibold transition-all duration-300 transform active:scale-95"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* العمود الأيسر: إدارة المستخدمين */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* فورم إضافة مستخدم */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <UserPlus size={20} className="text-cyan-400" />
              <span>إضافة مستخدم جديد</span>
            </h2>

            {userError && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
                <AlertTriangle size={16} />
                <span>{userError}</span>
              </div>
            )}

            {userSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs">
                <Check size={16} />
                <span>{userSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  placeholder="user@domain.com"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">كلمة المرور</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">نوع الحساب</label>
                <select
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                >
                  <option value="USER">مستخدم عادي (USER)</option>
                  <option value="ADMIN">مدير نظام (ADMIN)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingUser}
                className="w-full py-3.5 bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/10 transition-all text-xs flex justify-center items-center gap-2"
              >
                {creatingUser ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الإنشاء...</span>
                  </>
                ) : (
                  <span>إنشاء الحساب</span>
                )}
              </button>
            </form>
          </div>

          {/* قائمة المستخدمين */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users size={20} className="text-cyan-400" />
                <span>المستخدمون في النظام</span>
              </h2>
              <button 
                onClick={fetchUsers}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-700/50"
              >
                <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-12 flex justify-center text-slate-400 text-sm">
                <Loader2 size={24} className="animate-spin text-cyan-400" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">لا يوجد مستخدمون مسجلون في النظام.</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{u.name}</span>
                        {u.role === 'ADMIN' && (
                          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md text-[9px] font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{u.email}</span>
                    </div>
                    <span className="text-[10px] px-3 py-1.5 bg-slate-950/80 rounded-xl text-slate-400 border border-slate-800">
                      {u._count.devices} أجهزة
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* العمود الأيمن: إدارة الأجهزة وربطها */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* فورم تسجيل جهاز */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Cpu size={20} className="text-blue-400" />
              <span>تسجيل وربط جهاز جديد</span>
            </h2>

            {deviceError && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs">
                <AlertTriangle size={16} />
                <span>{deviceError}</span>
              </div>
            )}

            {deviceSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-xs">
                <Check size={16} />
                <span>{deviceSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">معرف الجهاز (Device ID / Chip ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 00BC614E"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all uppercase"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">يجب إدخال المعرف الفريد الذي يظهر في شبكة تهيئة الجهاز.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">اسم الجهاز (Device Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ألواح السطح الشمالي"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">العميل المستلم (User)</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                >
                  <option value="">-- اختر المستخدم الذي تريد ربط الجهاز به --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={registeringDevice}
                className="w-full py-3.5 bg-gradient-to-l from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all text-xs flex justify-center items-center gap-2"
              >
                {registeringDevice ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الربط...</span>
                  </>
                ) : (
                  <span>ربط وتسجيل الجهاز</span>
                )}
              </button>
            </form>
          </div>

          {/* قائمة الأجهزة */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Cpu size={20} className="text-blue-400" />
                <span>الأجهزة المسجلة في النظام</span>
              </h2>
              <button 
                onClick={fetchDevices}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-700/50"
              >
                <RefreshCw size={14} className={loadingDevices ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingDevices ? (
              <div className="py-12 flex justify-center text-slate-400 text-sm">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : devices.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">لا توجد أجهزة مسجلة في النظام حالياً.</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {devices.map((d) => (
                  <div key={d.id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{d.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {d.id}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          المالك: {d.user ? `${d.user.name} (${d.user.email})` : <span className="text-yellow-500 font-semibold">غير مرتبط</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-[10px] text-slate-400">{d.status === 'online' ? 'متصل' : 'أوفلاين'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setDeviceToDelete(d.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-xl transition-all"
                        title="إلغاء ربط الجهاز وحذفه"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* مودال تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-bold">إلغاء ربط وحذف الجهاز</h3>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في إلغاء ربط الجهاز ذو المعرف <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">{deviceToDelete}</span>؟
              سيتم سحب صلاحيات العميل للتحكم بالجهاز وسيتم مسح كافة الجداول المجدولة المربوطة به.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeviceToDelete(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl text-xs transition-all"
              >
                تراجع
              </button>
              <button
                onClick={handleDeleteDevice}
                disabled={deletingDevice}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                {deletingDevice ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
