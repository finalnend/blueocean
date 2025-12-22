import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import { getMapData, getPollutionTypes, getTimeSeries } from '../services/pollutionService';
import { getLocationEnvironmentData, getCoordinatesFromMapEvent, getTrackerSources } from '../services/trackerService';
import TimeSeriesChart from '../components/TimeSeriesChart';
import PollutionPieChart from '../components/PollutionPieChart';
import EnvironmentInfoPanel from '../components/EnvironmentInfoPanel';
import DataSourcesPanel from '../components/DataSourcesPanel';

export default function TrackerPage() {
  const { t } = useTranslation();
  const [mapData, setMapData] = useState(null);
  const [selectedType, setSelectedType] = useState('plastic');
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [showCharts, setShowCharts] = useState(true);
  
  // 新的 Tracker API 狀態
  const [environmentData, setEnvironmentData] = useState(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [showEnvironmentPanel, setShowEnvironmentPanel] = useState(false);
  const [dataSources, setDataSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  
  // 動態污染類型列表
  const [pollutionTypes, setPollutionTypes] = useState([]);
  
  // 地圖顯示模式: 'markers' | 'heatmap' | 'cluster'
  const [displayMode, setDisplayMode] = useState('heatmap');
  
  // 當前縮放等級
  const [currentZoom, setCurrentZoom] = useState(2);
  
  // 水質監測的縮放閾值（超過此值自動顯示所有節點）
  const WATER_QUALITY_ZOOM_THRESHOLD = 8;
  
  useEffect(() => {
    loadMapData();
    loadTimeSeriesData();
  }, [selectedType, selectedRegion, dateRange]);

  useEffect(() => {
    const loadSources = async () => {
      try {
        setSourcesLoading(true);
        const result = await getTrackerSources();
        setDataSources(result.sources || []);
      } catch (error) {
        console.error('載入資料來源失敗:', error);
        setDataSources([]);
      } finally {
        setSourcesLoading(false);
      }
    };
    loadSources();
  }, []);
  
  // 載入污染類型列表
  useEffect(() => {
    const loadPollutionTypes = async () => {
      try {
        const result = await getPollutionTypes();
        setPollutionTypes(result.types || []);
      } catch (error) {
        console.error('載入污染類型失敗:', error);
        // 使用預設類型作為 fallback
        setPollutionTypes([
          { type: 'plastic', unit: 'kg/km²' },
          { type: 'microplastic', unit: 'particles/km²' }
        ]);
      }
    };
    loadPollutionTypes();
  }, []);
  
  const loadMapData = async () => {
    try {
      setLoading(true);
      const params = { 
        type: selectedType,
        ...(dateRange.from && dateRange.to && { from: dateRange.from, to: dateRange.to })
      };
      const data = await getMapData(params);
      setMapData(data);
    } catch (error) {
      console.error('載入地圖資料失敗:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTimeSeriesData = async () => {
    try {
      const params = {
        type: selectedType,
        ...(selectedRegion !== 'global' && { region: selectedRegion })
      };
      const data = await getTimeSeries(params);
      setTimeSeriesData(data.data || []);
    } catch (error) {
      console.error('載入時間序列失敗:', error);
      setTimeSeriesData([]);
    }
  };
  
  // 根據污染類型和數值決定標記顏色
  const getMarkerColor = (value, type) => {
    // 類型專屬顏色
    const typeColors = {
      plastic: { high: '#dc2626', medium: '#f59e0b', low: '#10b981' },
      microplastic: { high: '#9333ea', medium: '#a855f7', low: '#c4b5fd' },
      water_quality: { high: '#0369a1', medium: '#0ea5e9', low: '#7dd3fc' },
      pollution_source: { high: '#b91c1c', medium: '#ef4444', low: '#fca5a5' },
      chemistry: { high: '#0f766e', medium: '#14b8a6', low: '#5eead4' },
      contaminant: { high: '#c2410c', medium: '#f97316', low: '#fdba74' },
      emission: { high: '#4338ca', medium: '#6366f1', low: '#a5b4fc' },
    };
    
    const colors = typeColors[type] || typeColors.plastic;
    
    if (value > 1000) return colors.high;
    if (value > 500) return colors.medium;
    return colors.low;
  };
  
  // 取得類型的顯示名稱
  const getTypeLabel = (type) => {
    const labels = {
      plastic: t('tracker.types.plastic'),
      microplastic: t('tracker.types.microplastic'),
      water_quality: t('tracker.types.waterQuality', '水質監測'),
      pollution_source: t('tracker.types.pollutionSource', '污染源'),
      chemistry: t('tracker.types.chemistry', '海洋化學'),
      contaminant: t('tracker.types.contaminant', '污染物'),
      emission: t('tracker.types.emission', '排放'),
    };
    return labels[type] || type;
  };
  
  // 處理地圖點擊事件
  const handleMapClick = async (event) => {
    const coords = getCoordinatesFromMapEvent(event);
    console.log('地圖點擊座標:', coords);
    
    setEnvLoading(true);
    setShowEnvironmentPanel(true);
    
    try {
      const data = await getLocationEnvironmentData(coords.lat, coords.lng);
      setEnvironmentData(data);
    } catch (error) {
      console.error('載入環境資料失敗:', error);
      setEnvironmentData(null);
    } finally {
      setEnvLoading(false);
    }
  };
  
  // 地圖事件監聽組件（含縮放監聽）
  function MapClickHandler({ onZoomChange }) {
    useMapEvents({
      click: handleMapClick,
      zoomend: (e) => {
        onZoomChange(e.target.getZoom());
      }
    });
    return null;
  }
  
  // 熱力圖層組件
  function HeatmapLayer({ data, selectedType }) {
    const map = useMap();
    const heatLayerRef = useRef(null);
    
    useEffect(() => {
      if (!data?.features?.length) return;
      
      // 移除舊的熱力圖層
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      
      // 準備熱力圖數據 [lat, lng, intensity]
      const heatData = data.features
        .filter(f => f.geometry?.coordinates)
        .map(f => {
          const [lng, lat] = f.geometry.coordinates;
          // 根據值計算強度 (0-1)
          const intensity = Math.min(f.properties.value / 2000, 1);
          return [lat, lng, intensity];
        });
      
      if (heatData.length > 0) {
        // 根據類型選擇漸變色
        const gradients = {
          plastic: { 0.4: '#10b981', 0.65: '#f59e0b', 1: '#dc2626' },
          microplastic: { 0.4: '#c4b5fd', 0.65: '#a855f7', 1: '#9333ea' },
          water_quality: { 0.4: '#7dd3fc', 0.65: '#0ea5e9', 1: '#0369a1' },
          pollution_source: { 0.4: '#fca5a5', 0.65: '#ef4444', 1: '#b91c1c' },
          chemistry: { 0.4: '#5eead4', 0.65: '#14b8a6', 1: '#0f766e' },
          contaminant: { 0.4: '#fdba74', 0.65: '#f97316', 1: '#c2410c' },
          emission: { 0.4: '#a5b4fc', 0.65: '#6366f1', 1: '#4338ca' },
        };
        
        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          max: 1.0,
          gradient: gradients[selectedType] || gradients.plastic
        }).addTo(map);
      }
      
      return () => {
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }
      };
    }, [data, map, selectedType]);
    
    return null;
  }
  
  // 聚合標記層組件
  function ClusterLayer({ data, selectedType, getMarkerColor, t }) {
    const map = useMap();
    const clusterGroupRef = useRef(null);
    
    useEffect(() => {
      if (!data?.features?.length) return;
      
      // 移除舊的聚合層
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
      
      // 建立聚合群組
      clusterGroupRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size = 'small';
          let className = 'marker-cluster-small';
          
          if (count > 100) {
            size = 'large';
            className = 'marker-cluster-large';
          } else if (count > 10) {
            size = 'medium';
            className = 'marker-cluster-medium';
          }
          
          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster ${className}`,
            iconSize: L.point(40, 40)
          });
        }
      });
      
      // 添加標記到聚合群組
      data.features.forEach((feature) => {
        if (!feature.geometry?.coordinates) return;
        
        const [lng, lat] = feature.geometry.coordinates;
        const color = getMarkerColor(feature.properties.value, selectedType);
        
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.7
        });
        
        marker.bindPopup(`
          <div class="text-sm">
            <strong>${t('tracker.value')}:</strong> ${feature.properties.value.toFixed(2)} ${feature.properties.unit}<br/>
            <strong>${t('tracker.region')}:</strong> ${feature.properties.region || 'N/A'}<br/>
            <strong>${t('tracker.date')}:</strong> ${feature.properties.recordedAt}<br/>
            <strong>${t('tracker.source', '來源')}:</strong> ${feature.properties.source || 'N/A'}
          </div>
        `);
        
        clusterGroupRef.current.addLayer(marker);
      });
      
      map.addLayer(clusterGroupRef.current);
      
      return () => {
        if (clusterGroupRef.current) {
          map.removeLayer(clusterGroupRef.current);
        }
      };
    }, [data, map, selectedType, getMarkerColor, t]);
    
    return null;
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1>{t('tracker.title')}</h1>
          <button
            onClick={() => setShowEnvironmentPanel(!showEnvironmentPanel)}
            className={`btn-outline text-sm ${
              showEnvironmentPanel ? 'bg-ocean-blue-600 text-white' : ''
            }`}
          >
            {showEnvironmentPanel ? t('common.hide') : t('common.show')} {t('tracker.environmentInfo')}
          </button>
        </div>
        
        {/* 控制面板 */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 污染類型 */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('tracker.pollutionType')}</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                {pollutionTypes.length > 0 ? (
                  pollutionTypes.map(({ type }) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="plastic">{t('tracker.types.plastic')}</option>
                    <option value="microplastic">{t('tracker.types.microplastic')}</option>
                  </>
                )}
              </select>
            </div>
            
            {/* 區域篩選 */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('tracker.region')}</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="global">{t('tracker.regions.global')}</option>
                <option value="North Pacific Gyre">{t('tracker.regions.northPacific')}</option>
                <option value="Indian Ocean">{t('tracker.regions.indianOcean')}</option>
                <option value="North Atlantic">{t('tracker.regions.northAtlantic')}</option>
                <option value="Mediterranean Sea">{t('tracker.regions.mediterranean')}</option>
                <option value="Southeast Asia">{t('tracker.regions.southeastAsia')}</option>
              </select>
            </div>
            
            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('tracker.startDate')}</label>
              <input 
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('tracker.endDate')}</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          {/* 切換圖表顯示 */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {/* 地圖顯示模式 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('tracker.displayMode')}:</span>
              <div className="flex rounded-lg overflow-hidden border">
                <button
                  onClick={() => setDisplayMode('heatmap')}
                  className={`px-3 py-1 text-sm ${displayMode === 'heatmap' ? 'bg-ocean-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                >
                  🔥 {t('tracker.modes.heatmap')}
                </button>
                <button
                  onClick={() => setDisplayMode('cluster')}
                  className={`px-3 py-1 text-sm border-l ${displayMode === 'cluster' ? 'bg-ocean-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                >
                  📍 {t('tracker.modes.cluster')}
                </button>
                <button
                  onClick={() => setDisplayMode('markers')}
                  className={`px-3 py-1 text-sm border-l ${displayMode === 'markers' ? 'bg-ocean-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                >
                  ⚫ {t('tracker.modes.markers')}
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="btn-outline text-sm"
            >
              {showCharts ? t('common.hide') : t('common.show')} {t('tracker.charts')}
            </button>
            <button
              onClick={() => setDateRange({ from: '', to: '' })}
              className="text-sm text-ocean-blue-600 hover:underline"
            >
              {t('tracker.clearFilter')}
            </button>
          </div>
        </div>
        
        {/* 主要內容區 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 地圖區域 */}
          <div className={showEnvironmentPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="card p-0 overflow-hidden" style={{ height: '600px' }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">{t('common.loading')}</p>
                </div>
              ) : (
                <MapContainer
                  center={[20, 0]} 
                  zoom={2} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapClickHandler onZoomChange={setCurrentZoom} />
                  
                  {/* 水質監測特殊處理：縮放拉近時顯示所有節點 */}
                  {selectedType === 'water_quality' && currentZoom >= WATER_QUALITY_ZOOM_THRESHOLD && mapData?.features?.map((feature, idx) => (
                    <CircleMarker
                      key={`wq-${idx}`}
                      center={[
                        feature.geometry.coordinates[1],
                        feature.geometry.coordinates[0]
                      ]}
                      radius={10}
                      fillColor={getMarkerColor(feature.properties.value, selectedType)}
                      color="#fff"
                      weight={2}
                      fillOpacity={0.85}
                    >
                      <Popup>
                        <div className="text-sm min-w-[200px]">
                          <div className="font-bold text-blue-600 mb-2">💧 {t('tracker.types.waterQuality')}</div>
                          <strong>{t('tracker.value')}:</strong> {feature.properties.value.toFixed(2)} {feature.properties.unit}<br/>
                          <strong>{t('tracker.region')}:</strong> {feature.properties.region || 'N/A'}<br/>
                          <strong>{t('tracker.date')}:</strong> {feature.properties.recordedAt}<br/>
                          <strong>{t('tracker.source', '來源')}:</strong> {feature.properties.source || 'N/A'}
                          {feature.properties.meta && (
                            <>
                              <hr className="my-2" />
                              <div className="text-xs text-gray-600">
                                {feature.properties.meta.characteristicName && (
                                  <div><strong>指標:</strong> {feature.properties.meta.characteristicName}</div>
                                )}
                                {feature.properties.meta.siteId && (
                                  <div><strong>站點:</strong> {feature.properties.meta.siteId}</div>
                                )}
                                {feature.properties.meta.organization && (
                                  <div><strong>機構:</strong> {feature.properties.meta.organization}</div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                  
                  {/* 熱力圖模式（水質監測縮放拉近時不顯示熱力圖） */}
                  {displayMode === 'heatmap' && mapData?.features?.length > 0 && 
                   !(selectedType === 'water_quality' && currentZoom >= WATER_QUALITY_ZOOM_THRESHOLD) && (
                    <HeatmapLayer data={mapData} selectedType={selectedType} />
                  )}
                  
                  {/* 聚合標記模式（水質監測縮放拉近時不顯示聚合） */}
                  {displayMode === 'cluster' && mapData?.features?.length > 0 && 
                   !(selectedType === 'water_quality' && currentZoom >= WATER_QUALITY_ZOOM_THRESHOLD) && (
                    <ClusterLayer 
                      data={mapData} 
                      selectedType={selectedType} 
                      getMarkerColor={getMarkerColor}
                      t={t}
                    />
                  )}
                  
                  {/* 單點標記模式（水質監測縮放拉近時不重複顯示） */}
                  {displayMode === 'markers' && 
                   !(selectedType === 'water_quality' && currentZoom >= WATER_QUALITY_ZOOM_THRESHOLD) &&
                   mapData?.features?.map((feature, idx) => (
                    <CircleMarker
                      key={idx}
                      center={[
                        feature.geometry.coordinates[1],
                        feature.geometry.coordinates[0]
                      ]}
                      radius={8}
                      fillColor={getMarkerColor(feature.properties.value, selectedType)}
                      color="#fff"
                      weight={2}
                      fillOpacity={0.7}
                    >
                      <Popup>
                        <div className="text-sm">
                          <strong>{t('tracker.value')}:</strong> {feature.properties.value.toFixed(2)} {feature.properties.unit}<br/>
                          <strong>{t('tracker.region')}:</strong> {feature.properties.region || 'N/A'}<br/>
                          <strong>{t('tracker.date')}:</strong> {feature.properties.recordedAt}<br/>
                          <strong>{t('tracker.source', '來源')}:</strong> {feature.properties.source || 'N/A'}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
            
            {/* 地圖說明 */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>{t('tracker.howToUse')}：</strong>{t('tracker.mapInstruction')}
              </p>
              {selectedType === 'water_quality' && (
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                  💧 <strong>水質監測提示：</strong>縮放至 {WATER_QUALITY_ZOOM_THRESHOLD} 級以上時，將自動顯示所有監測站點的詳細資訊。
                  {currentZoom >= WATER_QUALITY_ZOOM_THRESHOLD && (
                    <span className="ml-2 text-green-600">✓ 目前已顯示所有節點 (縮放: {currentZoom})</span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          {/* 環境資訊面板 */}
          {showEnvironmentPanel && (
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <EnvironmentInfoPanel 
                  data={environmentData}
                  loading={envLoading}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* 圖例 */}
        <div className="card mt-6">
          <h3 className="mb-4">{t('tracker.legend.title')}</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500"></div>
              <span>{t('tracker.legend.low')} ({'<'} 500 kg/km²)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
              <span>{t('tracker.legend.medium')} (500-1000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600"></div>
              <span>{t('tracker.legend.high')} ({'>'} 1000)</span>
            </div>
          </div>
        </div>
        
        
        {/* 圖表分析區域 */}
        {showCharts && (
          <div className="mt-6 space-y-6">
            {/* 時間序列圖表 */}
            <div className="card">
              <h3 className="mb-4">📈 {t('tracker.analysis.trendTitle')}</h3>
              <TimeSeriesChart
                data={timeSeriesData}
                title={t('tracker.analysis.trendChartTitle', {
                  region: selectedRegion === 'global' ? t('tracker.regions.global') : selectedRegion,
                  type: selectedType === 'plastic' ? t('tracker.types.plastic') : t('tracker.types.microplastic')
                })}
              />
            </div>
            
            {/* 統計資訊 */}
            {timeSeriesData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-ocean-blue-600">
                    {timeSeriesData[timeSeriesData.length - 1].value.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{t('tracker.analysis.latestValue')} (kg/km²)</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(timeSeriesData.reduce((sum, d) => sum + d.value, 0) / timeSeriesData.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{t('tracker.analysis.averageValue')}</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Math.max(...timeSeriesData.map(d => d.value)).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{t('tracker.analysis.maxValue')}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <DataSourcesPanel sources={dataSources} loading={sourcesLoading} />
        </div>
      </div>
    </div>
  );
}
