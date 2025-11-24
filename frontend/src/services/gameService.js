import api from './api';

// 提交遊戲分數
export const submitScore = async (scoreData) => {
  try {
    const response = await api.post('/api/game/score', scoreData);
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得排行榜
export const getLeaderboard = async (params = {}) => {
  try {
    const response = await api.get('/api/game/leaderboard', { params });
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得遊戲統計
export const getGameStats = async () => {
  try {
    const response = await api.get('/api/game/stats');
    return response;
  } catch (error) {
    throw error;
  }
};

// 取得個人最佳紀錄
export const getPersonalBest = async (nickname) => {
  try {
    const response = await api.get(`/api/game/personal/${nickname}`);
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  submitScore,
  getLeaderboard,
  getGameStats,
  getPersonalBest,
};
