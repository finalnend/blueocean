import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">{t('app.title')}</h3>
            <p className="text-sm">
              {t('home.subtitle')}
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h3 className="text-white font-bold mb-4">{t('nav.resources')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white">{t('nav.home')}</Link></li>
              <li><Link to="/tracker" className="hover:text-white">{t('nav.tracker')}</Link></li>
              <li><Link to="/simulator" className="hover:text-white">{t('nav.simulator')}</Link></li>
              <li><Link to="/resources" className="hover:text-white">{t('nav.resources')}</Link></li>
            </ul>
          </div>
          
          {/* SDGs */}
          <div>
            <h3 className="text-white font-bold mb-4">SDGs</h3>
            <div className="space-y-2 text-sm">
              <p>🎯 SDG 13: {t('home.features.tracker.title')}</p>
              <p>🌊 SDG 14: {t('home.features.simulator.title')}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          <p>{t('footer.text')}</p>
          <p className="mt-2">
            資料來源: Our World in Data, UNEP, Copernicus Climate Change Service
          </p>
        </div>
      </div>
    </footer>
  );
}
