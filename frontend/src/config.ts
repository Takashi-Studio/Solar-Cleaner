const rawApiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

// ترقية الرابط تلقائياً لـ HTTPS إذا كانت الصفحة تعمل بـ HTTPS لمنع مشكلة Mixed Content، باستثناء localhost
export const API_URL = typeof window !== 'undefined' && window.location.protocol === 'https:' && !rawApiUrl.includes('localhost')
  ? rawApiUrl.replace(/^http:/, 'https:')
  : rawApiUrl;
