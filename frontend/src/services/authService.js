import api from './api';

// 註冊
export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// 登入
export const login = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// 登出
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// 取得當前使用者
export const getMe = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response;
  } catch (error) {
    throw error;
  }
};

// 更新個人資料
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/auth/profile', profileData);
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// 修改密碼
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/api/auth/password', passwordData);
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得儲存的 token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 取得儲存的使用者資訊
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 檢查是否已登入
export const isAuthenticated = () => {
  return !!getToken();
};

export default {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  getToken,
  getCurrentUser,
  isAuthenticated
};
