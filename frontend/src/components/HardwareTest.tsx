import React, { useState, useEffect } from 'react';
import { ChevronRight, Droplets, ArrowRight, ArrowLeft, Square, Zap, Loader2, Info } from 'lucide-react';
import { API_URL } from '../config';

interface HardwareTestProps {
  token: string;
  user: { id: number; name: string; username: string; role?: string };
  onNavigateBack: () => void;
}

interface CleaningUnit {
  id: number;
  port_number: number;
  name: string;
  is_installed: boolean;
}

interface Controller {
  id: string;
  name: string;
  status: string;
  units: CleaningUnit[];
}

export const HardwareTest: React.FC<HardwareTestProps> = ({ token, user, onNavigateBack }) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeActions, setActiveActions] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchControllers = async () => {
      try {
        const endpoint = user.role === 'ADMIN' ? `${API_URL}/api/admin/devices` : `${API_URL}/api/controllers`;
        const res = await fetch(endpoint, {
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
    };
    fetchControllers();
  }, [token, user.role]);

  const sendTestCommand = (unitId: number, commandName: string, durationMs: number = 3000) => {
    setActiveActions(prev => ({ ...prev, [unitId]: commandName }));
    
    setTimeout(() => {
      setActiveActions(prev => {
        const newState = { ...prev };
        if (newState[unitId] === commandName) {
          delete newState[unitId];
        }
        return newState;
      });
    }, durationMs);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={onNavigateBack}
          className="p-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            اختبار القطع الفردية (Hardware Test)
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">شاشة محاكاة لاختبار المحركات والمضخات بشكل فردي (للعرض التقديمي)</p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-cyan-950/10 flex items-start gap-3">
          <Info size={20} className="text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-cyan-400">وضع الاختبار المباشر</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              تتيح لك هذه الواجهة اختبار كل قطعة على حدى (محرك يمين، يسار، مضخة ماء) دون تفعيل دورة التنظيف الكاملة. 
              <br/>
              <span className="text-amber-500">ملاحظة:</span> هذه الواجهة تعمل حالياً في وضع المحاكاة (Simulation Mode) لتوضيح الفكرة دون إرسال أوامر حقيقية للأردوينو لتجنب تعارض الكود.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="text-cyan-500 animate-spin" />
          </div>
        ) : controllers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            لا توجد أجهزة متصلة لإجراء الاختبار عليها.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {controllers.map(ctrl => (
              <div key={ctrl.id} className="glass-panel rounded-3xl border border-slate-800/60 overflow-hidden">
                <div className="bg-slate-900/50 px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-white">{ctrl.name}</h2>
                    <span className="text-[10px] text-slate-500 font-mono">{ctrl.id}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${ctrl.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    {ctrl.status === 'online' ? 'متصل بالشبكة' : 'غير متصل'}
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {ctrl.units && ctrl.units.filter(u => u.is_installed).length > 0 ? (
                    ctrl.units.filter(u => u.is_installed).map(unit => {
                      const activeAction = activeActions[unit.id];
                      
                      return (
                        <div key={unit.id} className="bg-slate-950/50 border border-slate-800/40 rounded-2xl p-4">
                          <h3 className="text-sm font-bold text-cyan-400 mb-4">{unit.name}</h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => sendTestCommand(unit.id, 'FWD', 5000)}
                              disabled={!!activeAction && activeAction !== 'FWD'}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                activeAction === 'FWD' 
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50'
                              }`}
                            >
                              <ArrowRight size={20} className={activeAction === 'FWD' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-bold">محرك (يمين)</span>
                            </button>

                            <button 
                              onClick={() => sendTestCommand(unit.id, 'BWD', 5000)}
                              disabled={!!activeAction && activeAction !== 'BWD'}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                activeAction === 'BWD' 
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50'
                              }`}
                            >
                              <ArrowLeft size={20} className={activeAction === 'BWD' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-bold">محرك (يسار)</span>
                            </button>

                            <button 
                              onClick={() => sendTestCommand(unit.id, 'PUMP', 3000)}
                              disabled={!!activeAction && activeAction !== 'PUMP'}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                activeAction === 'PUMP' 
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                  : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50'
                              }`}
                            >
                              <Droplets size={20} className={activeAction === 'PUMP' ? 'animate-bounce' : ''} />
                              <span className="text-xs font-bold">رش ماء (مضخة)</span>
                            </button>

                            <button 
                              onClick={() => sendTestCommand(unit.id, 'STOP', 1000)}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                activeAction === 'STOP' 
                                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                                  : 'bg-slate-900/50 border-slate-700/50 text-red-400/80 hover:bg-red-950/30 hover:border-red-500/50 hover:text-red-400'
                              }`}
                            >
                              <Square size={20} className={activeAction === 'STOP' ? 'animate-pulse' : ''} />
                              <span className="text-xs font-bold">إيقاف المحركات</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">لا توجد وحدات مثبتة في هذا المتحكم.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
