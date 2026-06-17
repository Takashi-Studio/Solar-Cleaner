import React, { useState, useEffect } from 'react';
import { 
  Users, Cpu, Plus, Trash2, LogOut, Key, UserPlus, 
  Shield, Check, X, AlertTriangle, RefreshCw, LayoutDashboard, Loader2,
  Eye, EyeOff, LayoutGrid, Activity, ChevronDown, UserCheck, Smartphone, Menu, Pencil, UserX
} from 'lucide-react';
import { API_URL } from '../config';

interface AdminPanelProps {
  token: string;
  user: { id: number; name: string; username: string; role?: string };
  onLogout: () => void;
  onNavigateToDashboard: () => void;
}

interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  is_active: boolean;
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
  last_seen: string;
  user?: {
    id: number;
    name: string;
    username: string;
  } | null;
}

type TabType = 'overview' | 'users' | 'devices';

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  token, 
  user, 
  onLogout, 
  onNavigateToDashboard 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // حالات فتح المودالات
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);

  // فورم إضافة مستخدم
  const [newUserName, setNewUserName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState('USER');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // فورم تعديل مستخدم
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [editUserRole, setEditUserRole] = useState('USER');
  const [updatingUser, setUpdatingUser] = useState(false);

  // حذف مستخدم
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // تفاصيل مستخدم
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserItem | null>(null);

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

  // لفحص الاتصال من لوحة الإدارة
  const [checkingConnId, setCheckingConnId] = useState<string | null>(null);

  // ربط الأجهزة المباشر من المودال
  const [showAddDeviceInline, setShowAddDeviceInline] = useState(false);
  const [inlineDeviceId, setInlineDeviceId] = useState('');
  const [inlineDeviceName, setInlineDeviceName] = useState('');
  const [inlineRegisterError, setInlineRegisterError] = useState<string | null>(null);
  const [inlineRegistering, setInlineRegistering] = useState(false);

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

  // قفل التمرير للخلفية عند فتح أي مودال
  useEffect(() => {
    const isAnyModalOpen = showUserDetailsModal || showAddUserModal || showAddDeviceModal || showEditUserModal || showDeleteUserConfirm || showDeleteConfirm;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUserDetailsModal, showAddUserModal, showAddDeviceModal, showEditUserModal, showDeleteUserConfirm, showDeleteConfirm]);

  // إضافة مستخدم جديد
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);
    if (!newUserName || !newUsername || !newUserPassword) {
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
          username: newUsername,
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
      setNewUsername('');
      setNewUserPassword('');
      setShowUserPassword(false);
      setNewUserRole('USER');
      fetchUsers();
      
      // إغلاق المودال بعد فترة وجيزة لإعطاء فرصة لقراءة رسالة النجاح
      setTimeout(() => {
        setShowAddUserModal(false);
        setUserSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUserError(err.message || 'خطأ أثناء إنشاء الحساب.');
    } finally {
      setCreatingUser(false);
    }
  };

  // تعديل مستخدم موجود
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserError(null);
    setUserSuccess(null);
    if (!editUserName || !editUsername) {
      setUserError('الاسم واسم المستخدم مطلوبان.');
      return;
    }
    setUpdatingUser(true);
    try {
      const bodyData: any = {
        name: editUserName,
        username: editUsername,
        role: editUserRole
      };
      if (editUserPassword) {
        bodyData.password = editUserPassword;
      }

      const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تعديل بيانات المستخدم');
      }
      setUserSuccess(`تم تعديل بيانات المستخدم بنجاح.`);
      setEditUserName('');
      setEditUsername('');
      setEditUserPassword('');
      setShowEditUserPassword(false);
      setEditingUser(null);
      fetchUsers();
      fetchDevices(); // لتحديث أسماء الملاك في قائمة الأجهزة

      setTimeout(() => {
        setShowEditUserModal(false);
        setUserSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUserError(err.message || 'خطأ أثناء تعديل الحساب.');
    } finally {
      setUpdatingUser(false);
    }
  };

  // حذف مستخدم
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setUserError(null);
    setUserSuccess(null);
    setDeletingUser(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف المستخدم');
      }
      setUserSuccess(`تم حذف المستخدم بنجاح.`);
      setUserToDelete(null);
      fetchUsers();
      fetchDevices(); // لتحديث حالة الأجهزة المرتبطة به

      setTimeout(() => {
        setShowDeleteUserConfirm(false);
        setUserSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUserError(err.message || 'خطأ أثناء حذف الحساب.');
    } finally {
      setDeletingUser(false);
    }
  };

  // تفعيل/تعطيل حساب مستخدم
  const handleToggleUserActive = async (targetUser: UserItem) => {
    setUserError(null);
    setUserSuccess(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !targetUser.is_active })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تغيير حالة تفعيل الحساب');
      }
      
      const updatedUser = data.user;
      setUserSuccess(updatedUser.is_active ? 'تم تفعيل حساب المشترك بنجاح.' : 'تم تعطيل حساب المشترك بنجاح.');
      
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_active: updatedUser.is_active } : u));
      setSelectedUserForDetails(prev => prev && prev.id === targetUser.id ? { ...prev, is_active: updatedUser.is_active } : prev);
      
      setTimeout(() => {
        setUserSuccess(null);
      }, 2000);
    } catch (err: any) {
      setUserError(err.message || 'خطأ أثناء تعديل الحساب.');
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
      fetchUsers();
      
      setTimeout(() => {
        setShowAddDeviceModal(false);
        setDeviceSuccess(null);
      }, 1500);
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

  // ربط جهاز جديد مباشرة من تفاصيل العميل
  const handleRegisterDeviceInline = async (e: React.FormEvent, userId: number) => {
    e.preventDefault();
    setInlineRegisterError(null);
    if (!inlineDeviceId || !inlineDeviceName) {
      setInlineRegisterError('جميع الحقول مطلوبة لربط الجهاز.');
      return;
    }
    setInlineRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: inlineDeviceId.trim(),
          name: inlineDeviceName,
          userId: userId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الجهاز');
      }
      setInlineDeviceId('');
      setInlineDeviceName('');
      setShowAddDeviceInline(false);
      fetchDevices();
      fetchUsers();
    } catch (err: any) {
      setInlineRegisterError(err.message || 'حدث خطأ أثناء ربط الجهاز.');
    } finally {
      setInlineRegistering(false);
    }
  };

  // إلغاء ربط وحذف جهاز مباشرة من المودال
  const handleDeleteDeviceInline = async (devId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء ربط هذا الجهاز نهائياً وحذفه من النظام؟')) return;
    try {
      const res = await fetch(`${API_URL}/api/devices/${devId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إلغاء ربط الجهاز');
      }
      fetchDevices();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف الجهاز');
    }
  };

  // فحص الاتصال الفوري للجهاز
  const handleCheckConnection = async (devId: string) => {
    setCheckingConnId(devId);
    try {
      await fetch(`${API_URL}/api/devices/${encodeURIComponent(devId)}/check-connection`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDevices();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingConnId(null);
    }
  };

  // حساب الإحصائيات الحية
  const totalUsers = users.length;
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = totalDevices - onlineDevices;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans antialiased">
      {/* 1. الشريط الجانبي الثابت للحاسوب (Desktop Sidebar) */}
      <aside className="hidden md:flex md:flex-col w-72 shrink-0 bg-slate-900/40 backdrop-blur-xl border-l border-slate-800/80 p-6 h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl text-white shadow-md shadow-cyan-500/10">
            <Shield size={22} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-wide bg-gradient-to-l from-cyan-400 to-white bg-clip-text text-transparent">ABW System</h2>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">لوحة التحكم للإدارة</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{user.username}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[9px] text-slate-500 font-bold uppercase">الصلاحية:</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              مدير النظام
            </span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <LayoutGrid size={16} />
            <span>الرئيسية والإحصائيات</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'users'
                ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Users size={16} />
            <span>إدارة المستخدمين</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'devices'
                ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Cpu size={16} />
            <span>إدارة الأجهزة المربوطة</span>
          </button>

          <div className="my-2 border-t border-slate-800/40" />

          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-slate-400 hover:bg-slate-900/50 hover:text-white"
          >
            <LayoutDashboard size={16} />
            <span>اللوحة العادية (أجهزتي)</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-800/60 mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-xs font-bold"
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* 2. شريط الهاتف العلوي والدرج الجانبي المنزلق (Mobile Navigation) */}
      <div className="flex md:hidden bg-slate-900/40 backdrop-blur-md border-b border-slate-800 px-4 py-3 items-center justify-between z-30 sticky top-0 w-full shrink-0">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2.5 bg-slate-900/80 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl transition-all active:scale-95"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg text-white">
            <Shield size={16} />
          </div>
          <span className="text-sm font-black tracking-wide bg-gradient-to-l from-cyan-400 to-white bg-clip-text text-transparent">
            ABW System
          </span>
        </div>

        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div 
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <aside 
          className={`absolute inset-y-0 right-0 w-72 bg-slate-950 border-l border-slate-800/80 p-6 flex flex-col transition-transform duration-300 ${
            isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg text-white">
                <Shield size={16} />
              </div>
              <span className="text-xs font-black bg-gradient-to-l from-cyan-400 to-white bg-clip-text text-transparent">
                ABW System
              </span>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-800 active:scale-95 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/60 mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-base">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{user.username}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase">الصلاحية:</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                مدير النظام
              </span>
            </div>
          </div>

          <nav className="flex-1 flex flex-col gap-1.5">
            <button
              onClick={() => {
                setActiveTab('overview');
                setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 font-black shadow-md'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <LayoutGrid size={16} />
              <span>الرئيسية والإحصائيات</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 font-black shadow-md'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Users size={16} />
              <span>إدارة المستخدمين</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('devices');
                setIsMobileSidebarOpen(false);
              }}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'devices'
                  ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 font-black shadow-md'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
              }`}
            >
              <Cpu size={16} />
              <span>إدارة الأجهزة المربوطة</span>
            </button>

            <div className="my-2 border-t border-slate-900" />

            <button
              onClick={() => {
                onNavigateToDashboard();
                setIsMobileSidebarOpen(false);
              }}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 text-slate-400 hover:bg-slate-900/50 hover:text-white"
            >
              <LayoutDashboard size={16} />
              <span>اللوحة العادية (أجهزتي)</span>
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-900 mt-auto">
            <button
              onClick={() => {
                onLogout();
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all text-xs font-bold"
            >
              <LogOut size={14} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3. حاوية المحتوى الرئيسي مستقلة التمرير (Main Content) */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* المحتوى الرئيسي */}
        <main className="flex-1 p-4 md:p-8 space-y-6">
        
        {/* رأس صفحة التبويب */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-l from-white to-slate-400 bg-clip-text text-transparent">
              {activeTab === 'overview' && 'لوحة المعلومات الحية والإحصائيات'}
              {activeTab === 'users' && 'لوحة التحكم وإدارة شؤون العملاء'}
              {activeTab === 'devices' && 'لوحة مراقبة الأجهزة والتسجيل'}
            </h1>
            <p className="text-slate-500 text-xs mt-1">تحديث حي ومباشر للنظام</p>
          </div>
        </header>

        {/* التبويب 1: الرئيسية والإحصائيات */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* بطاقات الإحصائيات (Stat Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-3xl border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">إجمالي المشتركين</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-black text-white">{totalUsers}</span>
                  <Users size={20} className="text-cyan-500" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-3xl border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full blur-xl" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">إجمالي الأجهزة</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-black text-white">{totalDevices}</span>
                  <Cpu size={20} className="text-blue-500" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-3xl border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">الأجهزة المتصلة</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-black text-emerald-400">{onlineDevices}</span>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-3xl border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-slate-500/5 rounded-full blur-xl" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">الأجهزة غير النشطة</span>
                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-black text-slate-400">{offlineDevices}</span>
                  <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                </div>
              </div>
            </div>

            {/* المراقبة الحية والعمليات السريعة */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-900">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Activity size={18} className="text-cyan-500" />
                  <span>المراقبة الحية والعمليات السريعة</span>
                </h3>
                <button
                  onClick={() => { fetchUsers(); fetchDevices(); }}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-800 transition-all"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={14} className={loadingDevices ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingDevices ? (
                <div className="py-20 flex justify-center text-slate-400 text-sm">
                  <Loader2 size={32} className="animate-spin text-cyan-500" />
                </div>
              ) : devices.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-12">لا توجد أجهزة مسجلة في النظام لمراقبتها.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 font-bold">
                        <th className="pb-3 pr-2">اسم الجهاز / المعرف</th>
                        <th className="pb-3">المالك</th>
                        <th className="pb-3 text-center">مستوى المياه</th>
                        <th className="pb-3 text-center">حالة التشغيل</th>
                        <th className="pb-3 text-center">الشبكة</th>
                        <th className="pb-3 pl-2 text-left">عمليات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50">
                      {devices.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-4 pr-2">
                            <span className="font-bold text-white block">{d.name}</span>
                            <code className="text-[10px] text-slate-600 font-mono block mt-0.5">{d.id}</code>
                          </td>
                          <td className="py-4 text-slate-300">
                            {d.user ? (
                              <>
                                <span className="font-bold text-slate-200">{d.user.name}</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">{d.user.username}</span>
                              </>
                            ) : (
                              <span className="text-yellow-600 font-bold">غير مرتبط</span>
                            )}
                          </td>
                          <td className="py-4 text-center">
                            <span className="font-black text-cyan-400 text-sm">{d.water_level}%</span>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              d.state === 'IDLE' ? 'bg-slate-900 text-slate-400 border border-slate-800' :
                              d.state === 'CLEANING' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {d.state === 'IDLE' ? 'في الانتظار' : d.state === 'CLEANING' ? 'جاري التنظيف' : d.state}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                              <span className="text-slate-400">{d.status === 'online' ? 'متصل' : 'أوفلاين'}</span>
                            </div>
                          </td>
                          <td className="py-4 pl-2 text-left">
                            <button
                              onClick={() => handleCheckConnection(d.id)}
                              disabled={checkingConnId === d.id}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-cyan-400 border border-slate-800 rounded-xl transition-all font-semibold inline-flex items-center gap-1 active:scale-95"
                            >
                              {checkingConnId === d.id ? (
                                <Loader2 size={12} className="animate-spin text-cyan-500" />
                              ) : (
                                <RefreshCw size={12} />
                              )}
                              <span>فحص</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* التبويب 2: إدارة المستخدمين */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">قائمة المشتركين الحاليين</h2>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-2xl text-xs transition-all duration-300 transform active:scale-95 shadow-lg shadow-cyan-500/15"
              >
                <UserPlus size={16} />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-900">
              {loadingUsers ? (
                <div className="py-20 flex justify-center text-slate-400 text-sm">
                  <Loader2 size={32} className="animate-spin text-cyan-500" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-12">لا يوجد مستخدمون مسجلون في النظام.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((u) => (
                    <div 
                      key={u.id} 
                      onClick={() => {
                        setSelectedUserForDetails(u);
                        setShowUserDetailsModal(true);
                      }}
                      className="p-4 bg-slate-900/40 hover:bg-slate-900/60 rounded-2xl border border-slate-900 hover:border-slate-800/80 flex flex-col justify-between h-40 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${u.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>{u.name}</span>
                            {u.role === 'ADMIN' && (
                              <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md text-[9px] font-bold">
                                ADMIN
                              </span>
                            )}
                            {!u.is_active && (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[9px] font-bold">
                                معطل
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{u.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {u.id === user.id && (
                            <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-slate-500" title="أنت (مدير النظام)">
                              <UserCheck size={16} className="text-cyan-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-900/60 flex justify-between items-center text-[10px] text-slate-400">
                        <span>مسجل منذ: {new Date(u.created_at).toLocaleDateString('ar-EG')}</span>
                        <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-semibold text-slate-300">
                          {u._count.devices} أجهزة
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* التبويب 3: إدارة الأجهزة */}
        {activeTab === 'devices' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">قائمة الأجهزة وتفاصيل الملكية</h2>
              <button
                onClick={() => setShowAddDeviceModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-l from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs transition-all duration-300 transform active:scale-95 shadow-lg shadow-blue-500/15"
              >
                <Plus size={16} />
                <span>تسجيل وربط جهاز جديد</span>
              </button>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-900">
              {loadingDevices ? (
                <div className="py-20 flex justify-center text-slate-400 text-sm">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
              ) : devices.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-12">لا توجد أجهزة مسجلة في النظام حالياً.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map((d) => (
                    <div key={d.id} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900 flex flex-col justify-between h-44">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-white block">{d.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">معرف: {d.id}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="text-[9px] text-slate-500">{d.status === 'online' ? 'متصل' : 'أوفلاين'}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-900/60 mt-3 space-y-1 text-[10px] text-slate-400">
                        <div>المالك: {d.user ? <span className="text-slate-200 font-bold">{d.user.name} ({d.user.username})</span> : <span className="text-yellow-600 font-bold">غير مرتبط</span>}</div>
                        <div>الحالة المباشرة للمعدات: <span className="text-cyan-400 font-semibold">{d.state === 'IDLE' ? 'جاهز' : 'ينظف حالياً'}</span></div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3">
                        <button
                          onClick={() => {
                            setDeviceToDelete(d.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-xl text-[10px] font-semibold transition-all active:scale-95"
                        >
                          <Trash2 size={12} />
                          <span>إلغاء الربط</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* 1. مودال إضافة مستخدم جديد (Add User Modal) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => { setShowAddUserModal(false); setUserError(null); setUserSuccess(null); }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <UserPlus size={22} className="text-cyan-400" />
              <span>إضافة مستخدم جديد</span>
            </h3>

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
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسم المستخدم (مثال: ahmed)"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">نوع الحساب</label>
                <div className="relative">
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all appearance-none cursor-pointer"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="USER" className="bg-slate-950">مستخدم عادي (USER)</option>
                    <option value="ADMIN" className="bg-slate-950">مدير نظام (ADMIN)</option>
                  </select>
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => { setShowAddUserModal(false); setUserError(null); setUserSuccess(null); }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition-all text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 py-3 bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex justify-center items-center gap-2"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1.1 مودال تعديل بيانات المستخدم (Edit User Modal) */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => { setShowEditUserModal(false); setUserError(null); setUserSuccess(null); }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Pencil size={20} className="text-cyan-400" />
              <span>تعديل بيانات المستخدم</span>
            </h3>

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

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسم المستخدم"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">كلمة المرور الجديدة (اختياري)</label>
                <div className="relative">
                  <input
                    type={showEditUserPassword ? 'text' : 'password'}
                    placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    {showEditUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">نوع الحساب</label>
                <div className="relative">
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all appearance-none cursor-pointer"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                  >
                    <option value="USER" className="bg-slate-950">مستخدم عادي (USER)</option>
                    <option value="ADMIN" className="bg-slate-950">مدير نظام (ADMIN)</option>
                  </select>
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => { setShowEditUserModal(false); setUserError(null); setUserSuccess(null); }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition-all text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="flex-1 py-3 bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex justify-center items-center gap-2"
                >
                  {updatingUser ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1.2 مودال تأكيد حذف المستخدم (Delete User Confirm Modal) */}
      {showDeleteUserConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-red-500/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => { setShowDeleteUserConfirm(false); setUserError(null); setUserSuccess(null); }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-red-400">
              <AlertTriangle size={22} />
              <span>تأكيد حذف المستخدم</span>
            </h3>

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

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                هل أنت متأكد تماماً من رغبتك في حذف حساب المشترك <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.username})؟
              </p>

              <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-[11px] leading-normal">
                <strong>تنبيه هام:</strong> سيؤدي حذف هذا المستخدم إلى إلغاء ربط الأجهزة المرتبطة به تلقائياً (ستصبح أجهزته متوفرة للربط بمستخدمين آخرين) دون حذف بيانات الأجهزة نفسها.
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => { setShowDeleteUserConfirm(false); setUserError(null); setUserSuccess(null); }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition-all text-center"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/15 transition-all text-xs flex justify-center items-center gap-2"
                >
                  {deletingUser ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <span>تأكيد الحذف النهائي</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.3 مودال تفاصيل المستخدم والأجهزة المرتبطة (User Details Modal) */}
      {showUserDetailsModal && selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => { 
                setShowUserDetailsModal(false); 
                setSelectedUserForDetails(null); 
                setShowAddDeviceInline(false);
                setInlineRegisterError(null);
              }}
              className="absolute top-4 left-4 p-2.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all active:scale-95"
              style={{ minWidth: '44px', minHeight: '44px' }}
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>

            <div className="flex items-center mb-6 pb-4 border-b border-slate-900 pl-12">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <UserCheck size={22} className="text-cyan-400" />
                  <span>تفاصيل المشترك</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">عرض المعلومات التفصيلية والأجهزة المرتبطة بالحساب</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* تفاصيل الحساب */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-900/80">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">الاسم الكامل</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{selectedUserForDetails.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">نوع الصلاحية</span>
                  <span className="mt-1 block">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                      selectedUserForDetails.role === 'ADMIN'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700/50'
                    }`}>
                      {selectedUserForDetails.role === 'ADMIN' ? 'مدير نظام' : 'مستخدم عادي'}
                    </span>
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">اسم المستخدم</span>
                  <span className="text-xs font-bold text-slate-300 mt-0.5 block">{selectedUserForDetails.username}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">تاريخ الانضمام للنظام</span>
                  <span className="text-xs font-bold text-slate-400 mt-0.5 block">
                    {new Date(selectedUserForDetails.created_at).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* الأجهزة المرتبطة وإدارتها */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h4 className="text-xs font-black text-slate-400 tracking-wide flex items-center gap-2">
                    <Cpu size={16} className="text-slate-500" />
                    <span>الأجهزة المرتبطة بالحساب ({devices.filter(d => d.user?.id === selectedUserForDetails.id).length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDeviceInline(!showAddDeviceInline);
                      setInlineRegisterError(null);
                    }}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    style={{ minHeight: '40px' }}
                  >
                    {showAddDeviceInline ? 'إغلاق النموذج' : '+ ربط جهاز'}
                  </button>
                </div>

                {/* نموذج ربط جهاز جديد للعميل الحالي */}
                {showAddDeviceInline && (
                  <form onSubmit={(e) => handleRegisterDeviceInline(e, selectedUserForDetails.id)} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900/80 mb-3 space-y-4">
                    <h5 className="text-xs font-bold text-white uppercase">ربط جهاز جديد لهذا الحساب</h5>
                    
                    {inlineRegisterError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                        {inlineRegisterError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">معرف الجهاز (ID)</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: 00BC614E"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all uppercase"
                          value={inlineDeviceId}
                          onChange={(e) => setInlineDeviceId(e.target.value)}
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">اسم الجهاز</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: جهاز الحديقة"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500 outline-none text-white text-xs transition-all"
                          value={inlineDeviceName}
                          onChange={(e) => setInlineDeviceName(e.target.value)}
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAddDeviceInline(false)}
                        className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
                        style={{ minHeight: '40px' }}
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={inlineRegistering}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center"
                        style={{ minHeight: '40px' }}
                      >
                        {inlineRegistering ? 'جاري الربط...' : 'تأكيد الربط'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {devices.filter(d => d.user?.id === selectedUserForDetails.id).length === 0 ? (
                    <div className="p-6 bg-slate-900/20 border border-slate-900 rounded-2xl text-center">
                      <p className="text-xs text-slate-600 font-medium">لا توجد أي أجهزة مرتبطة بهذا الحساب حالياً.</p>
                    </div>
                  ) : (
                    devices.filter(d => d.user?.id === selectedUserForDetails.id).map(dev => (
                      <div key={dev.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-900/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            dev.status === 'online' ? 'bg-emerald-500 shadow-md shadow-emerald-500/20 animate-pulse' : 'bg-slate-600'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-white block">{dev.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">ID: {dev.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              dev.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                            }`}>
                              {dev.status === 'online' ? 'نشط الآن' : 'غير متصل'}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1">المياه: {dev.water_level}%</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDeviceInline(dev.id)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/15 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                            style={{ minWidth: '44px', minHeight: '44px' }}
                            title="إلغاء ربط وحذف الجهاز"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap justify-between items-center gap-3">
              {selectedUserForDetails.id !== user.id && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(selectedUserForDetails);
                      setEditUserName(selectedUserForDetails.name);
                      setEditUsername(selectedUserForDetails.username);
                      setEditUserRole(selectedUserForDetails.role);
                      setEditUserPassword('');
                      setShowUserDetailsModal(false);
                      setShowEditUserModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    style={{ minHeight: '40px' }}
                    title="تعديل بيانات الحساب"
                  >
                    <Pencil size={14} />
                    <span>تعديل الحساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleUserActive(selectedUserForDetails)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-xs font-bold ${
                      selectedUserForDetails.is_active
                        ? 'hover:bg-red-500/5 hover:border-red-500/30 text-slate-300 hover:text-red-400'
                        : 'hover:bg-emerald-500/5 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    {selectedUserForDetails.is_active ? (
                      <>
                        <UserX size={14} />
                        <span>تعطيل الحساب</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} />
                        <span>تفعيل الحساب</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => { 
                  setShowUserDetailsModal(false); 
                  setSelectedUserForDetails(null); 
                  setShowAddDeviceInline(false);
                  setInlineRegisterError(null);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all cursor-pointer mr-auto text-center flex items-center justify-center"
                style={{ minHeight: '40px' }}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. مودال تسجيل وربط جهاز جديد (Add Device Modal) */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => { setShowAddDeviceModal(false); setDeviceError(null); setDeviceSuccess(null); }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Cpu size={22} className="text-blue-400" />
              <span>تسجيل وربط جهاز جديد</span>
            </h3>

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
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">معرف الجهاز (ID / Chip ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 00BC614E"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all uppercase"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1">المعرف الفريد المكتوب في اسم شبكة تهيئة الجهاز.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">اسم الجهاز (Device Name)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ألواح المزرعة الشمالية"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">العميل المستلم (User)</label>
                <div className="relative">
                  <select
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none text-white text-xs transition-all appearance-none cursor-pointer"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  >
                    <option value="" className="bg-slate-950">-- اختر المستخدم لربط الجهاز به --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-slate-950">
                        {u.name} ({u.username})
                      </option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => { setShowAddDeviceModal(false); setDeviceError(null); setDeviceSuccess(null); }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition-all text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={registeringDevice}
                  className="flex-1 py-3 bg-gradient-to-l from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-xs flex justify-center items-center gap-2"
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. مودال تأكيد الحذف */}
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
    </div>
  );
};
