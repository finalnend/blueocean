import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">關於 Blue Earth Watch</h3>
            <p className="text-sm">
              追蹤污染、啟發氣候行動的環境教育平台。
              致力於提升大眾對海洋污染和氣候變遷的認識。
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h3 className="text-white font-bold mb-4">快速連結</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white">首頁</Link></li>
              <li><Link to="/tracker" className="hover:text-white">污染追蹤</Link></li>
              <li><Link to="/simulator" className="hover:text-white">清理遊戲</Link></li>
              <li><Link to="/resources" className="hover:text-white">教育資源</Link></li>
            </ul>
          </div>
          
          {/* SDGs */}
          <div>
            <h3 className="text-white font-bold mb-4">永續發展目標</h3>
            <div className="space-y-2 text-sm">
              <p>🎯 SDG 13: 氣候行動</p>
              <p>🌊 SDG 14: 保育海洋生態</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          <p>&copy; 2024 Blue Earth Watch. All rights reserved.</p>
          <p className="mt-2">
            資料來源: Our World in Data, UNEP, Copernicus Climate Change Service
          </p>
        </div>
      </div>
    </footer>
  );
}
