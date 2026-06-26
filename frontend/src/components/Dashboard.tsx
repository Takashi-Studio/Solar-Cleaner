import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun, Moon, Play, Square, Loader2, Droplets, AlertTriangle,
  CheckCircle2, Clock, Calendar, Trash2, ChevronLeft,
  Zap, Wifi, WifiOff, LogOut, Shield, RotateCcw, History,
  Plus, X, ChevronRight, Menu, Home, Cpu, User, ArrowRight,
  ArrowLeft, Info
} from 'lucide-react';
import { API_URL } from '../config';

// ===================== Types =====================
interface DashboardProps {
  token: string;
  user: { id: number; name: string; username: string; role?: string; theme_preference?: string };
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  currentHash?: string;
}

interface CleaningUnit {
  id: number;
  port_number: number;
  name: string;
  state: string;
  water_level: number;
  is_installed: boolean;
}

interface Controller {
  id: string;
  name: string;
  status: string;
  last_seen: string;
  units: CleaningUnit[];
}

interface Schedule {
  id: number;
  unit_id: number;
  schedule_type: string;
  cleaning_time: string;
  specific_date?: string | null;
  days_of_week?: string | null;
  interval_weeks: number;
  is_active: number;
}

interface CleaningLog {
  id: number;
  unit_id: number;
  triggered_by: string;
  status: string;
  water_level_start?: number;
  water_level_end?: number;
  duration_seconds?: number;
  created_at: string;
}

// ===================== Helpers =====================
const DAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

function formatLastSeen(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  return `${Math.floor(diff / 86400)} ي`;
}

