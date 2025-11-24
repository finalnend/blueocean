import getDatabase from '../database/db.js';

const db = getDatabase();

// 取得污染摘要
export const getPollutionSummary = (req, res) => {
  try {
    const { region = 'global', type = 'plastic', year } = req.query;
    
    let query = `
      SELECT 
        type,
        AVG(value) as avg_value,
        MAX(value) as max_value,
        MIN(value) as min_value,
        COUNT(*) as data_points,
        unit,
        source
      FROM pollution_data
      WHERE type = ?
    `;
    
    const params = [type];
    
    if (year) {
      query += ` AND strftime('%Y', recorded_at) = ?`;
      params.push(year);
    }
    
    if (region !== 'global') {
      query += ` AND json_extract(meta, '$.region') LIKE ?`;
      params.push(`%${region}%`);
    }
    
    query += ` GROUP BY type, unit, source`;
    
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    
    if (!result) {
      return res.json({
        region,
        type,
        year: year || 'latest',
        message: '目前無資料',
        value: 0,
        unit: 'kg/km²'
      });
    }
    
    res.json({
      region,
      type,
      year: year || 'latest',
      average: result.avg_value,
      max: result.max_value,
      min: result.min_value,
      unit: result.unit,
      source: result.source,
      dataPoints: result.data_points
    });
  } catch (error) {
    console.error('Error in getPollutionSummary:', error);
    res.status(500).json({ error: '取得污染摘要失敗' });
  }
};

// 取得地圖資料點
export const getMapData = (req, res) => {
  try {
    const { type = 'plastic', from, to, bbox } = req.query;
    
    let query = `
      SELECT id, lat, lng, value, unit, recorded_at, meta
      FROM pollution_data
      WHERE type = ?
    `;
    
    const params = [type];
    
    if (from && to) {
      query += ` AND recorded_at BETWEEN ? AND ?`;
      params.push(from, to);
    }
    
    // bbox 格式: "minLat,minLng,maxLat,maxLng"
    if (bbox) {
      const [minLat, minLng, maxLat, maxLng] = bbox.split(',').map(Number);
      query += ` AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`;
      params.push(minLat, maxLat, minLng, maxLng);
    }
    
    query += ` LIMIT 1000`; // 限制回傳數量
    
    const stmt = db.prepare(query);
    const data = stmt.all(...params);
    
    // 解析 meta JSON
    const formattedData = data.map(row => ({
      ...row,
      meta: row.meta ? JSON.parse(row.meta) : {}
    }));
    
    res.json({
      type: 'FeatureCollection',
      features: formattedData.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          id: point.id,
          value: point.value,
          unit: point.unit,
          recordedAt: point.recorded_at,
          ...point.meta
        }
      }))
    });
  } catch (error) {
    console.error('Error in getMapData:', error);
    res.status(500).json({ error: '取得地圖資料失敗' });
  }
};

// 取得時間序列資料
export const getTimeSeries = (req, res) => {
  try {
    const { type = 'plastic', region, lat, lng, radius = 5 } = req.query;
    
    let query = `
      SELECT 
        strftime('%Y-%m', recorded_at) as month,
        AVG(value) as avg_value,
        COUNT(*) as count
      FROM pollution_data
      WHERE type = ?
    `;
    
    const params = [type];
    
    if (region) {
      query += ` AND json_extract(meta, '$.region') LIKE ?`;
      params.push(`%${region}%`);
    } else if (lat && lng) {
      // 簡化的距離計算（僅適用於小範圍）
      query += ` AND (
        (lat BETWEEN ? AND ?) AND
        (lng BETWEEN ? AND ?)
      )`;
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusNum = parseFloat(radius);
      params.push(
        latNum - radiusNum,
        latNum + radiusNum,
        lngNum - radiusNum,
        lngNum + radiusNum
      );
    }
    
    query += ` GROUP BY month ORDER BY month`;
    
    const stmt = db.prepare(query);
    const data = stmt.all(...params);
    
    res.json({
      type,
      region: region || 'custom',
      data: data.map(row => ({
        date: row.month,
        value: row.avg_value,
        count: row.count
      }))
    });
  } catch (error) {
    console.error('Error in getTimeSeries:', error);
    res.status(500).json({ error: '取得時間序列資料失敗' });
  }
};

// 取得污染類型列表
export const getPollutionTypes = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT type, unit
      FROM pollution_data
      ORDER BY type
    `);
    const types = stmt.all();
    
    res.json({ types });
  } catch (error) {
    console.error('Error in getPollutionTypes:', error);
    res.status(500).json({ error: '取得污染類型失敗' });
  }
};
