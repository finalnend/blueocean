import api from './api';

export const getOceanStats = async () => {
  return api.get('/api/oceans/stats');
};

export default { getOceanStats };

