import {
  openAQService,
  marineService,
  plasticWatchService,
  pppService
} from '../services/trackerApiService.js';
import { queryMOENVWater } from '../services/moenvService.js';
import { queryNPIEmissions } from '../services/npiService.js';
import { querySPREPLayer } from '../services/sprepService.js';

/**
 * 資料來源清單
 * GET /api/tracker/sources
 */
export function getTrackerSources(req, res) {
  const sources = [
    // ========== 既有來源 ==========
    {
      name: 'Our World in Data',
      type: '塑膠廢棄物 (全球)',
      region: 'Global',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://ourworldindata.org/grapher/plastic-waste-generation-total.csv',
      notes: '已內建定時同步，資料來源開放且免金鑰'
    },
    {
      name: 'NOAA NCEI Microplastics',
      type: '微塑膠分布 (全球)',
      region: 'Global',
      status: 'available',
      auth: '不需授權',
      endpoint: 'ArcGIS FeatureServer',
      notes: '已內建定時同步'
    },
    {
      name: 'Global Plastic Watch',
      type: '塑膠熱點 (bbox)',
      region: 'Global',
      status: process.env.GPW_API_TOKEN ? 'available' : 'requires_key',
      auth: process.env.GPW_API_TOKEN ? '已設定 GPW_API_TOKEN' : '需申請 Token',
      endpoint: 'https://api.globalplasticwatch.org/plastic-sites?bbox=...&min_area=...',
      notes: '官方需帳號/Token；未設定金鑰時前端標示為待啟用'
    },
    {
      name: 'Copernicus Marine Service (CMEMS)',
      type: '海況（SST/洋流/氯葉素）',
      region: 'Global',
      status: process.env.COPERNICUS_API_KEY ? 'available' : 'requires_key',
      auth: process.env.COPERNICUS_API_KEY ? '已設定 COPERNICUS_API_KEY' : '需註冊並生成機器 Token',
      endpoint: 'WMS/OGC / motuclient',
      notes: '適合後續漂移/海況分析；需免費註冊後取得 API Key'
    },
    // ========== 歐美來源 ==========
    {
      name: 'Water Quality Portal (WQP)',
      type: '近岸水質監測',
      region: 'North America',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://www.waterqualitydata.us/data/Result/search',
      notes: '美國近岸/河口水質資料，已內建定時同步'
    },
    {
      name: 'EPA ECHO',
      type: '污染源設施',
      region: 'North America',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://echodata.epa.gov/echo/cwa_rest_services',
      notes: '美國 NPDES 許可設施，已內建定時同步'
    },
    {
      name: 'EMODnet Chemistry',
      type: '海洋化學監測',
      region: 'Europe',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://erddap.emodnet-chemistry.eu/erddap',
      notes: '歐洲海域化學/污染監測，已內建定時同步'
    },
    {
      name: 'ICES DOME',
      type: '海洋污染物監測',
      region: 'Europe',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://dome.ices.dk/api',
      notes: '歐洲海水/沉積物/生物體污染物，已內建定時同步'
    },
    // ========== 亞太來源 ==========
    {
      name: 'MOENV (TW)',
      type: '水質監測',
      region: 'Asia-Pacific (Taiwan)',
      status: process.env.MOENV_API_KEY ? 'available' : 'requires_key',
      auth: process.env.MOENV_API_KEY ? '已設定 MOENV_API_KEY' : '需申請 API Key',
      endpoint: 'https://data.moenv.gov.tw/api/v2/{DataID}',
      notes: '台灣環境部開放資料，需註冊取得 API Key'
    },
    {
      name: 'NPI (AU)',
      type: '污染排放清冊',
      region: 'Asia-Pacific (Australia)',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://data.gov.au/geoserver/npi/wfs',
      notes: '澳洲國家污染物清冊 WFS，已內建定時同步'
    },
    {
      name: 'SPREP (Pacific)',
      type: '海洋/海岸環境',
      region: 'Asia-Pacific (Pacific Islands)',
      status: 'available',
      auth: '不需授權',
      endpoint: 'https://geoserver.sprep.org/geoserver/pipap/ows',
      notes: '太平洋島國環境資料 WFS，已內建定時同步'
    }
  ];

  res.json({
    success: true,
    sources
  });
}

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


// ========== 亞太來源 API 端點 ==========

/**
 * 台灣 MOENV 水質資料查詢
 * GET /api/tracker/moenv-water?dataId=wqx_p_10&yearMonth=2024_01&limit=100
 */
export async function getMOENVWater(req, res) {
  try {
    const { dataId, yearMonth, limit = 100 } = req.query;

    if (!dataId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: dataId (例如 wqx_p_10)'
      });
    }

    const result = await queryMOENVWater({
      dataId,
      yearMonth,
      limit: parseInt(limit)
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('getMOENVWater error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得 MOENV 資料時發生錯誤'
    });
  }
}

/**
 * 澳洲 NPI 排放資料查詢
 * GET /api/tracker/npi-emissions?bbox=140,-40,155,-25&substance=Mercury&year=2022&limit=100
 */
export async function getNPIEmissions(req, res) {
  try {
    const { bbox, substance, year, limit = 100 } = req.query;

    const result = await queryNPIEmissions({
      bbox,
      substance,
      year,
      limit: parseInt(limit)
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('getNPIEmissions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得 NPI 資料時發生錯誤'
    });
  }
}

/**
 * 太平洋 SPREP 圖層資料查詢
 * GET /api/tracker/sprep-layer?layer=marine_protected&bbox=160,-20,180,0&country=Fiji&limit=100
 */
export async function getSPREPLayer(req, res) {
  try {
    const { layer, bbox, country, limit = 100 } = req.query;

    if (!layer) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: layer (例如 marine_protected, coral_reefs, coastal_areas)'
      });
    }

    const result = await querySPREPLayer({
      layer,
      bbox,
      country,
      limit: parseInt(limit)
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('getSPREPLayer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '取得 SPREP 資料時發生錯誤'
    });
  }
}