function formatTime(seconds?: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}ث`;
  return `${Math.floor(seconds / 60)}د ${seconds % 60}ث`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-SA', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===================== State Badge =====================
function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    CLEANING: { label: 'يُنظِّف', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)]', icon: <Loader2 size={11} className="animate-spin" /> },
    RETURNING_HOME: { label: 'عائد للبداية', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]', icon: <Loader2 size={11} className="animate-spin" /> },
    CLEANING_DONE: { label: 'اكتمل', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]', icon: <CheckCircle2 size={11} /> },
    WATER_LOW: { label: 'أُوقف: ماء ناقص', cls: 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,110,110,0.15)]', icon: <AlertTriangle size={11} /> },
    SENSOR_ERR: { label: 'خطأ في الحساس', cls: 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,110,110,0.15)]', icon: <AlertTriangle size={11} /> },
    LIMIT_SWITCH_ERROR: { label: 'خطأ ميكانيكي', cls: 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,110,110,0.15)]', icon: <AlertTriangle size={11} /> },
    STOPPED: { label: 'موقوف', cls: 'bg-slate-600/20 text-slate-400 border-slate-600/30', icon: <Square size={11} /> },
    IDLE: { label: 'جاهز', cls: 'bg-slate-700/20 text-slate-500 border-slate-700/30', icon: null },
  };
  const cfg = map[state] ?? map.IDLE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ===================== Water Ring =====================
function WaterRing({ level }: { level: number }) {
  const color = level > 50 ? '#06b6d4' : level > 20 ? '#f59e0b' : '#ef4444';
  const r = 16, c = 20, circ = 2 * Math.PI * r;
  const dash = (level / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-11 h-11">
      <svg width="40" height="40" viewBox="0 0 40 40" className="rotate-[-90deg]">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{level}%</span>
    </div>
  );
}

// ===================== Main Dashboard =====================
export const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout, onNavigateToAdmin }) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'units' | 'logs' | 'profile'>('home');
  const [detailUnit, setDetailUnit] = useState<{ unit: CleaningUnit; controllerId: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const localTheme = localStorage.getItem('solar_clean_theme') as 'dark' | 'light';
    if (localTheme) return localTheme;
    return (user as any)?.theme_preference || 'dark';
  });
  
  const toggleTheme = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('solar_clean_theme', newTheme);
    try {
      await fetch(`${API_URL}/api/profile/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (err) {
      console.error('Error updating theme preference:', err);
    }
  };

  // Manual control states for units (mutually exclusive FWD/BWD motor state, independent pump toggle)
  const [manualStates, setManualStates] = useState<Record<number, { motor: 'IDLE' | 'FWD' | 'BWD'; pump: boolean }>>({});

  // Fetch Controllers (polled)
  const fetchControllers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/controllers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setControllers(data);
      }
    } catch (err) {
      console.error('Error fetching controllers:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchControllers();
    const id = setInterval(fetchControllers, 5000);
    return () => clearInterval(id);
  }, [fetchControllers]);

  // Send commands
  const [cmdLoading, setCmdLoading] = useState<Record<number, boolean>>({});

  const sendCmd = async (controllerId: string, unitId: number, cmd: 'clean' | 'stop') => {
    setCmdLoading(prev => ({ ...prev, [unitId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/controllers/${controllerId}/units/${unitId}/${cmd}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'فشلت العملية');
      }
      setTimeout(fetchControllers, 800);
    } catch (err) {
      console.error('Error sending command:', err);
    } finally {
      setCmdLoading(prev => ({ ...prev, [unitId]: false }));
    }
  };

  // Aggregate variables
  const allUnits = controllers.flatMap(c => c.units);
  const installedUnits = allUnits.filter(u => u.is_installed);
  const cleaningNow = installedUnits.filter(u => u.state === 'CLEANING').length;
  const avgWater = installedUnits.length
    ? Math.round(installedUnits.reduce((s, u) => s + u.water_level, 0) / installedUnits.length)
    : 0;
  const hasAlert = installedUnits.some(u => u.water_level <= 15 || u.state === 'SENSOR_ERR' || u.state === 'LIMIT_SWITCH_ERROR');
  const onlineControllers = controllers.filter(c => c.status === 'online').length;

  // Schedules and Logs for selected unit (Advanced Details Drawer)
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [detailLogs, setDetailLogs] = useState<CleaningLog[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  
  // Add Schedule Form States
  const [newTime, setNewTime] = useState('08:00');
  const [selDays, setSelDays] = useState<number[]>([]);
  const [schedType, setSchedType] = useState<'weekly' | 'once'>('weekly');
  const [specificDate, setSpecificDate] = useState('');

  const fetchUnitDetails = useCallback(async () => {
    if (!detailUnit) return;
    setDetailsLoading(true);
    try {
      const [sRes, lRes] = await Promise.all([
        fetch(`${API_URL}/api/units/${detailUnit.unit.id}/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/units/${detailUnit.unit.id}/logs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sRes.ok) setSchedules(await sRes.json());
      if (lRes.ok) setDetailLogs(await lRes.json());
    } catch (err) {
      console.error('Error fetching unit details:', err);
    } finally {
      setDetailsLoading(false);
    }
  }, [detailUnit, token]);

  useEffect(() => {
    if (detailUnit) {
      fetchUnitDetails();
    }
  }, [detailUnit, fetchUnitDetails]);

  // Operations for schedules
  const handleAddScheduleSubmit = async () => {
    if (!detailUnit) return;
    if (schedType === 'weekly' && selDays.length === 0) return;
    if (schedType === 'once' && !specificDate) return;
    
    setAddingSchedule(true);
    try {
      const res = await fetch(`${API_URL}/api/units/${detailUnit.unit.id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schedule_type: schedType,
          cleaning_time: newTime,
          specific_date: schedType === 'once' ? specificDate : null,
          days_of_week: schedType === 'weekly' ? selDays.join(',') : null,
          interval_weeks: 1
        })
      });
      if (res.ok) {
        setShowAddScheduleModal(false);
        setSelDays([]);
        fetchUnitDetails();
      }
    } catch (err) {
      console.error('Error adding schedule:', err);
    } finally {
      setAddingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUnitDetails();
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  const toggleDay = (d: number) =>
    setSelDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const toggleScheduleActive = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/schedules/${id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUnitDetails();
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
    }
  };

  // All Units Combined Logs state (Logs Tab)
  const [allLogs, setAllLogs] = useState<Array<CleaningLog & { unitName: string; controllerId: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'completed' | 'stopped' | 'water_low' | 'alert_error'>('all');

  const fetchAllLogs = useCallback(async () => {
    if (installedUnits.length === 0) return;
    setLogsLoading(true);
    try {
      const fetchPromises = installedUnits.map(async (unit) => {
        const res = await fetch(`${API_URL}/api/units/${unit.id}/logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          return data.map((log: CleaningLog) => ({
            ...log,
            unitName: unit.name,
            controllerId: controllers.find(c => c.units.some(u => u.id === unit.id))?.id || ''
          }));
        }
        return [];
      });
      const results = await Promise.all(fetchPromises);
      const merged = results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllLogs(merged);
    } catch (err) {
      console.error('Error fetching all logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [installedUnits.length, token, controllers]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAllLogs();
    }
  }, [activeTab, fetchAllLogs]);

  // Filtered logs list
  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = log.unitName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (logFilter === 'all') return true;
    if (logFilter === 'completed') return log.status === 'CLEANING_DONE';
    if (logFilter === 'stopped') return log.status === 'STOPPED';
    if (logFilter === 'water_low') return log.status === 'WATER_LOW';
    if (logFilter === 'alert_error') return ['SENSOR_ERR', 'LIMIT_SWITCH_ERROR'].includes(log.status);
    return true;
  });

  // Manual controls handler
  const getManualState = (unitId: number) => {
    return manualStates[unitId] || { motor: 'IDLE', pump: false };
  };

  const toggleManualMotor = (unitId: number, dir: 'FWD' | 'BWD') => {
    const current = getManualState(unitId);
    const nextMotor = current.motor === dir ? 'IDLE' : dir;
    setManualStates({
      ...manualStates,
      [unitId]: { ...current, motor: nextMotor }
    });
  };

  const toggleManualPump = (unitId: number) => {
    const current = getManualState(unitId);
    setManualStates({
      ...manualStates,
      [unitId]: { ...current, pump: !current.pump }
    });
  };

  // Classes for styling based on light/dark theme
  const isLightTheme = theme === 'light';
  const themeClasses = {
    bg: isLightTheme ? 'bg-slate-50 text-slate-800' : 'bg-[#0a0f1a] text-slate-100',
    sidebarBg: isLightTheme ? 'bg-white border-l border-slate-200' : 'bg-[#0c1322] border-l border-slate-800/60',
    mainBg: isLightTheme ? 'bg-slate-50' : 'bg-[#0a0f1a]',
    cardBg: isLightTheme ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel border-slate-800/60',
    titleText: isLightTheme ? 'text-slate-900' : 'text-white',
    descText: isLightTheme ? 'text-slate-500' : 'text-slate-400',
    border: isLightTheme ? 'border-slate-200' : 'border-slate-800/60',
    navActive: isLightTheme ? 'bg-cyan-50 text-cyan-600' : 'bg-gradient-to-l from-cyan-500/15 to-blue-500/15 border-r-2 border-cyan-400 text-cyan-400',
    navInactive: isLightTheme ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white',
    inputBg: isLightTheme ? 'bg-slate-100 border-slate-300 text-slate-900 focus:border-cyan-500' : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500/50'
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${themeClasses.bg} font-sans`} dir="rtl">
      {/* Desktop Persistent Sidebar (Right-hand side) */}
      <aside className={`hidden md:flex md:w-72 flex-col shrink-0 ${themeClasses.sidebarBg} z-20`}>
        {/* Sidebar Brand Logo */}
        <div className={`px-6 py-5 flex items-center gap-3 border-b ${themeClasses.border}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Sun size={18} className="text-white" />
          </div>
          <span className={`text-base font-black bg-gradient-to-l from-cyan-400 to-${isLightTheme ? 'blue-600' : 'white'} bg-clip-text text-transparent`}>
            APW System
          </span>
        </div>

        {/* Sidebar Navigation Tabs */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: 'home', label: 'الرئيسية', icon: Home },
            { id: 'units', label: 'الوحدات', icon: Cpu },
            { id: 'logs', label: 'السجلات', icon: History },
            { id: 'profile', label: 'الملف الشخصي', icon: User }
          ].map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  active ? themeClasses.navActive : themeClasses.navInactive
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          <div className="my-2 border-t border-slate-800/40" />

          <button
            onClick={() => { window.location.hash = '#/hardware-test'; }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:bg-slate-900/50 hover:text-white`}
          >
            <Zap size={18} />
            <span>اختبار القطع</span>
          </button>
        </nav>

        {/* Sidebar Footer User Badge */}
        <div className={`p-4 border-t ${themeClasses.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-black truncate ${themeClasses.titleText}`}>{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.username}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer Menu (RTL slides from right) */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-out drawer */}
          <aside
            className={`fixed top-0 right-0 h-full w-72 ${themeClasses.sidebarBg} z-50 p-5 shadow-2xl flex flex-col md:hidden transition-transform duration-300 transform translate-x-0`}
          >
            <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
                  <Sun size={16} className="text-white" />
                </div>
                <span className={`text-sm font-black ${themeClasses.titleText}`}>APW System</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation inside Drawer */}
            <nav className="flex-1 space-y-2">
              {[
                { id: 'home', label: 'الرئيسية', icon: Home },
                { id: 'units', label: 'الوحدات', icon: Cpu },
                { id: 'logs', label: 'السجلات', icon: History },
                { id: 'profile', label: 'الملف الشخصي', icon: User }
              ].map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      active ? themeClasses.navActive : themeClasses.navInactive
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <div className="my-2 border-t border-slate-800/40" />

              <button
                onClick={() => { 
                  window.location.hash = '#/hardware-test';
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:bg-slate-900/50 hover:text-white`}
              >
                <Zap size={18} />
                <span>اختبار القطع</span>
              </button>
            </nav>

            {/* Logout / User in Drawer */}
            <div className={`pt-4 border-t ${themeClasses.border} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`text-xs font-black ${themeClasses.titleText}`}>{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.username}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className={`md:hidden sticky top-0 z-30 ${themeClasses.sidebarBg} bg-opacity-95 backdrop-blur-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sun size={16} className="text-white" />
            </div>
            <span className={`text-sm font-black ${themeClasses.titleText}`}>APW System</span>
          </div>
          
          <div className="flex items-center gap-2">
            {hasAlert && (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/40"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* View Contents */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 ${themeClasses.mainBg}`}>
          
          {/* Alert banner globally shown at top of the active view if it's Home/Units */}
          {hasAlert && (activeTab === 'home' || activeTab === 'units') && (
            <div className="glass-panel rounded-2xl p-4 border border-red-500/25 flex items-start gap-3 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-sm font-black text-red-400">تنبيه حرج في النظام</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {installedUnits.filter(u => u.water_level <= 15).length > 0 && 'مستوى ماء منخفض جداً في بعض الخزانات. '}
                  {installedUnits.filter(u => u.state === 'SENSOR_ERR').length > 0 && 'خطأ في قراءة الحساسات الصوتية. '}
                  {installedUnits.filter(u => u.state === 'LIMIT_SWITCH_ERROR').length > 0 && 'خطأ ميكانيكي في تحديد نهاية الشوط.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── HOME VIEW ─── */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Welcome Message */}
              <section className="flex justify-between items-center">
                <div>
                  <p className={`${themeClasses.descText} text-xs`}>مرحباً بك،</p>
                  <h1 className={`text-xl font-black ${themeClasses.titleText}`}>{user.name} 👋</h1>
                </div>
                {user.role === 'ADMIN' && onNavigateToAdmin && (
                  <button
                    onClick={onNavigateToAdmin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-bold bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                  >
                    <Shield size={13} />
                    <span>لوحة الإدارة</span>
                  </button>
                )}
              </section>

              {/* Central Water Level Ring */}
              <section className="flex justify-center">
                <div className={`${themeClasses.cardBg} p-6 rounded-2xl border flex flex-col items-center justify-center w-full max-w-sm shadow-xl`}>
                  <h3 className={`text-xs font-black tracking-wider uppercase mb-5 ${themeClasses.descText}`}>متوسط مخزون المياه العام</h3>
                  
                  <div className="relative flex items-center justify-center w-44 h-44">
                    <svg width="160" height="160" viewBox="0 0 160 160" className="rotate-[-90deg]">
                      {/* Background Ring */}
                      <circle cx="80" cy="80" r="70" fill="none" stroke={isLightTheme ? '#e2e8f0' : '#111b30'} strokeWidth="12" />
                      {/* Active Ring */}
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={avgWater > 20 ? '#06b6d4' : '#ef4444'}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(avgWater / 100) * 2 * Math.PI * 70} ${2 * Math.PI * 70}`}
                        style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
                        className={avgWater <= 20 ? 'animate-pulse' : ''}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-black text-white">{avgWater}%</span>
                      <p className="text-[10px] text-slate-500 mt-1">المستوى الحالي</p>
                    </div>
                  </div>

                  <div className="mt-5 text-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      avgWater > 50 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                        : avgWater > 20 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                    }`}>
                      {avgWater > 50 ? 'مستوى مياه ممتاز' : avgWater > 20 ? 'مستوى منخفض (انتبه)' : 'خطر: نفاد المياه!'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Quick Stats Grid */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Online Controllers */}
                <div className={`${themeClasses.cardBg} rounded-2xl p-4 border flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    onlineControllers > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {onlineControllers > 0 ? <Wifi size={20} /> : <WifiOff size={20} />}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">المتحكمات المتصلة</span>
                    <span className={`text-xl font-black ${themeClasses.titleText}`}>{onlineControllers}</span>
                    <span className="text-xs text-slate-500"> / {controllers.length}</span>
                  </div>
                </div>

                {/* Active Units */}
                <div className={`${themeClasses.cardBg} rounded-2xl p-4 border flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    cleaningNow > 0 ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <RotateCcw size={20} className={cleaningNow > 0 ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">الوحدات النشطة</span>
                    <span className={`text-xl font-black ${themeClasses.titleText}`}>{cleaningNow}</span>
                    <span className="text-[10px] text-slate-500 block">تعمل في الوقت الحالي</span>
                  </div>
                </div>

                {/* Total Units */}
                <div className={`${themeClasses.cardBg} rounded-2xl p-4 border flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">إجمالي الوحدات</span>
                    <span className={`text-xl font-black ${themeClasses.titleText}`}>{installedUnits.length}</span>
                    <span className="text-[10px] text-slate-500 block">وحدة تنظيف مركبة</span>
                  </div>
                </div>
              </section>

              {/* System Health Card */}
              <section className={`${themeClasses.cardBg} rounded-2xl p-5 border shadow-sm flex items-start gap-3.5`}>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className={`text-xs font-black ${themeClasses.titleText}`}>ملخص حالة النظام</h4>
                  <p className={`text-[11px] mt-1 ${themeClasses.descText}`}>
                    {hasAlert 
                      ? 'يوجد تنبيهات نشطة في النظام. يرجى مراجعة تفاصيل الوحدات للتأكد من مستويات المياه أو سلامة الحساسات والمحركات.' 
                      : 'جميع الوحدات والمتحكمات متصلة وتعمل بكفاءة تامة. مستويات المياه في الخزانات كافية للتشغيل والجدولة تعمل كالمعتاد.'}
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ─── UNITS VIEW ─── */}
          {activeTab === 'units' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className={`text-lg font-black ${themeClasses.titleText}`}>قائمة الوحدات والمتحكمات</h1>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={28} className="text-cyan-500 animate-spin" />
                  <p className="text-slate-500 text-xs">جاري تحميل الأجهزة...</p>
                </div>
              ) : controllers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${themeClasses.cardBg} rounded-2xl border`}>
                  <WifiOff size={32} className="text-slate-700" />
                  <p className="text-slate-500 text-sm font-bold">لا توجد أجهزة مربوطة بحسابك</p>
                  <p className="text-slate-600 text-xs text-center">تواصل مع مدير النظام لإضافة جهازك</p>
                </div>
              ) : (
                controllers.map(ctrl => (
                  <section key={ctrl.id} className="space-y-3">
                    {/* Controller Header Card */}
                    <div className={`${themeClasses.cardBg} rounded-2xl px-5 py-4 border shadow-sm flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${ctrl.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <div>
                          <h3 className={`text-sm font-black ${themeClasses.titleText}`}>{ctrl.name}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {ctrl.status === 'online' ? 'متصل بالشبكة' : `آخر ظهور: ${formatLastSeen(ctrl.last_seen)}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-900/40 text-slate-400 border border-slate-800/60 px-2.5 py-1 rounded-lg">
                        {ctrl.id}
                      </span>
                    </div>

                    {/* Units Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {ctrl.units.length === 0 ? (
                        <p className="text-slate-500 text-xs py-4 col-span-2 text-center">لم يتم العثور على وحدات تنظيف لهذا المتحكم.</p>
                      ) : (
                        ctrl.units.map(unit => {
                          const isCleaning = unit.state === 'CLEANING';
                          const isReturning = unit.state === 'RETURNING_HOME';
                          const isActive = isCleaning || isReturning;
                          const isIdle = unit.state === 'IDLE' || unit.state === 'CLEANING_DONE';
                          
                          if (!unit.is_installed) {
                            return (
                              <div key={unit.id} className={`${themeClasses.cardBg} rounded-2xl p-4 border opacity-40 flex items-center gap-3.5`}>
                                <div className="w-10 h-10 rounded-xl bg-slate-800/40 flex items-center justify-center shrink-0">
                                  <WifiOff size={16} className="text-slate-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-500">{unit.name}</p>
                                  <p className="text-[10px] text-slate-600 mt-0.5">غير مثبتة في هذا المنفذ</p>
                                </div>
                              </div>
                            );
                          }

                          const warnColor = unit.water_level <= 15 
                            ? 'border-red-500/40 bg-red-950/5' 
                            : unit.water_level <= 30 
                            ? 'border-amber-500/30' 
                            : '';

                          return (
                            <div key={unit.id} className={`${themeClasses.cardBg} rounded-2xl border ${warnColor} overflow-hidden shadow-sm hover:shadow-md transition-all`}>
                              {/* Card Header */}
                              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-2 h-2 rounded-full ${isCleaning ? 'bg-cyan-400 animate-pulse' : isReturning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                  <span className={`text-sm font-black ${themeClasses.titleText}`}>{unit.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StateBadge state={unit.state} />
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="flex items-center justify-between px-4 pb-4 gap-4">
                                <div className="flex items-center gap-3">
                                  <WaterRing level={unit.water_level} />
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">مستوى المياه</span>
                                    <span className={`text-[11px] font-bold ${unit.water_level <= 15 ? 'text-red-400' : unit.water_level <= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {unit.water_level > 50 ? 'ممتاز' : unit.water_level > 20 ? 'منخفض' : 'ناقص جداً!'}
                                    </span>
                                  </div>
                                </div>

                                {/* Play / Stop / Drawer Controls */}
                                <div className="flex items-center gap-2">
                                  {/* Start Clean (Play) */}
                                  <button
                                    onClick={() => sendCmd(ctrl.id, unit.id, 'clean')}
                                    disabled={cmdLoading[unit.id] || isActive || unit.water_level < 15}
                                    title="بدء التنظيف"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-90"
                                  >
                                    {cmdLoading[unit.id] && isActive ? (
                                      <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                      <Play size={15} fill="currentColor" />
                                    )}
                                  </button>

                                  {/* Stop Clean (Stop) */}
                                  <button
                                    onClick={() => sendCmd(ctrl.id, unit.id, 'stop')}
                                    disabled={cmdLoading[unit.id] || isIdle}
                                    title="إيقاف طارئ"
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                                      isIdle 
                                        ? 'bg-slate-800/10 text-slate-600 border-slate-800/20' 
                                        : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:bg-red-500 hover:text-white'
                                    }`}
                                  >
                                    <Square size={14} fill="currentColor" />
                                  </button>

                                  {/* Advanced Details Button */}
                                  <button
                                    onClick={() => setDetailUnit({ unit, controllerId: ctrl.id })}
                                    title="تفاصيل التحكم والجداول"
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                                      isLightTheme 
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                                        : 'bg-slate-800/40 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                                    }`}
                                  >
                                    <ChevronLeft size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}

          {/* ─── LOGS VIEW ─── */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h1 className={`text-lg font-black ${themeClasses.titleText}`}>السجلات والعمليات التاريخية</h1>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Search input */}
                <input
                  type="text"
                  placeholder="ابحث باسم الوحدة..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2 text-xs font-bold focus:outline-none border ${themeClasses.inputBg}`}
                />
                
                {/* Status Filters */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'completed', label: 'مكتمل' },
                    { id: 'stopped', label: 'موقوف' },
                    { id: 'water_low', label: 'نقص المياه' },
                    { id: 'alert_error', label: 'تنبيهات/أخطاء' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setLogFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        logFilter === f.id
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                          : isLightTheme 
                          ? 'border-slate-300 text-slate-600 bg-white hover:border-slate-400' 
                          : 'border-slate-800 text-slate-400 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs List */}
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={24} className="text-cyan-500 animate-spin" />
                  <p className="text-slate-500 text-xs">جاري تحميل السجلات...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <p className="text-center text-slate-600 text-xs py-16">لا توجد سجلات مطابقة للبحث أو الفلترة</p>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map(log => {
                    const ok = log.status === 'CLEANING_DONE';
                    const isWaterLow = log.status === 'WATER_LOW';
                    return (
                      <div key={log.id} className={`${themeClasses.cardBg} rounded-2xl p-4 border flex items-start gap-3.5 shadow-sm`}>
                        <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          ok 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                            : isWaterLow 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' 
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                        }`}>
                          {ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-black ${themeClasses.titleText}`}>{log.unitName}</h4>
                            <span className="text-[10px] text-slate-500">{formatDate(log.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            الحالة: <span className="font-bold text-slate-300">
                              {ok ? 'اكتمل التنظيف بنجاح' : log.status === 'STOPPED' ? 'إيقاف يدوي طارئ' : log.status === 'WATER_LOW' ? 'توقف بسبب نقص المياه' : log.status.replace(/_/g, ' ')}
                            </span>
                          </p>
                          <div className="flex gap-4 mt-2">
                            {log.duration_seconds != null && (
                              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <Clock size={11} /> {formatTime(log.duration_seconds)}
                              </span>
                            )}
                            {log.water_level_start != null && (
                              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <Droplets size={11} /> {log.water_level_start}% ← {log.water_level_end}%
                              </span>
                            )}
                            <span className="text-[10px] text-slate-600 flex items-center gap-1">
                              <Zap size={11} /> {log.triggered_by === 'schedule' ? 'تلقائي (جدول)' : 'يدوي (مستخدم/متحكم)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── PROFILE VIEW ─── */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h1 className={`text-lg font-black ${themeClasses.titleText}`}>الملف الشخصي والإعدادات</h1>

              {/* Profile Details Card */}
              <section className={`${themeClasses.cardBg} rounded-2xl p-5 border shadow-sm`}>
                <h3 className={`text-xs font-black tracking-wider uppercase mb-4 ${themeClasses.descText}`}>بيانات المستخدم</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-900/25">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className={`text-sm font-black ${themeClasses.titleText}`}>{user.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">@{user.username}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {user.role === 'ADMIN' ? 'مدير النظام' : 'مستخدم'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Theme Preference Settings */}
              <section className={`${themeClasses.cardBg} rounded-2xl p-5 border shadow-sm space-y-4`}>
                <h3 className={`text-xs font-black tracking-wider uppercase ${themeClasses.descText}`}>تفضيل المظهر</h3>
                <div className="flex rounded-xl overflow-hidden border border-slate-700 max-w-xs">
                  <button
                    onClick={() => toggleTheme('dark')}
                    className={`flex-1 py-2 text-xs font-bold transition-all ${
                      !isLightTheme ? 'bg-cyan-500/20 text-cyan-400 font-black' : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    مظلم (أزرق داكن)
                  </button>
                  <button
                    onClick={() => toggleTheme('light')}
                    className={`flex-1 py-2 text-xs font-bold transition-all ${
                      isLightTheme ? 'bg-cyan-50 text-cyan-600 font-black' : 'text-slate-500 hover:text-slate-300 bg-transparent'
                    }`}
                  >
                    مضيء
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  يتم حفظ تفضيل المظهر تلقائياً على هذا المتصفح. المظهر الافتراضي هو المظلم الفاخر.
                </p>
              </section>

              {/* Logout Area */}
              <section className="flex gap-3">
                {user.role === 'ADMIN' && onNavigateToAdmin && (
                  <button
                    onClick={onNavigateToAdmin}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-all active:scale-95 shadow-sm"
                  >
                    <Shield size={16} />
                    لوحة التحكم بالإدارة
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-950/20"
                >
                  <LogOut size={16} />
                  تسجيل الخروج من الحساب
                </button>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ─── ADVANCED DETAILS DRAWER (Slides in from LEFT / BOTTOM) ─── */}
      {detailUnit && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setDetailUnit(null)}
          />
          {/* Slide drawer container */}
          <div
            className={`fixed top-0 bottom-0 left-0 w-full md:w-[480px] bg-[#0c1322] border-r border-slate-800/60 z-50 p-5 shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 overflow-y-auto ${
              isLightTheme ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#0c1322] text-slate-100 border-slate-800/60'
            }`}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5">
              <button
                onClick={() => setDetailUnit(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="text-center">
                <h2 className="text-sm font-black">{detailUnit.unit.name}</h2>
                <div className="mt-1">
                  <StateBadge state={detailUnit.unit.state} />
                </div>
              </div>
              <div className="w-10" /> {/* Spacer to align title center */}
            </div>

            <div className="space-y-6">
              {/* Water Gauge display in Drawer */}
              <div className={`${themeClasses.cardBg} p-4 rounded-xl border flex items-center justify-between`}>
                <div>
                  <span className="text-[10px] text-slate-500 block">منفذ التوصيل</span>
                  <span className="text-xs font-bold">Port Number: {detailUnit.unit.port_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-cyan-400" />
                  <span className="text-sm font-black">{detailUnit.unit.water_level}% ماء</span>
                </div>
              </div>

              {/* Manual Stepper & Pump Controls */}
              {(() => {
                const ctrl = controllers.find(c => c.id === detailUnit.controllerId);
                const isOnline = ctrl?.status === 'online';
                
                return (
                  <section className="space-y-3">
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">
                      {isOnline ? "التحكم اليدوي المباشر (وضع المحاكاة)" : "التحكم اليدوي المباشر"}
                    </h3>
                    
                    {isOnline && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        تنبيه: هذه المفاتيح تحاكي حركة المحركات والمضخة في الواجهة فقط لعدم اتصال الهاردوير الفيزيائي في بيئة التطوير.
                      </p>
                    )}

                    {/* Directional control panel */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* FWD button */}
                      <button
                        onClick={() => toggleManualMotor(detailUnit.unit.id, 'FWD')}
                        disabled={!isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                          !isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'
                            ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/10 text-slate-600'
                            : getManualState(detailUnit.unit.id).motor === 'FWD'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10 font-black'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <ArrowRight size={20} />
                        <span className="text-[10px] font-bold">للأمام FWD</span>
                      </button>

                      {/* BWD button */}
                      <button
                        onClick={() => toggleManualMotor(detailUnit.unit.id, 'BWD')}
                        disabled={!isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                          !isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'
                            ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/10 text-slate-600'
                            : getManualState(detailUnit.unit.id).motor === 'BWD'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-lg shadow-amber-500/10 font-black'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <ArrowLeft size={20} />
                        <span className="text-[10px] font-bold">للخلف BWD</span>
                      </button>

                      {/* Pump button */}
                      <button
                        onClick={() => toggleManualPump(detailUnit.unit.id)}
                        disabled={!isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                          !isOnline || detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME'
                            ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/10 text-slate-600'
                            : getManualState(detailUnit.unit.id).pump
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-lg shadow-blue-500/10 font-black'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <Droplets size={20} />
                        <span className="text-[10px] font-bold">المضخة Pump</span>
                      </button>
                    </div>

                    {/* Status Readout */}
                    <div className={`p-3 rounded-xl border text-[11px] font-bold flex items-center justify-between ${
                      isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/60 border-slate-800/60'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getManualState(detailUnit.unit.id).motor !== 'IDLE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>حالة المحرك: {getManualState(detailUnit.unit.id).motor === 'FWD' ? 'يتحرك للأمام' : getManualState(detailUnit.unit.id).motor === 'BWD' ? 'يتحرك للخلف' : 'متوقف'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getManualState(detailUnit.unit.id).pump ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>المضخة: {getManualState(detailUnit.unit.id).pump ? 'تعمل' : 'موقوفة'}</span>
                      </div>
                    </div>

                    {/* Offline helper warning message */}
                    {!isOnline && (
                      <p className="text-[10px] text-red-400 bg-red-950/15 p-2 rounded-lg border border-red-900/30">
                        ⚠️ المتحكم غير متصل بالإنترنت. لا يمكن تفعيل وضع المحاكاة أو التحكم اليدوي.
                      </p>
                    )}

                    {/* Warning/Info text */}
                    {isOnline && (detailUnit.unit.state === 'CLEANING' || detailUnit.unit.state === 'RETURNING_HOME') && (
                      <p className="text-[10px] text-red-400 bg-red-950/15 p-2 rounded-lg border border-red-900/30">
                        ⚠️ يتم تعطيل أزرار التحكم اليدوي المباشر أثناء جريان دورة التنظيف أو عودة الجهاز التلقائية لمنع حدوث التضارب في حركة المحركات والمضخات.
                      </p>
                    )}
                  </section>
                );
              })()}

              {/* Schedules Manager */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">إدارة الجداول الزمنية</h3>
                  {!showAddScheduleModal && (
                    <button
                      onClick={() => setShowAddScheduleModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-lg text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
                    >
                      <Plus size={12} />
                      جدول جديد
                    </button>
                  )}
                </div>

                {/* Add Schedule Modal Form inline overlay style */}
                {showAddScheduleModal && (
                  <div className={`p-4 rounded-xl border space-y-4 ${
                    isLightTheme ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/80 border-slate-700'
                  }`}>
                    <h4 className="text-xs font-black">إضافة موعد تنظيف تلقائي</h4>
                    
                    {/* Sched Type selector */}
                    <div className="flex rounded-lg overflow-hidden border border-slate-700">
                      <button
                        onClick={() => setSchedType('weekly')}
                        className={`flex-1 py-1.5 text-[10px] font-bold transition-all ${
                          schedType === 'weekly' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 bg-transparent'
                        }`}
                      >
                        تكرار أسبوعي
                      </button>
                      <button
                        onClick={() => setSchedType('once')}
                        className={`flex-1 py-1.5 text-[10px] font-bold transition-all ${
                          schedType === 'once' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 bg-transparent'
                        }`}
                      >
                        مرة واحدة
                      </button>
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">وقت التنظيف</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={e => setNewTime(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-bold focus:outline-none border ${themeClasses.inputBg}`}
                      />
                    </div>

                    {/* Weekly Days selection */}
                    {schedType === 'weekly' ? (
                      <div>
                        <label className="text-[10px] text-slate-400 mb-2 block">اختر أيام التكرار</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {DAY_NAMES.map((d, idx) => {
                            const selected = selDays.includes(idx);
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleDay(idx)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                  selected
                                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                                    : 'border-slate-700 text-slate-500 hover:border-slate-600 bg-transparent'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Once-off date input */
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">التاريخ المجدول</label>
                        <input
                          type="date"
                          value={specificDate}
                          onChange={e => setSpecificDate(e.target.value)}
                          className={`w-full rounded-lg px-3 py-2 text-xs font-bold focus:outline-none border ${themeClasses.inputBg}`}
                        />
                      </div>
                    )}

                    {/* Form Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddScheduleModal(false)}
                        className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-[10px] font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleAddScheduleSubmit}
                        disabled={addingSchedule}
                        className="flex-1 py-2 rounded-lg bg-gradient-to-l from-cyan-500 to-blue-600 text-white text-[10px] font-bold disabled:opacity-50"
                      >
                        {addingSchedule ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'حفظ الجدول'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Schedules List */}
                {detailsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={16} className="text-cyan-500 animate-spin" />
                  </div>
                ) : schedules.length === 0 ? (
                  <p className="text-slate-600 text-[11px] py-4 text-center">لا توجد جداول زمنية مضافة بعد لهذه الوحدة.</p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map(s => {
                      const days = s.days_of_week ? s.days_of_week.split(',').map(Number) : [];
                      const isActive = s.is_active === 1;
                      return (
                        <div
                          key={s.id}
                          className={`${themeClasses.cardBg} rounded-xl p-3 border flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Active/Inactive dot */}
                            <div className={`w-2 h-8 rounded-full ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                            <div>
                              <p className="text-xs font-black">{s.cleaning_time}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {s.schedule_type === 'once'
                                  ? `مرة واحدة — ${s.specific_date}`
                                  : days.map(d => DAY_NAMES[d]).join(' · ')}
                              </p>
                            </div>
                          </div>

                          {/* Actions (Toggle status & Delete) */}
                          <div className="flex items-center gap-3">
                            {/* Toggle Switch */}
                            <button
                              onClick={() => toggleScheduleActive(s.id)}
                              title={isActive ? 'تعطيل الجدول' : 'تفعيل الجدول'}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? 'bg-cyan-500' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                style={{ transform: isActive ? 'translateX(0px)' : 'translateX(-16px)' }}
                              />
                            </button>

                            {/* Trash/Delete */}
                            <button
                              onClick={() => handleDeleteSchedule(s.id)}
                              title="حذف الجدول"
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Unit History timeline */}
              <section className="space-y-3 pb-8">
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-500">سجل العمليات الأخير</h3>
                {detailsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={16} className="text-cyan-500 animate-spin" />
                  </div>
                ) : detailLogs.length === 0 ? (
                  <p className="text-slate-600 text-[11px] py-4 text-center">لا توجد عمليات مسجلة للوحدة بعد.</p>
                ) : (
                  <div className="relative border-r-2 border-slate-800 pr-4 space-y-4 mr-2">
                    {detailLogs.map(log => {
                      const ok = log.status === 'CLEANING_DONE';
                      const isWaterLow = log.status === 'WATER_LOW';
                      return (
                        <div key={log.id} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                            ok 
                              ? 'bg-emerald-500 border-slate-950' 
                              : isWaterLow 
                              ? 'bg-amber-500 border-slate-950' 
                              : 'bg-red-500 border-slate-950'
                          }`} />
                          
                          {/* Content */}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black">
                                {ok ? 'اكتمل بنجاح' : log.status === 'STOPPED' ? 'إيقاف طارئ' : log.status === 'WATER_LOW' ? 'نقص مياه' : log.status}
                              </span>
                              <span className="text-[9px] text-slate-500">{formatDate(log.created_at)}</span>
                            </div>
                            <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                              {log.duration_seconds && (
                                <span>المستغرق: {formatTime(log.duration_seconds)}</span>
                              )}
                              {log.water_level_start != null && (
                                <span>الماء: {log.water_level_start}% → {log.water_level_end}%</span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-600 mt-0.5">
                              المشغل: {log.triggered_by === 'schedule' ? 'الجدولة التلقائية' : 'التشغيل اليدوي'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
