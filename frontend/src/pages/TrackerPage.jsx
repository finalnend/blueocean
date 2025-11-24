import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import { getMapData, getPollutionTypes, getTimeSeries } from '../services/pollutionService';
import { getLocationEnvironmentData, getCoordinatesFromMapEvent } from '../services/trackerService';
import TimeSeriesChart from '../components/TimeSeriesChart';
import PollutionPieChart from '../components/PollutionPieChart';
import EnvironmentInfoPanel from '../components/EnvironmentInfoPanel';

export default function TrackerPage() {
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
  
  useEffect(() => {
    loadMapData();
    loadTimeSeriesData();
  }, [selectedType, selectedRegion, dateRange]);
  
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
  
  const getMarkerColor = (value) => {
    if (value > 1000) return '#dc2626';
    if (value > 500) return '#f59e0b';
    return '#10b981';
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
  
  // 地圖事件監聽組件
  function MapClickHandler() {
    useMapEvents({
      click: handleMapClick
    });
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1>污染追蹤地圖</h1>
          <button
            onClick={() => setShowEnvironmentPanel(!showEnvironmentPanel)}
            className={`btn-outline text-sm ${
              showEnvironmentPanel ? 'bg-ocean-blue-600 text-white' : ''
            }`}
          >
            {showEnvironmentPanel ? '隱藏' : '顯示'}環境資訊
          </button>
        </div>
        
        {/* 控制面板 */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 污染類型 */}
            <div>
              <label className="block text-sm font-semibold mb-2">污染類型</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="plastic">塑膠污染</option>
                <option value="microplastic">微塑膠</option>
              </select>
            </div>
            
            {/* 區域篩選 */}
            <div>
              <label className="block text-sm font-semibold mb-2">監測區域</label>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="global">全球</option>
                <option value="North Pacific Gyre">北太平洋</option>
                <option value="Indian Ocean">印度洋</option>
                <option value="North Atlantic">北大西洋</option>
                <option value="Mediterranean Sea">地中海</option>
                <option value="Southeast Asia">東南亞</option>
              </select>
            </div>
            
            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-semibold mb-2">開始日期</label>
              <input 
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-semibold mb-2">結束日期</label>
              <input 
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          {/* 切換圖表顯示 */}
          <div className="mt-4 flex items-center gap-2">
            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="btn-outline text-sm"
            >
              {showCharts ? '隱藏' : '顯示'}圖表分析
            </button>
            <button 
              onClick={() => setDateRange({ from: '', to: '' })}
              className="text-sm text-ocean-blue-600 hover:underline"
            >
              清除篩選
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
                  <p className="text-gray-500">載入中...</p>
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
                  <MapClickHandler />
                  {mapData?.features?.map((feature, idx) => (
                    <CircleMarker
                      key={idx}
                      center={[
                        feature.geometry.coordinates[1],
                        feature.geometry.coordinates[0]
                      ]}
                      radius={8}
                      fillColor={getMarkerColor(feature.properties.value)}
                      color="#fff"
                      weight={2}
                      fillOpacity={0.7}
                    >
                      <Popup>
                        <div className="text-sm">
                          <strong>污染值:</strong> {feature.properties.value.toFixed(2)} {feature.properties.unit}<br/>
                          <strong>區域:</strong> {feature.properties.region || 'N/A'}<br/>
                          <strong>日期:</strong> {feature.properties.recordedAt}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
            
            {/* 地圖說明 */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>如何使用：</strong>點擊地圖上的任意位置查看當地的空氣品質與海洋環境資料
              </p>
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
          <h3 className="mb-4">污染程度圖例</h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500"></div>
              <span>低 (&lt; 500 kg/km²)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-500"></div>
              <span>中 (500-1000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600"></div>
              <span>高 (&gt; 1000)</span>
            </div>
          </div>
        </div>
        
        {/* 圖表分析區域 */}
        {showCharts && (
          <div className="mt-6 space-y-6">
            {/* 時間序列圖表 */}
            <div className="card">
              <h3 className="mb-4">📈 污染趨勢分析</h3>
              <TimeSeriesChart 
                data={timeSeriesData}
                title={`${selectedRegion === 'global' ? '全球' : selectedRegion} ${selectedType === 'plastic' ? '塑膠' : '微塑膠'}污染趨勢`}
              />
            </div>
            
            {/* 統計資訊 */}
            {timeSeriesData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-ocean-blue-600">
                    {timeSeriesData[timeSeriesData.length - 1].value.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">最新數值 (kg/km²)</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(timeSeriesData.reduce((sum, d) => sum + d.value, 0) / timeSeriesData.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">平均值</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Math.max(...timeSeriesData.map(d => d.value)).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">最高值</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
