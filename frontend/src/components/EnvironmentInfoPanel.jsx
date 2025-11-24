import { useState, useEffect } from 'react';
import { getAirQualityLevel, getSSTWarning } from '../services/trackerService';

export default function EnvironmentInfoPanel({ data, loading }) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue-600"></div>
          <span className="ml-3 text-gray-600">載入環境資料...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-4">
          點擊地圖任意位置查看環境資料
        </p>
      </div>
    );
  }

  const { airQuality, sst, marineWeather, location } = data;

  return (
    <div className="space-y-4">
      {/* 位置資訊 */}
      <div className="card">
        <h3 className="text-lg font-bold mb-2">📍 查詢位置</h3>
        <p className="text-sm text-gray-600">
          緯度: {location.lat.toFixed(4)}°, 經度: {location.lng.toFixed(4)}°
        </p>
      </div>

      {/* 空氣品質 */}
      {airQuality?.success && airQuality.sources.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3 flex items-center">
            🌫️ 空氣品質
          </h3>
          
          {airQuality.sources.map((source, idx) => {
            const qualityInfo = getAirQualityLevel(source.value, airQuality.parameter);
            
            return (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{source.name}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white bg-${qualityInfo.color}-500`}>
                    {qualityInfo.level}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>{airQuality.parameter.toUpperCase()}:</strong> {source.value.toFixed(1)} {airQuality.unit}
                  </p>
                  <p>
                    <strong>國家:</strong> {source.country}
                  </p>
                  <p>
                    <strong>更新時間:</strong> {new Date(source.datetime_utc).toLocaleString('zh-TW')}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 {qualityInfo.description}
                  </p>
                </div>

                {idx < airQuality.sources.length - 1 && (
                  <hr className="my-3 border-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 海表溫度 */}
      {sst?.success && sst.hourly.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3 flex items-center">
            🌊 海洋環境
          </h3>
          
          {(() => {
            const latest = sst.hourly[sst.hourly.length - 1];
            const tempWarning = getSSTWarning(latest.sea_surface_temperature_c);
            
            return (
              <div className="space-y-3">
                {/* 海表溫度 */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">海表溫度</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {latest.sea_surface_temperature_c?.toFixed(1) || 'N/A'}°C
                    </p>
                  </div>
                  <div className="text-4xl">🌡️</div>
                </div>

                {/* 浪高 */}
                {latest.wave_height_m !== null && (
                  <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">浪高</p>
                      <p className="text-2xl font-bold text-cyan-600">
                        {latest.wave_height_m.toFixed(2)} m
                      </p>
                    </div>
                    <div className="text-4xl">🌊</div>
                  </div>
                )}

                {/* 溫度警示 */}
                {tempWarning.warning && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ {tempWarning.message}
                    </p>
                  </div>
                )}

                {/* 時間資訊 */}
                <p className="text-xs text-gray-500">
                  資料時間: {new Date(latest.time).toLocaleString('zh-TW')}
                </p>

                {/* 趨勢圖（簡化版） */}
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">溫度趨勢 (近 24 小時)</p>
                  <div className="flex items-end space-x-1 h-16">
                    {sst.hourly.slice(-24).map((item, idx) => {
                      const temp = item.sea_surface_temperature_c;
                      const maxTemp = Math.max(...sst.hourly.slice(-24).map(i => i.sea_surface_temperature_c || 0));
                      const minTemp = Math.min(...sst.hourly.slice(-24).map(i => i.sea_surface_temperature_c || 0));
                      const height = temp ? ((temp - minTemp) / (maxTemp - minTemp) * 100) : 0;
                      
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-blue-400 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${temp?.toFixed(1)}°C`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 海面天氣（額外資訊） */}
      {marineWeather?.success && marineWeather.hourly.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3">🌬️ 海面狀況</h3>
          
          {(() => {
            const latest = marineWeather.hourly[marineWeather.hourly.length - 1];
            
            return (
              <div className="grid grid-cols-2 gap-3">
                {latest.ocean_current_velocity_ms !== null && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">洋流速度</p>
                    <p className="text-lg font-bold text-gray-800">
                      {latest.ocean_current_velocity_ms.toFixed(2)} m/s
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 錯誤訊息 */}
      {(!airQuality?.success || !sst?.success) && (
        <div className="card bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ 部分資料載入失敗，請稍後再試或選擇其他位置
          </p>
        </div>
      )}
    </div>
  );
}
