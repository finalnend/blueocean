/**
 * WFS Client - 通用 WFS (Web Feature Service) 客戶端
 * 支援 NPI (澳洲) 和 SPREP (太平洋) 等 GeoServer WFS 服務
 */
import axios from 'axios';

/**
 * WFS 客戶端類別
 */
export class WFSClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.version = options.version || '2.0.0';
    this.timeout = options.timeout || 60000;
    this.defaultOutputFormat = options.outputFormat || 'application/json';
  }

  /**
   * 取得服務能力（列出可用圖層）
   */
  async getCapabilities() {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          service: 'WFS',
          version: this.version,
          request: 'GetCapabilities'
        },
        timeout: this.timeout,
        responseType: 'text'
      });

      // 解析 XML 取得圖層列表（簡化版）
      const layerMatches = response.data.match(/<Name>([^<]+)<\/Name>/g) || [];
      const layers = layerMatches
        .map(m => m.replace(/<\/?Name>/g, ''))
        .filter(name => !name.includes(':') || name.split(':').length === 2);

      return {
        success: true,
        version: this.version,
        layers: [...new Set(layers)]
      };
    } catch (error) {
      console.error(`[WFS] GetCapabilities failed: ${error.message}`);
      return { success: false, error: error.message, layers: [] };
    }
  }

  /**
   * 取得圖層欄位結構
   */
  async describeFeatureType(typeName) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          service: 'WFS',
          version: this.version,
          request: 'DescribeFeatureType',
          typeName: typeName
        },
        timeout: this.timeout,
        responseType: 'text'
      });

      // 簡化解析：取得欄位名稱
      const elementMatches = response.data.match(/name="([^"]+)"/g) || [];
      const fields = elementMatches
        .map(m => m.replace(/name="|"/g, ''))
        .filter(name => !name.includes('gml') && !name.includes('xsd'));

      return {
        success: true,
        typeName,
        fields: [...new Set(fields)]
      };
    } catch (error) {
      console.error(`[WFS] DescribeFeatureType failed: ${error.message}`);
      return { success: false, error: error.message, fields: [] };
    }
  }

  /**
   * 取得圖層資料（GeoJSON）
   */
  async getFeatures(typeName, options = {}) {
    const {
      bbox,
      count = 1000,
      startIndex = 0,
      cqlFilter,
      srsName = 'EPSG:4326'
    } = options;

    const params = {
      service: 'WFS',
      version: this.version,
      request: 'GetFeature',
      typeName: typeName,
      outputFormat: this.defaultOutputFormat,
      count: count,
      startIndex: startIndex,
      srsName: srsName
    };

    if (bbox) {
      params.bbox = Array.isArray(bbox) ? bbox.join(',') : bbox;
    }

    if (cqlFilter) {
      params.CQL_FILTER = cqlFilter;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout
      });

      // 處理 GeoJSON 回應
      if (response.data?.type === 'FeatureCollection') {
        return {
          success: true,
          typeName,
          count: response.data.features?.length || 0,
          features: response.data.features || []
        };
      }

      // 處理其他格式
      return {
        success: true,
        typeName,
        data: response.data
      };
    } catch (error) {
      console.error(`[WFS] GetFeature failed: ${error.message}`);
      return { success: false, error: error.message, features: [] };
    }
  }

  /**
   * 分頁取得所有資料
   */
  async getAllFeatures(typeName, options = {}) {
    const allFeatures = [];
    let startIndex = 0;
    const count = options.count || 1000;
    const maxFeatures = options.maxFeatures || 10000;
    let hasMore = true;

    while (hasMore && allFeatures.length < maxFeatures) {
      const result = await this.getFeatures(typeName, {
        ...options,
        count,
        startIndex
      });

      if (!result.success || !result.features?.length) {
        hasMore = false;
      } else {
        allFeatures.push(...result.features);
        startIndex += count;

        if (result.features.length < count) {
          hasMore = false;
        }

        // 延遲避免過度請求
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      success: true,
      typeName,
      count: allFeatures.length,
      features: allFeatures
    };
  }
}

/**
 * 從 GeoJSON Feature 取得座標
 */
export function getFeatureCoordinates(feature) {
  if (!feature?.geometry) return null;

  const { type, coordinates } = feature.geometry;

  switch (type) {
    case 'Point':
      return { lng: coordinates[0], lat: coordinates[1] };
    
    case 'MultiPoint':
      // 取第一個點
      return coordinates[0] 
        ? { lng: coordinates[0][0], lat: coordinates[0][1] }
        : null;
    
    case 'LineString':
      // 取中點
      const midIdx = Math.floor(coordinates.length / 2);
      return { lng: coordinates[midIdx][0], lat: coordinates[midIdx][1] };
    
    case 'Polygon':
    case 'MultiPolygon':
      // 計算 centroid（簡化版：取 bbox 中心）
      return calculateCentroid(coordinates, type);
    
    default:
      return null;
  }
}

/**
 * 計算多邊形 centroid（簡化版）
 */
function calculateCentroid(coordinates, type) {
  let allCoords = [];

  if (type === 'Polygon') {
    allCoords = coordinates[0] || [];
  } else if (type === 'MultiPolygon') {
    coordinates.forEach(poly => {
      if (poly[0]) allCoords.push(...poly[0]);
    });
  }

  if (allCoords.length === 0) return null;

  let sumLng = 0, sumLat = 0;
  allCoords.forEach(coord => {
    sumLng += coord[0];
    sumLat += coord[1];
  });

  return {
    lng: sumLng / allCoords.length,
    lat: sumLat / allCoords.length
  };
}

export default WFSClient;
