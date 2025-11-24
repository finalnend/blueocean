import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getPollutionSummary } from '../services/pollutionService';

export default function HomePage() {
  const [globalStats, setGlobalStats] = useState(null);
  
  useEffect(() => {
    // 載入全球污染摘要
    getPollutionSummary({ region: 'global', type: 'plastic' })
      .then(data => setGlobalStats(data))
      .catch(err => console.error(err));
  }, []);
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-ocean-blue-600 to-ocean-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
            Blue Earth Watch
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            追蹤污染、啟發氣候行動的環境教育平台
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tracker" className="btn-primary text-lg px-8 py-3">
              探索污染地圖 →
            </Link>
            <Link to="/simulator" className="btn-secondary text-lg px-8 py-3">
              開始清理遊戲 🎮
            </Link>
          </div>
        </div>
      </section>
      
      {/* Global Stats */}
      {globalStats && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card text-center">
                <div className="text-4xl mb-2">🌊</div>
                <h3 className="text-gray-600 mb-2">平均塑膠濃度</h3>
                <p className="text-3xl font-bold text-ocean-blue-600">
                  {globalStats.average?.toFixed(1)} {globalStats.unit}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-gray-600 mb-2">監測數據點</h3>
                <p className="text-3xl font-bold text-ocean-blue-600">
                  {globalStats.dataPoints}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-2">📍</div>
                <h3 className="text-gray-600 mb-2">最高污染值</h3>
                <p className="text-3xl font-bold text-red-600">
                  {globalStats.max?.toFixed(1)} {globalStats.unit}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-center mb-12">核心功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tracker */}
            <div className="card">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="mb-3">污染追蹤地圖</h3>
              <p className="text-gray-600 mb-4">
                即時互動地圖顯示全球海洋塑膠污染熱點，結合時間序列資料視覺化
              </p>
              <Link to="/tracker" className="text-ocean-blue-600 font-semibold hover:underline">
                探索地圖 →
              </Link>
            </div>
            
            {/* Simulator */}
            <div className="card">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="mb-3">虛擬清理遊戲</h3>
              <p className="text-gray-600 mb-4">
                透過遊戲體驗海洋清理挑戰，了解污染問題的嚴重性並學習保護海洋
              </p>
              <Link to="/simulator" className="text-ocean-blue-600 font-semibold hover:underline">
                開始遊戲 →
              </Link>
            </div>
            
            {/* Resources */}
            <div className="card">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="mb-3">教育資源</h3>
              <p className="text-gray-600 mb-4">
                科學報告、開放資料集、教學活動指南，以及環保組織行動連結
              </p>
              <Link to="/resources" className="text-ocean-blue-600 font-semibold hover:underline">
                瀏覽資源 →
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* SDGs Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-center mb-12">對應永續發展目標</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card flex items-start">
              <div className="text-5xl mr-4">🎯</div>
              <div>
                <h3 className="mb-2">SDG 13: 氣候行動</h3>
                <p className="text-gray-600">
                  採取緊急行動應對氣候變遷及其影響，透過資料視覺化提升大眾意識
                </p>
              </div>
            </div>
            <div className="card flex items-start">
              <div className="text-5xl mr-4">🌊</div>
              <div>
                <h3 className="mb-2">SDG 14: 保育海洋生態</h3>
                <p className="text-gray-600">
                  保護和永續利用海洋及海洋資源，減少海洋污染並恢復海洋生態系統
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
