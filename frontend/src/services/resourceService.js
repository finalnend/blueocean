import api from './api';

// 取得資源列表
export const getResources = async (params = {}) => {
  try {
    const response = await api.get('/api/resources', { params });
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得單一資源
export const getResourceById = async (id) => {
  try {
    const response = await api.get(`/api/resources/${id}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得資源類型
export const getResourceTypes = async () => {
  try {
    const response = await api.get('/api/resources/types');
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得熱門標籤
export const getPopularTags = async () => {
  try {
    const response = await api.get('/api/resources/tags');
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  getResources,
  getResourceById,
  getResourceTypes,
  getPopularTags,
};
