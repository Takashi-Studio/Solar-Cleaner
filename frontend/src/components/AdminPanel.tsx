import React, { useState, useEffect } from 'react';
import { 
  Users, Cpu, Plus, Trash2, LogOut, Key, UserPlus, 
  Shield, Check, X, AlertTriangle, RefreshCw, LayoutDashboard, Loader2,
  Eye, EyeOff, LayoutGrid, Activity, ChevronDown, UserCheck, Smartphone, Menu, Pencil, UserX, ChevronRight, Power
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
  units?: any[];
}

type TabType = 'overview' | 'users' | 'devices' | 'user-devices';

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  token, 
  user, 
  onLogout, 
  onNavigateToDashboard 
}) => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/admin/overview');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/admin/overview');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // تحليل الهاش لمعرفة التبويب والمستخدم المختار
  let activeTab: TabType = 'overview';
  let userIdFromHash: number | null = null;

  if (currentHash === '#/admin/overview') {
    activeTab = 'overview';
  } else if (currentHash === '#/admin/users') {
    activeTab = 'users';
  } else {
    const match = currentHash.match(/^#\/admin\/users\/(\d+)\/devices$/);
    if (match) {
      activeTab = 'user-devices';
      userIdFromHash = Number(match[1]);
    }
  }

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

  // إدارة أجهزة مستخدم معين
  const [selectedUserForDevices, setSelectedUserForDevices] = useState<UserItem | null>(null);

  // مودال تفاصيل المتحكم (الأجهزة)
  const [showControllerDetailsModal, setShowControllerDetailsModal] = useState(false);
  const [selectedController, setSelectedController] = useState<DeviceItem | null>(null);
  const [showEditControllerInline, setShowEditControllerInline] = useState(false);
  const [editControllerName, setEditControllerName] = useState('');
  const [updatingController, setUpdatingController] = useState(false);
  const [stoppingController, setStoppingController] = useState(false);

  // مودال إدارة الوحدات
  const [showManageUnitsModal, setShowManageUnitsModal] = useState(false);
  const [selectedControllerForUnits, setSelectedControllerForUnits] = useState<DeviceItem | null>(null);
  
  // فورم إضافة وحدة يدوياً
  const [showAddUnitInline, setShowAddUnitInline] = useState(false);
  const [newUnitPort, setNewUnitPort] = useState<number>(1);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitSpeed, setNewUnitSpeed] = useState<number>(800);
  const [addingUnit, setAddingUnit] = useState(false);
  const [unitFormError, setUnitFormError] = useState<string | null>(null);

  // فورم تعديل وحدة
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitSpeed, setEditUnitSpeed] = useState<number>(800);
  const [editUnitInstalled, setEditUnitInstalled] = useState<boolean>(true);
  const [updatingUnitId, setUpdatingUnitId] = useState<number | null>(null);

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

  // مزامنة العميل المختار مع معرف العميل في المسار (Hash)
  useEffect(() => {
    if (userIdFromHash && users.length > 0) {
      const foundUser = users.find(u => u.id === userIdFromHash);
      if (foundUser) {
        setSelectedUserForDevices(foundUser);
      }
    } else if (!userIdFromHash) {
      setSelectedUserForDevices(null);
    }
  }, [userIdFromHash, users]);

  // قفل التمرير للخلفية عند فتح أي مودال
  useEffect(() => {
    const isAnyModalOpen = showUserDetailsModal || showAddUserModal || showAddDeviceModal || showEditUserModal || showDeleteUserConfirm || showDeleteConfirm || showControllerDetailsModal || showManageUnitsModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUserDetailsModal, showAddUserModal, showAddDeviceModal, showEditUserModal, showDeleteUserConfirm, showDeleteConfirm, showControllerDetailsModal, showManageUnitsModal]);

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

  // تعديل اسم الجهاز/المتحكم
  const handleUpdateController = async (controllerId: string, newName: string) => {
    if (!newName.trim()) return;
    setUpdatingController(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/controllers/${encodeURIComponent(controllerId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تعديل اسم الجهاز');
      }
      setShowEditControllerInline(false);
      // تحديث المتحكم المختار في التفاصيل
      if (selectedController && selectedController.id === controllerId) {
        setSelectedController(prev => prev ? { ...prev, name: newName } : null);
      }
      fetchDevices();
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تعديل اسم الجهاز');
    } finally {
      setUpdatingController(false);
    }
  };

  // إيقاف تشغيل جميع وحدات المتحكم
  const handleStopController = async (controllerId: string) => {
    setStoppingController(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/controllers/${encodeURIComponent(controllerId)}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال أمر الإيقاف');
      }
      alert('تم إرسال أمر إيقاف لجميع الوحدات بنجاح.');
      fetchDevices();
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء إرسال أمر الإيقاف');
    } finally {
      setStoppingController(false);
    }
  };

  // تعديل وحدة تنظيف
  const handleUpdateUnit = async (unitId: number, name: string, speed: number, isInstalled: boolean) => {
    setUpdatingUnitId(unitId);
    try {
      const res = await fetch(`${API_URL}/api/admin/units/${unitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, speed, is_installed: isInstalled })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث وحدة التنظيف');
      }
      setEditingUnitId(null);
      // تحديث البيانات في الواجهة
      fetchDevices();
      // تحديث قائمة الوحدات في المتحكم المحدد حالياً لإدارتها
      if (selectedControllerForUnits) {
        const updatedUnits = selectedControllerForUnits.units?.map(u => 
          u.id === unitId ? { ...u, name, speed, is_installed: isInstalled } : u
        ) || [];
        setSelectedControllerForUnits(prev => prev ? { ...prev, units: updatedUnits } : null);
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تحديث وحدة التنظيف');
    } finally {
      setUpdatingUnitId(null);
    }
  };

  // إضافة وحدة تنظيف جديدة يدوياً
  const handleAddUnit = async (e: React.FormEvent, controllerId: string) => {
    e.preventDefault();
    setUnitFormError(null);
    if (!newUnitName.trim()) {
      setUnitFormError('يرجى إدخال اسم الوحدة.');
      return;
    }
    setAddingUnit(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/controllers/${encodeURIComponent(controllerId)}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          port_number: newUnitPort,
          name: newUnitName,
          speed: newUnitSpeed
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إضافة الوحدة');
      }
      setNewUnitName('');
      setNewUnitPort(1);
      setNewUnitSpeed(800);
      setShowAddUnitInline(false);
      fetchDevices();
      // تحديث قائمة الوحدات في المتحكم المفتوح حالياً
      if (selectedControllerForUnits) {
        const updatedUnits = [...(selectedControllerForUnits.units || []), data].sort((a, b) => a.port_number - b.port_number);
        setSelectedControllerForUnits(prev => prev ? { ...prev, units: updatedUnits } : null);
      }
    } catch (err: any) {
      setUnitFormError(err.message || 'خطأ أثناء إضافة الوحدة');
    } finally {
      setAddingUnit(false);
    }
  };

  // حذف وحدة تنظيف يدوياً
  const handleDeleteUnit = async (unitId: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف وحدة التنظيف هذه نهائياً؟ سيتم حذف جميع سجلاتها وجدولتها.')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/units/${unitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل حذف الوحدة');
      }
      fetchDevices();
      // تحديث قائمة الوحدات في المتحكم المفتوح حالياً
      if (selectedControllerForUnits) {
        const updatedUnits = selectedControllerForUnits.units?.filter(u => u.id !== unitId) || [];
        setSelectedControllerForUnits(prev => prev ? { ...prev, units: updatedUnits } : null);
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء حذف وحدة التنظيف');
    }
  };

  // تشغيل / إيقاف تنظيف وحدة مباشرة (من مودال الإدارة)
  const handleToggleUnitCleaning = async (controllerId: string, unitId: number, currentState: string) => {
    const isCleaning = currentState === 'CLEANING';
    const cmd = isCleaning ? 'stop' : 'clean';
    try {
      const res = await fetch(`${API_URL}/api/controllers/${encodeURIComponent(controllerId)}/units/${unitId}/${cmd}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'فشلت العملية');
      }
      // تحديث الحالة محلياً فوراً
      if (selectedControllerForUnits) {
        const updatedUnits = selectedControllerForUnits.units?.map(u => 
          u.id === unitId ? { ...u, state: isCleaning ? 'STOPPED' : 'CLEANING' } : u
        ) || [];
        setSelectedControllerForUnits(prev => prev ? { ...prev, units: updatedUnits } : null);
      }
      setTimeout(fetchDevices, 1000);
    } catch (err: any) {
      alert(err.message);
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
            onClick={() => { window.location.hash = '#/admin/overview'; }}
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
            onClick={() => { window.location.hash = '#/admin/users'; }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'users'
                ? 'bg-gradient-to-l from-cyan-500/15 to-blue-500/5 border-r-2 border-cyan-500 text-cyan-400 shadow-md'
                : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
            }`}
          >
            <Users size={16} />
            <span>إدارة المستخدمين</span>
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
                window.location.hash = '#/admin/overview';
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
                window.location.hash = '#/admin/users';
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
              {activeTab === 'user-devices' && 'إدارة الأجهزة والمتحكمات الخاصة بالمشترك'}
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
                <>
                  {/* عرض الجدول المخصص للحواسب والأجهزة اللوحية (Desktop/Tablet Table) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 pb-3">
                          <th className="py-3 px-4 text-right font-semibold">الاسم</th>
                          <th className="py-3 px-4 text-right font-semibold">اسم المستخدم</th>
                          <th className="py-3 px-4 text-right font-semibold">الصلاحية</th>
                          <th className="py-3 px-4 text-right font-semibold">الأجهزة</th>
                          <th className="py-3 px-4 text-right font-semibold">الحالة</th>
                          <th className="py-3 px-4 text-right font-semibold">تاريخ التسجيل</th>
                          <th className="py-3 px-4 text-center font-semibold">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60">
                        {users.map((u) => (
                          <tr 
                            key={u.id} 
                            className="hover:bg-slate-900/20 transition-colors group cursor-pointer"
                            onClick={() => {
                              setSelectedUserForDetails(u);
                              setShowUserDetailsModal(true);
                            }}
                          >
                            <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                            <td className="py-3.5 px-4 text-slate-400">{u.username}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${
                                u.role === 'ADMIN'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700/50'
                              }`}>
                                {u.role === 'ADMIN' ? 'مدير نظام' : 'مستخدم'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-300 font-semibold">
                                {u._count.devices} أجهزة
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                                u.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {u.is_active ? 'نشط' : 'معطل'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {new Date(u.created_at).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </td>
                            <td className="py-2 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* زر إدارة الأجهزة */}
                                <button
                                  onClick={() => {
                                    window.location.hash = `#/admin/users/${u.id}/devices`;
                                  }}
                                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/30 text-blue-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                  style={{ minWidth: '36px', minHeight: '36px' }}
                                  title="إدارة الأجهزة"
                                >
                                  <Cpu size={14} />
                                </button>

                                {/* زر التعديل */}
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserName(u.name);
                                    setEditUsername(u.username);
                                    setEditUserRole(u.role);
                                    setEditUserPassword('');
                                    setShowEditUserModal(true);
                                  }}
                                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                  style={{ minWidth: '36px', minHeight: '36px' }}
                                  title="تعديل الحساب"
                                >
                                  <Pencil size={14} />
                                </button>

                                {/* زر التفعيل/التعطيل */}
                                <button
                                  onClick={() => handleToggleUserActive(u)}
                                  disabled={u.id === user.id}
                                  className={`p-2 bg-slate-900 border border-slate-800 rounded-xl transition-all flex items-center justify-center ${
                                    u.id === user.id
                                      ? 'text-slate-600 border-slate-900/50 cursor-not-allowed opacity-30'
                                      : u.is_active
                                        ? 'text-amber-400 hover:text-amber-300 hover:border-amber-500/30 cursor-pointer'
                                        : 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 cursor-pointer'
                                  }`}
                                  style={{ minWidth: '36px', minHeight: '36px' }}
                                  title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                >
                                  {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                </button>

                                {/* زر الحذف */}
                                <button
                                  onClick={() => {
                                    setUserToDelete(u);
                                    setShowDeleteUserConfirm(true);
                                  }}
                                  disabled={u.id === user.id}
                                  className={`p-2 bg-slate-900 border border-slate-800 rounded-xl transition-all flex items-center justify-center ${
                                    u.id === user.id
                                      ? 'text-slate-600 border-slate-900/50 cursor-not-allowed opacity-30'
                                      : 'text-red-400 hover:text-red-300 hover:border-red-500/30 cursor-pointer'
                                  }`}
                                  style={{ minWidth: '36px', minHeight: '36px' }}
                                  title="حذف الحساب"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* عرض بطاقات العملاء المخصصة للهاتف (Mobile Cards) */}
                  <div className="md:hidden space-y-3">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUserForDetails(u);
                          setShowUserDetailsModal(true);
                        }}
                        className="p-4 bg-slate-900/40 hover:bg-slate-900/60 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all cursor-pointer flex flex-col gap-3 active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{u.name}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-black ${
                                u.role === 'ADMIN'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                  : 'bg-slate-850 text-slate-400 border-slate-800'
                              }`}>
                                {u.role === 'ADMIN' ? 'مدير' : 'مستخدم'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{u.username}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {u.is_active ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                        
                        <div className="pt-3 border-t border-slate-900/60 flex justify-between items-center text-[10px] text-slate-500">
                          <span>مسجل منذ: {new Date(u.created_at).toLocaleDateString('ar-EG')}</span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[9px] text-slate-400">
                              {u._count.devices} أجهزة
                            </span>
                            <button
                              onClick={() => {
                                window.location.hash = `#/admin/users/${u.id}/devices`;
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/30 text-blue-400 rounded-lg flex items-center justify-center cursor-pointer active:scale-95"
                              title="إدارة الأجهزة"
                            >
                              <Cpu size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* التبويب: إدارة أجهزة مستخدم معين */}
        {activeTab === 'user-devices' && selectedUserForDevices && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    window.location.hash = '#/admin/users';
                  }}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white"
                  title="العودة لإدارة المستخدمين"
                >
                  <ChevronRight size={20} className="rtl:rotate-0 ltr:rotate-180" />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">إدارة الأجهزة والمتحكمات</h2>
                  <p className="text-xs text-cyan-400 font-bold mt-1">العميل: {selectedUserForDevices.name} ({selectedUserForDevices.username})</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setTargetUserId(String(selectedUserForDevices.id));
                  setShowAddDeviceModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-l from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs transition-all duration-300 transform active:scale-95 shadow-lg shadow-blue-500/15"
              >
                <Plus size={16} />
                <span>ربط جهاز جديد للعميل</span>
              </button>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-900">
              {loadingDevices ? (
                <div className="py-20 flex justify-center text-slate-400 text-sm">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
              ) : devices.filter(d => d.user?.id === selectedUserForDevices.id).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Cpu size={32} className="mx-auto text-slate-700" />
                  <p className="text-xs text-slate-600">لا توجد أجهزة مسجلة أو مرتبطة بهذا المستخدم حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices
                    .filter(d => d.user?.id === selectedUserForDevices.id)
                    .map((d) => (
                      <div 
                        key={d.id} 
                        onClick={() => {
                          setSelectedController(d);
                          setEditControllerName(d.name);
                          setShowControllerDetailsModal(true);
                        }}
                        className="p-4 bg-slate-900/40 hover:bg-slate-900/60 transition-all rounded-2xl border border-slate-900 hover:border-slate-800 flex flex-col justify-between min-h-[205px] cursor-pointer relative group active:scale-[0.99]"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-white block group-hover:text-cyan-400 transition-colors">{d.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">معرف: {d.id}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            <span className="text-[9px] text-slate-500">{d.status === 'online' ? 'متصل' : 'أوفلاين'}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-900/60 mt-3 space-y-1 text-[10px] text-slate-400">
                          <div>الحالة المباشرة للمعدات: <span className="text-cyan-400 font-semibold">{d.state === 'IDLE' ? 'جاهز' : 'ينظف حالياً'}</span></div>
                          {d.water_level !== undefined && <div>مستوى المياه: <span className="text-blue-400 font-semibold">{d.water_level}%</span></div>}
                          <div>عدد وحدات التنظيف: <span className="text-slate-200 font-bold">{d.units?.length || 0} وحدات</span></div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-900/60 mt-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedControllerForUnits(d);
                              setShowManageUnitsModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-850 hover:border-cyan-500/30 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <Cpu size={12} className="text-cyan-400" />
                            <span>إدارة الوحدات</span>
                          </button>
                          
                          <button
                            onClick={() => handleCheckConnection(d.id)}
                            disabled={checkingConnId === d.id}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="فحص الاتصال"
                          >
                            <RefreshCw size={12} className={checkingConnId === d.id ? "animate-spin" : ""} />
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
                <div className="flex justify-between items-center pb-2 border-b border-slate-900 gap-2 flex-wrap">
                  <h4 className="text-xs font-black text-slate-400 tracking-wide flex items-center gap-2 mr-auto">
                    <Cpu size={16} className="text-slate-500" />
                    <span>الأجهزة المرتبطة بالحساب ({devices.filter(d => d.user?.id === selectedUserForDetails.id).length})</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDetailsModal(false);
                        window.location.hash = `#/admin/users/${selectedUserForDetails.id}/devices`;
                      }}
                      className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      style={{ minHeight: '40px' }}
                      title="الذهاب لصفحة إدارة أجهزة هذا المستخدم"
                    >
                      <Cpu size={14} />
                      <span>إدارة الأجهزة</span>
                    </button>
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

            <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between items-center gap-3">
              <div className="flex gap-2">
                {/* 1. تعديل المستخدم */}
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
                  className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="تعديل بيانات الحساب"
                >
                  <Pencil size={16} />
                </button>

                {/* 2. تفعيل/تعطيل العميل */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleUserActive(selectedUserForDetails);
                    setSelectedUserForDetails(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
                  }}
                  disabled={selectedUserForDetails.id === user.id}
                  className={`p-2.5 bg-slate-900 border border-slate-800 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                    selectedUserForDetails.id === user.id
                      ? 'text-slate-600 border-slate-900/50 cursor-not-allowed opacity-30'
                      : selectedUserForDetails.is_active
                        ? 'text-amber-400 hover:text-amber-300 hover:border-amber-500/30 cursor-pointer'
                        : 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 cursor-pointer'
                  }`}
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title={selectedUserForDetails.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                >
                  {selectedUserForDetails.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>

                {/* 3. حذف العميل */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    setUserToDelete(selectedUserForDetails);
                    setShowDeleteUserConfirm(true);
                  }}
                  disabled={selectedUserForDetails.id === user.id}
                  className={`p-2.5 bg-slate-900 border border-slate-800 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                    selectedUserForDetails.id === user.id
                      ? 'text-slate-600 border-slate-900/50 cursor-not-allowed opacity-30'
                      : 'text-red-400 hover:text-red-300 hover:border-red-500/30 cursor-pointer'
                  }`}
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="حذف الحساب نهائياً"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => { 
                  setShowUserDetailsModal(false); 
                  setSelectedUserForDetails(null); 
                  setShowAddDeviceInline(false);
                  setInlineRegisterError(null);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all cursor-pointer mr-auto text-center"
                style={{ minHeight: '40px' }}
              >
                إغلاق
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

      {/* مودال تفاصيل المتحكم (Controller Details Modal) */}
      {showControllerDetailsModal && selectedController && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => {
                setShowControllerDetailsModal(false);
                setSelectedController(null);
                setShowEditControllerInline(false);
              }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center gap-2 mb-6 text-white border-b border-slate-800 pb-3">
              <Cpu size={20} className="text-cyan-400" />
              <span>تفاصيل جهاز التحكم</span>
            </h3>

            <div className="space-y-4 text-xs">
              {showEditControllerInline ? (
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <label className="block text-[10px] text-slate-400 uppercase font-bold">اسم الجهاز الجديد</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg outline-none text-white focus:border-cyan-500 transition-all text-xs"
                    value={editControllerName}
                    onChange={(e) => setEditControllerName(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setShowEditControllerInline(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleUpdateController(selectedController.id, editControllerName)}
                      disabled={updatingController}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {updatingController ? 'جاري الحفظ...' : 'حفظ'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 bg-slate-900/20 p-4 rounded-2xl border border-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-500 block">اسم الجهاز</span>
                    <span className="font-bold text-white text-xs">{selectedController.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">معرف الجهاز (ID)</span>
                    <span className="font-mono font-semibold text-slate-300 text-xs">{selectedController.id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">المالك</span>
                    <span className="font-bold text-cyan-400 text-xs">
                      {selectedController.user ? selectedController.user.name : 'غير مرتبط'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">حالة الاتصال</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold ${
                      selectedController.status === 'online' ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedController.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                      }`} />
                      {selectedController.status === 'online' ? 'متصل' : 'أوفلاين'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">آخر ظهور للجهاز</span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(selectedController.last_seen).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">حالة المعدات</span>
                    <span className="text-cyan-400 font-bold text-xs">
                      {selectedController.state === 'IDLE' ? 'جاهز' : 'ينظف حالياً'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* أزرار الإجراءات عبارة عن رموز فقط وليست نصوص */}
            <div className="flex justify-between items-center gap-3 pt-5 border-t border-slate-900 mt-6">
              <div className="flex gap-2">
                {/* تعديل الاسم */}
                <button
                  onClick={() => setShowEditControllerInline(true)}
                  className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="تعديل اسم الجهاز"
                >
                  <Pencil size={16} />
                </button>

                {/* إيقاف تشغيل الجهاز */}
                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من رغبتك في إرسال أمر إيقاف طارئ لجميع الوحدات المرتبطة بهذا المتحكم؟')) {
                      handleStopController(selectedController.id);
                    }
                  }}
                  disabled={stoppingController || selectedController.status !== 'online'}
                  className={`p-2.5 bg-slate-900 border border-slate-800 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                    selectedController.status !== 'online'
                      ? 'text-slate-600 border-slate-900/50 cursor-not-allowed opacity-30'
                      : 'text-amber-500 hover:text-amber-400 hover:border-amber-500/30 cursor-pointer animate-pulse'
                  }`}
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="إيقاف تشغيل الجهاز"
                >
                  <Power size={16} />
                </button>

                {/* حذف/إلغاء ربط الجهاز */}
                <button
                  onClick={() => {
                    setShowControllerDetailsModal(false);
                    setDeviceToDelete(selectedController.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-red-500/30 text-red-500 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                  title="إلغاء ربط وحذف الجهاز"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <button
                onClick={() => {
                  setShowControllerDetailsModal(false);
                  setSelectedController(null);
                  setShowEditControllerInline(false);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer text-[10px] font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إدارة الوحدات (Manage Units Modal) */}
      {showManageUnitsModal && selectedControllerForUnits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowManageUnitsModal(false);
                setSelectedControllerForUnits(null);
                setShowAddUnitInline(false);
                setEditingUnitId(null);
              }}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold flex items-center gap-2 mb-4 text-white border-b border-slate-800 pb-3">
              <Cpu size={20} className="text-cyan-400" />
              <span>إدارة وحدات التنظيف: {selectedControllerForUnits.name}</span>
            </h3>

            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase">قائمة الوحدات المرتبطة بالمنافذ (1-4)</span>
              
              {!showAddUnitInline && (selectedControllerForUnits.units?.length || 0) < 4 && (
                <button
                  onClick={() => {
                    setShowAddUnitInline(true);
                    setNewUnitPort(
                      [1, 2, 3, 4].find(p => !selectedControllerForUnits.units?.some(u => u.port_number === p)) || 1
                    );
                    setNewUnitName(`وحدة منفذ ${[1, 2, 3, 4].find(p => !selectedControllerForUnits.units?.some(u => u.port_number === p)) || 1}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={12} />
                  <span>إضافة وحدة جديدة</span>
                </button>
              )}
            </div>

            {showAddUnitInline && (
              <form onSubmit={(e) => handleAddUnit(e, selectedControllerForUnits.id)} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-850 mb-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white">إضافة وحدة تنظيف جديدة</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddUnitInline(false)}
                    className="text-slate-400 hover:text-white text-[10px]"
                  >
                    إلغاء
                  </button>
                </div>

                {unitFormError && (
                  <p className="text-[10px] text-red-400">{unitFormError}</p>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">منفذ التوصيل (Port)</label>
                    <select
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-[10px] outline-none cursor-pointer"
                      value={newUnitPort}
                      onChange={(e) => setNewUnitPort(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4]
                        .filter(p => !selectedControllerForUnits.units?.some(u => u.port_number === p))
                        .map(p => (
                          <option key={p} value={p}>المنفذ {p}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">اسم الوحدة</label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-[10px] outline-none focus:border-cyan-500"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1">السرعة الافتراضية (Speed)</label>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white text-[10px] outline-none focus:border-cyan-500"
                      value={newUnitSpeed}
                      onChange={(e) => setNewUnitSpeed(Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingUnit}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {addingUnit ? 'جاري الإضافة...' : 'إضافة'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {(!selectedControllerForUnits.units || selectedControllerForUnits.units.length === 0) ? (
                <p className="text-center py-6 text-[10px] text-slate-500">لا توجد وحدات تنظيف مسجلة حالياً على هذا المتحكم.</p>
              ) : (
                selectedControllerForUnits.units.map((unit) => {
                  const isEditing = editingUnitId === unit.id;
                  
                  return (
                    <div key={unit.id} className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[8px] text-slate-500 font-bold">اسم الوحدة</label>
                            <input
                              type="text"
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-white text-[10px] outline-none focus:border-cyan-500"
                              value={editUnitName}
                              onChange={(e) => setEditUnitName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] text-slate-500 font-bold">السرعة الافتراضية (Speed)</label>
                            <input
                              type="number"
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-white text-[10px] outline-none focus:border-cyan-500"
                              value={editUnitSpeed}
                              onChange={(e) => setEditUnitSpeed(Number(e.target.value))}
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-3">
                            <input
                              type="checkbox"
                              id={`installed-${unit.id}`}
                              className="rounded border-slate-800 bg-slate-950 text-cyan-600 focus:ring-0 cursor-pointer"
                              checked={editUnitInstalled}
                              onChange={(e) => setEditUnitInstalled(e.target.checked)}
                            />
                            <label htmlFor={`installed-${unit.id}`} className="text-[10px] text-slate-300 cursor-pointer">مثبت ومفعل</label>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <span className="text-[8px] text-slate-500 block">الوحدة والمنفذ</span>
                            <span className="font-bold text-white">{unit.name} (المنفذ {unit.port_number})</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block">حالة العمل</span>
                            <span className={`font-semibold ${unit.state === 'CLEANING' ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {unit.state === 'CLEANING' ? 'ينظف حالياً' : 'جاهز / متوقف'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block">مستوى المياه</span>
                            <span className="text-blue-400 font-semibold">{unit.water_level}%</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 block">حالة التركيب والسرعة</span>
                            <span className="text-slate-400">
                              {unit.is_installed ? `مثبت (سرعة ${unit.speed})` : 'غير مثبت'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 border-t md:border-t-0 border-slate-900/50 pt-2.5 md:pt-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => setEditingUnitId(null)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-lg text-[9px] font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              onClick={() => handleUpdateUnit(unit.id, editUnitName, editUnitSpeed, editUnitInstalled)}
                              disabled={updatingUnitId === unit.id}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[9px] font-bold cursor-pointer"
                            >
                              حفظ
                            </button>
                          </>
                        ) : (
                          <>
                            {selectedControllerForUnits.status === 'online' && (
                              <button
                                onClick={() => handleToggleUnitCleaning(selectedControllerForUnits.id, unit.id, unit.state)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer ${
                                  unit.state === 'CLEANING'
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {unit.state === 'CLEANING' ? 'إيقاف' : 'بدء تنظيف'}
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingUnitId(unit.id);
                                setEditUnitName(unit.name);
                                setEditUnitSpeed(unit.speed);
                                setEditUnitInstalled(unit.is_installed);
                              }}
                              className="p-1.5 bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-slate-850 hover:border-cyan-500/20 rounded-lg transition-all cursor-pointer"
                              title="تعديل تفاصيل الوحدة"
                            >
                              <Pencil size={12} />
                            </button>

                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="p-1.5 bg-slate-950 hover:bg-slate-900 text-red-400 border border-slate-850 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                              title="حذف الوحدة نهائياً"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-900 mt-6">
              <button
                onClick={() => {
                  setShowManageUnitsModal(false);
                  setSelectedControllerForUnits(null);
                  setShowAddUnitInline(false);
                  setEditingUnitId(null);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:text-white text-slate-400 rounded-xl transition-all cursor-pointer text-[10px] font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
