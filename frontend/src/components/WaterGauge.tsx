import React from 'react';

interface WaterGaugeProps {
  percentage: number;
}

export const WaterGauge: React.FC<WaterGaugeProps> = ({ percentage }) => {
  // حساب موضع موجة الماء: 100% يعني top = 0%، 0% يعني top = 100%
  const waveTop = `${100 - percentage}%`;

  // تحديد اللون بناءً على النسبة
  const getStatusColor = () => {
    if (percentage > 50) return 'text-cyan-400';
    if (percentage > 15) return 'text-yellow-400 animate-pulse';
    return 'text-red-500 animate-bounce';
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-2xl shadow-xl transition-all duration-300 hover:scale-105">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider uppercase">مستوى مياه الخزان</h3>
      
      {/* حاوية الخزان المائي التفاعلي */}
      <div className="water-wave-container relative flex items-center justify-center">
        {/* الطبقة المائية الأولى */}
        <div 
          className="water-wave-element" 
          style={{ top: waveTop }}
        />
        {/* الطبقة المائية الثانية المظللة لتعميق التأثير الحركي */}
        <div 
          className="water-wave-element-second" 
          style={{ top: waveTop }}
        />
        
        {/* النص الذي يظهر في المنتصف بوضوح */}
        <div className="relative z-10 text-center select-none">
          <span className="text-4xl font-extrabold text-white drop-shadow-md">
            {percentage}%
          </span>
        </div>
      </div>

      {/* الحالة اللفظية التنبيهية */}
      <div className="mt-4 text-center">
        <span className={`text-sm font-bold ${getStatusColor()}`}>
          {percentage > 50 ? 'مستوى ممتاز' : percentage > 15 ? 'مستوى منخفض (انتبه)' : 'خطر: نفاد المياه!'}
        </span>
      </div>
    </div>
  );
};
