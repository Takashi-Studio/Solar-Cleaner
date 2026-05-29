// تحديد رابط الـ API تلقائياً بناءً على مكان التشغيل
// على السيرفر الفعلي سيبحث عن المتغير البيئي VITE_API_URL، وفي التطوير المحلي سيعتمد على localhost:5000
export const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';
