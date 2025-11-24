import api from './api';

// 取得污染摘要
export const getPollutionSummary = async (params = {}) => {
  try {
    const response = await api.get('/api/pollution/summary', { params });
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得地圖資料
export const getMapData = async (params = {}) => {
  try {
    const response = await api.get('/api/pollution/map', { params });
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得時間序列資料
export const getTimeSeries = async (params = {}) => {
  try {
    const response = await api.get('/api/pollution/timeseries', { params });
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得污染類型列表
export const getPollutionTypes = async () => {
  try {
    const response = await api.get('/api/pollution/types');
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  getPollutionSummary,
  getMapData,
  getTimeSeries,
  getPollutionTypes,
};
