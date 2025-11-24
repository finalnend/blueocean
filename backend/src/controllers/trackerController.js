import {
  openAQService,
  marineService,
  plasticWatchService,
  pppService
} from '../services/trackerApiService.js';

/**
 * 空氣品質查詢
 * GET /api/tracker/air-quality?lat=25.0&lng=121.5&radius=10000&parameter=pm25
 */
export async function getAirQuality(req, res) {
  try {
    const { lat, lng, radius = 10000, parameter = 'pm25' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: lat, lng'
      });
    }

    // 將參數名稱轉換為 OpenAQ 的 parameter_id
    const parameterMap = {
      pm25: 2,
      pm10: 1,
      o3: 5,
      no2: 3,
      so2: 4,
      co: 6
    };
    const parameterId = parameterMap[parameter] || 2;

    // 1. 找附近的測站
    const locationsData = await openAQService.findNearbyLocations(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      parameterId
    );

    if (!locationsData.results || locationsData.results.length === 0) {
      return res.json({
        success: true,
        parameter: parameter,
        unit: 'µg/m³',
        sources: [],
        message: '附近沒有找到測站'
      });
    }

    // 2. 取得每個測站的最新數值
    const sources = [];
    for (const location of locationsData.results.slice(0, 3)) {
      const latestData = await openAQService.getLatestMeasurements(location.id);
      
      if (latestData && latestData.results && latestData.results.length > 0) {
        const measurement = latestData.results[0];
        sources.push({
          locationId: location.id,
          name: location.name,
          country: location.country,
          coordinates: {
            lat: location.coordinates.latitude,
            lng: location.coordinates.longitude
          },
          value: measurement.value,
          datetime_utc: measurement.datetime
        });
      }
    }

    res.json({
      success: true,
      parameter: parameter,
      unit: 'µg/m³',
      sources: sources
    });

  } catch (error) {
    console.error('getAirQuality error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得空氣品質資料時發生錯誤'
    });
  }
}

/**
 * 海表溫度（點位查詢）
 * GET /api/tracker/sst?lat=25.0&lng=122.0&past_days=3&forecast_days=4
 */
export async function getSST(req, res) {
  try {
    const {
      lat,
      lng,
      past_days = 3,
      forecast_days = 4
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: lat, lng'
      });
    }

    const marineData = await marineService.getMarineData(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(past_days),
      parseInt(forecast_days)
    );

    // 轉換為統一格式
    const hourly = [];
    if (marineData.hourly && marineData.hourly.time) {
      for (let i = 0; i < marineData.hourly.time.length; i++) {
        hourly.push({
          time: marineData.hourly.time[i],
          sea_surface_temperature_c: marineData.hourly.sea_surface_temperature?.[i] || null,
          wave_height_m: marineData.hourly.wave_height?.[i] || null
        });
      }
    }

    res.json({
      success: true,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      hourly: hourly
    });

  } catch (error) {
    console.error('getSST error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得海表溫度資料時發生錯誤'
    });
  }
}

/**
 * 海面天氣（包含更多參數）
 * GET /api/tracker/marine?lat=25.0&lng=122.0&past_days=3&forecast_days=4
 */
export async function getMarineWeather(req, res) {
  try {
    const {
      lat,
      lng,
      past_days = 3,
      forecast_days = 4
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: lat, lng'
      });
    }

    const marineData = await marineService.getMarineData(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(past_days),
      parseInt(forecast_days)
    );

    // 轉換為完整格式（包含更多海況參數）
    const hourly = [];
    if (marineData.hourly && marineData.hourly.time) {
      for (let i = 0; i < marineData.hourly.time.length; i++) {
        hourly.push({
          time: marineData.hourly.time[i],
          sea_surface_temperature_c: marineData.hourly.sea_surface_temperature?.[i] || null,
          wave_height_m: marineData.hourly.wave_height?.[i] || null,
          ocean_current_velocity_ms: marineData.hourly.ocean_current_velocity?.[i] || null
        });
      }
    }

    res.json({
      success: true,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      },
      hourly: hourly
    });

  } catch (error) {
    console.error('getMarineWeather error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得海面天氣資料時發生錯誤'
    });
  }
}

/**
 * 塑膠熱點查詢
 * GET /api/tracker/plastic-sites?bbox=120,22,125,26&min_area=0
 */
export async function getPlasticSites(req, res) {
  try {
    const { bbox, min_area = 0 } = req.query;

    if (!bbox) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: bbox (格式: minLon,minLat,maxLon,maxLat)'
      });
    }

    const bboxArray = bbox.split(',').map(parseFloat);
    if (bboxArray.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'bbox 格式錯誤，應為: minLon,minLat,maxLon,maxLat'
      });
    }

    const gpwData = await plasticWatchService.getPlasticSites(
      bboxArray,
      parseFloat(min_area)
    );

    // 轉換為統一格式
    const sites = (gpwData.features || []).map(feature => ({
      id: feature.id || feature.properties?.id,
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      },
      area_m2: feature.properties?.area || 0,
      country: feature.properties?.country || 'Unknown',
      confidence: feature.properties?.confidence || 0,
      last_updated: feature.properties?.last_updated || null
    }));

    res.json({
      success: true,
      bbox: bboxArray,
      sites: sites
    });

  } catch (error) {
    console.error('getPlasticSites error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得塑膠熱點資料時發生錯誤'
    });
  }
}

/**
 * 淨灘活動查詢
 * GET /api/tracker/cleanups?bbox=120,22,125,26&from=2024-01-01&to=2024-12-31
 */
export async function getCleanupEvents(req, res) {
  try {
    const { bbox, from, to, limit = 200 } = req.query;

    if (!bbox) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: bbox (格式: minLon,minLat,maxLon,maxLat)'
      });
    }

    const bboxArray = bbox.split(',').map(parseFloat);
    if (bboxArray.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'bbox 格式錯誤，應為: minLon,minLat,maxLon,maxLat'
      });
    }

    const pppData = await pppService.getCleanupEvents(bboxArray, from, to);

    // 轉換為統一格式
    const events = (pppData.features || []).slice(0, parseInt(limit)).map(feature => ({
      id: feature.id || feature.properties?.id,
      name: feature.properties?.name || 'Unknown Event',
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      },
      date: feature.properties?.date || null,
      items_collected: feature.properties?.items_collected || 0,
      plastic_items: feature.properties?.plastic_items || 0
    }));

    res.json({
      success: true,
      bbox: bboxArray,
      events: events
    });

  } catch (error) {
    console.error('getCleanupEvents error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得淨灘活動資料時發生錯誤'
    });
  }
}

/**
 * SST 網格資料（地圖圖層用）
 * GET /api/tracker/sst/grid?bbox=120,22,125,26&date=2025-11-15
 * 注意：這個功能需要配合 NOAA 資料同步排程，目前先返回模擬資料
 */
export async function getSSTGrid(req, res) {
  try {
    const { bbox, date } = req.query;

    if (!bbox) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: bbox'
      });
    }

    const bboxArray = bbox.split(',').map(parseFloat);
    
    // TODO: 從資料庫查詢 SST 網格資料
    // 目前返回提示訊息
    res.json({
      success: true,
      message: 'SST 網格功能需要配合 NOAA 資料同步排程，即將完成',
      date: date || new Date().toISOString().split('T')[0],
      grid: {
        cellSizeDeg: 1,
        cells: []
      }
    });

  } catch (error) {
    console.error('getSSTGrid error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得 SST 網格資料時發生錯誤'
    });
  }
}
