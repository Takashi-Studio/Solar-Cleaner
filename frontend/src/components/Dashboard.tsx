import React, { useState, useEffect } from 'react';
import { WaterGauge } from './WaterGauge';
import { 
  Cpu, Power, Clock, History, Plus, Trash2, LogOut, 
  Sun, CheckCircle2, AlertTriangle, Play, Square, Loader2 
} from 'lucide-react';
import { API_URL } from '../config';

interface DashboardProps {
  token: string;
  user: { id: number; name: string; email: string };
  onLogout: () => void;
}

interface Device {
  id: string;
  name: string;
  status: string;
  state: string;
  water_level: number;
  last_seen: string;
}

interface Schedule {
  id: number;
  device_id: string;
  cleaning_time: string;
  days_of_week: number[];
  is_active: number;
}

interface CleaningLog {
  id: number;
  device_id: string;
  triggered_by: string;
  status: string;
  water_level_start: number;
  water_level_end: number;
  duration_seconds: number;
  created_at: string;
}

const DAYS_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  // لربط جهاز جديد
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

  // للجدولة
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newTime, setNewTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [addingSchedule, setAddingSchedule] = useState(false);

  // سجلات التنظيف
  const [logs, setLogs] = useState<CleaningLog[]>([]);

  // تحميل الأجهزة
  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setDevices(data);
        if (data.length > 0) {
          // إذا لم يتم تحديد جهاز بعد، نحدد الأول تلقائياً
          if (!selectedDevice) {
            setSelectedDevice(data[0]);
          } else {
            // تحديث حالة الجهاز المختار الحالي بالبيانات الجديدة
            const updated = data.find((d: Device) => d.id === selectedDevice.id);
            if (updated) setSelectedDevice(updated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // تحميل الجداول والسجلات للجهاز المحدد
  const fetchDeviceDetails = async (devId: string) => {
    try {
      // 1. تحميل الجدولة
      const schedRes = await fetch(`${API_URL}/api/devices/${devId}/schedules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const schedData = await schedRes.json();
      if (schedRes.ok) setSchedules(schedData);

      // 2. تحميل السجلات
      const logsRes = await fetch(`${API_URL}/api/devices/${devId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const logsData = await logsRes.json();
      if (logsRes.ok) setLogs(logsData);
    } catch (err) {
      console.error(err);
    }
  };

  // تشغيل الاستعلام الدوري لتحديث البيانات الحية كل 3 ثوانٍ
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => {
      fetchDevices();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedDevice?.id]);

  // جلب التفاصيل الإضافية عند تغيير الجهاز المختار
  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceDetails(selectedDevice.id);
    }
  }, [selectedDevice?.id]);

  // ربط جهاز جديد
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId || !newDeviceName) return;
    setRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: newDeviceId, name: newDeviceName })
      });
      if (res.ok) {
        setNewDeviceId('');
        setNewDeviceName('');
        await fetchDevices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRegistering(false);
    }
  };

  // إرسال أمر تنظيف يدوي
  const triggerClean = async () => {
    if (!selectedDevice) return;
    try {
      await fetch(`${API_URL}/api/devices/${selectedDevice.id}/clean`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // تحديث فوري للحالة
      fetchDevices();
    } catch (err) {
      console.error(err);
    }
  };

  // إرسال إيقاف طوارئ
  const triggerStop = async () => {
    if (!selectedDevice) return;
    try {
      await fetch(`${API_URL}/api/devices/${selectedDevice.id}/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDevices();
    } catch (err) {
      console.error(err);
    }
  };

  // إضافة مؤقت للجدولة
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || selectedDays.length === 0) return;
    setAddingSchedule(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/${selectedDevice.id}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cleaning_time: newTime, days_of_week: selectedDays })
      });
      if (res.ok) {
        setNewTime('08:00');
        setSelectedDays([]);
        fetchDeviceDetails(selectedDevice.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingSchedule(false);
    }
  };

  // حذف مؤقت
  const handleDeleteSchedule = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok && selectedDevice) {
        fetchDeviceDetails(selectedDevice.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // تبديل أيام الأسبوع لتسجيل الجدولة
  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  // تفصيل حالة التشغيل
  const getStateBadge = (state: string) => {
    switch (state) {
      case 'CLEANING':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"><Loader2 size={12} className="animate-spin" /> جاري التنظيف...</span>;
      case 'CLEANING_DONE':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={12} /> تم التنظيف بنجاح</span>;
      case 'WATER_LOW':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-bounce"><AlertTriangle size={12} /> الماء منخفض جداً!</span>;
      case 'STOPPED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Square size={12} /> تم إيقافه</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">في وضع الانتظار (Idle)</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. الشريط العلوي (Navbar) */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl text-white shadow-md">
            <Sun size={24} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide bg-gradient-to-l from-cyan-400 to-white bg-clip-text text-transparent">SOLAR CLEAN SaaS</h1>
            <p className="text-xs text-slate-400">لوحة المراقبة والتحكم بالشبكة</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left hidden md:block">
            <p className="text-sm font-bold text-white">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all text-sm font-semibold"
          >
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* 2. المحتوى الرئيسي */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        
        {/* العمود الجانبي (الأجهزة وإضافة جهاز) - 3 أعمدة */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          {/* صندوق اختيار وتبديل الأجهزة */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-300 tracking-wider uppercase border-b border-slate-800 pb-2">أجهزتك النشطة</h2>
            {devices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">لا توجد أجهزة مسجلة حالياً.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {devices.map(dev => (
                  <button
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-right transition-all ${
                      selectedDevice?.id === dev.id 
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                        : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Cpu size={16} />
                      <div className="text-sm font-bold">{dev.name}</div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${dev.status === 'online' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* صندوق ربط جهاز جديد */}
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 tracking-wider uppercase border-b border-slate-800 pb-2 mb-4">ربط جهاز جديد</h2>
            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">معرف الجهاز (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: solar_cleaner_01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">اسم الجهاز</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الواح المزرعة"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2 bg-slate-800 hover:bg-cyan-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                {registering ? 'جاري الربط...' : <Plus size={16} />}
                <span>إضافة الجهاز</span>
              </button>
            </form>
          </div>
        </section>

        {/* المساحة الرئيسية للتحكم باللوحة - 9 أعمدة */}
        <section className="lg:col-span-9 flex flex-col gap-6">
          {!selectedDevice ? (
            <div className="flex-1 glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center">
              <Sun size={48} className="text-slate-700 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-400">يرجى تسجيل جهاز أو تحديده للبدء</h3>
              <p className="text-sm text-slate-600 mt-2">استخدم صندوق الإضافة بالجانب لربط جهاز التنظيف السحابي الخاص بك</p>
            </div>
          ) : (
            <>
              {/* قسم التحكم المباشر وحالة الجهاز الحية */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. خزان المياه (مؤشر التموج المائي) */}
                <WaterGauge percentage={selectedDevice.water_level} />

                {/* 2. بطاقة التحكم والتشغيل الفوري */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase">التحكم اليدوي</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedDevice.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {selectedDevice.status === 'online' ? 'نشط الآن' : 'غير متصل'}
                      </span>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="text-xs text-slate-500">اسم الجهاز: <span className="text-white font-semibold">{selectedDevice.name}</span></div>
                      <div className="text-xs text-slate-500">المعرف: <code className="text-cyan-400 font-bold bg-slate-900 px-2 py-0.5 rounded">{selectedDevice.id}</code></div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">الحالة الحالية: {getStateBadge(selectedDevice.state)}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      onClick={triggerClean}
                      disabled={selectedDevice.status !== 'online' || selectedDevice.state === 'CLEANING'}
                      className="w-full py-3.5 bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all duration-200 active:scale-95"
                    >
                      <Play size={16} />
                      <span>بدء دورة التنظيف الآن</span>
                    </button>

                    <button
                      onClick={triggerStop}
                      disabled={selectedDevice.status !== 'online' || selectedDevice.state === 'IDLE'}
                      className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-30 disabled:pointer-events-none text-red-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2 border border-red-500/20 transition-all"
                    >
                      <Square size={16} />
                      <span>إيقاف طوارئ فوري</span>
                    </button>
                  </div>
                </div>

                {/* 3. نافذة إعداد المؤقتات والجدولة */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-4 border-b border-slate-800 pb-2">جدولة تنظيف تلقائي</h3>
                    <form onSubmit={handleAddSchedule} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">وقت التنظيف</label>
                        <input
                          type="time"
                          required
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-cyan-500 transition-all"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">الأيام المكررة</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {DAYS_NAMES.map((day, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleDay(idx)}
                              className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                selectedDays.includes(idx)
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-extrabold'
                                  : 'bg-slate-900/30 border-slate-800 text-slate-500'
                              }`}
                            >
                              {day.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={addingSchedule || selectedDays.length === 0}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {addingSchedule ? 'جاري الحفظ...' : <Clock size={14} />}
                        <span>حفظ المؤقت المجدول</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* قسم إدارة الجداول الحالية وسجلات التنظيف */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* قائمة المؤقتات النشطة - 4 أعمدة */}
                <div className="md:col-span-5 glass-panel rounded-2xl p-6 shadow-xl flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Clock size={16} />
                    <span>المؤقتات المجدولة النشطة</span>
                  </h3>
                  {schedules.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-8">لا توجد مؤقتات مجدولة حالياً.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {schedules.map(sched => (
                        <div key={sched.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between text-right">
                          <div>
                            <div className="text-base font-black text-cyan-400">{sched.cleaning_time}</div>
                            <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                              {sched.days_of_week.map(d => (
                                <span key={d} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-semibold">{DAYS_NAMES[d]}</span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSchedule(sched.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* تاريخ العمليات السابقة - 7 أعمدة */}
                <div className="md:col-span-7 glass-panel rounded-2xl p-6 shadow-xl flex flex-col">
                  <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <History size={16} />
                    <span>سجل عمليات التنظيف السابقة</span>
                  </h3>
                  {logs.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-8">لا يوجد سجل عمليات مسجل حتى الآن.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-60 overflow-y-auto pr-1">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="pb-2">الوقت والتاريخ</th>
                            <th className="pb-2">نوع التشغيل</th>
                            <th className="pb-2 text-center">الخزان البدء ← الانتهاء</th>
                            <th className="pb-2 text-center">المدة</th>
                            <th className="pb-2 text-left">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {logs.map(log => (
                            <tr key={log.id} className="text-slate-300 hover:bg-slate-900/10">
                              <td className="py-2.5 font-semibold">{new Date(log.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</td>
                              <td className="py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.triggered_by === 'manual' || log.triggered_by === 'remote' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                  {log.triggered_by === 'manual' || log.triggered_by === 'remote' ? 'يدوي' : 'تلقائي (مؤقت)'}
                                </span>
                              </td>
                              <td className="py-2.5 text-center font-bold text-slate-400">
                                {log.water_level_start !== null ? `${log.water_level_start}% ← ${log.water_level_end}%` : '-'}
                              </td>
                              <td className="py-2.5 text-center font-mono text-slate-400">
                                {log.duration_seconds ? `${log.duration_seconds} ث` : '-'}
                              </td>
                              <td className="py-2.5 text-left">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 
                                  log.status === 'water_low' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {log.status === 'success' ? 'ناجحة' : log.status === 'water_low' ? 'نقص ماء' : 'ملغاة'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </section>

      </main>
    </div>
  );
};
