import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPollutionSummary } from '../services/pollutionService';

export default function HomePage() {
  const [globalStats, setGlobalStats] = useState(null);
  const { t } = useTranslation();

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
            {t('home.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tracker" className="btn-primary text-lg px-8 py-3">
              {t('home.exploreMap')} →
            </Link>
            <Link to="/simulator" className="btn-secondary text-lg px-8 py-3">
              {t('home.startGame')} 🎮
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
                <h3 className="text-gray-600 mb-2">{t('home.stats.avgConcentration')}</h3>
                <p className="text-3xl font-bold text-ocean-blue-600">
                  {globalStats.average?.toFixed(1)} {globalStats.unit}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-gray-600 mb-2">{t('home.stats.dataPoints')}</h3>
                <p className="text-3xl font-bold text-ocean-blue-600">
                  {globalStats.dataPoints}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-4xl mb-2">📍</div>
                <h3 className="text-gray-600 mb-2">{t('home.stats.maxPollution')}</h3>
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
          <h2 className="text-center mb-12">{t('home.features.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tracker */}
            <div className="card">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="mb-3">{t('home.features.tracker.title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('home.features.tracker.desc')}
              </p>
              <Link to="/tracker" className="text-ocean-blue-600 font-semibold hover:underline">
                {t('home.features.tracker.link')} →
              </Link>
            </div>

            {/* Simulator */}
            <div className="card">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="mb-3">{t('home.features.simulator.title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('home.features.simulator.desc')}
              </p>
              <Link to="/simulator" className="text-ocean-blue-600 font-semibold hover:underline">
                {t('home.features.simulator.link')} →
              </Link>
            </div>

            {/* Resources */}
            <div className="card">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="mb-3">{t('home.features.resources.title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('home.features.resources.desc')}
              </p>
              <Link to="/resources" className="text-ocean-blue-600 font-semibold hover:underline">
                {t('home.features.resources.link')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SDGs Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-center mb-12">{t('home.sdgs.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card flex items-start">
              <div className="text-5xl mr-4">🎯</div>
              <div>
                <h3 className="mb-2">{t('home.sdgs.sdg13.title')}</h3>
                <p className="text-gray-600">
                  {t('home.sdgs.sdg13.desc')}
                </p>
              </div>
            </div>
            <div className="card flex items-start">
              <div className="text-5xl mr-4">🌊</div>
              <div>
                <h3 className="mb-2">{t('home.sdgs.sdg14.title')}</h3>
                <p className="text-gray-600">
                  {t('home.sdgs.sdg14.desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
