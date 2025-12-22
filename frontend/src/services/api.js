import axios from 'axios';

// 生產環境使用相對路徑（通過 nginx 代理），開發環境使用完整 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:5875');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攝取器
api.interceptors.request.use(
  (config) => {
    // 自動附加 JWT token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '請求失敗';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
