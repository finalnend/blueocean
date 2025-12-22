import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getResources, getResourceTypes } from '../services/resourceService';
import { getOceanStats } from '../services/oceanService';
import OceanStatsPanel from '../components/OceanStatsPanel';

export default function ResourcesPage() {
  const { t, i18n } = useTranslation();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [oceanStats, setOceanStats] = useState(null);
  
  useEffect(() => {
    loadResources();
    loadOceanStats();
  }, [i18n.language]); // 當語言變更時重新載入資源
  
  useEffect(() => {
    filterResources();
  }, [selectedType, searchQuery, resources]);
  
  const loadResources = async () => {
    try {
      setLoading(true);
      // 傳遞當前語言給 API
      const data = await getResources({ lang: i18n.language });
      setResources(data.resources);
      setFilteredResources(data.resources);
    } catch (error) {
      console.error('載入資源失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOceanStats = async () => {
    try {
      const data = await getOceanStats();
      const oceans = Array.isArray(data?.oceans) ? data.oceans : [];
      setOceanStats(oceans);
    } catch (error) {
      console.error('Failed to load ocean stats:', error);
      setOceanStats([]);
    }
  };

  const filterResources = () => {
    let filtered = resources;
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === selectedType);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredResources(filtered);
  };
  
  const getTypeIcon = (type) => {
    const icons = {
      dataset: '📊',
      report: '📄',
      ngo: '🤝',
      tool: '🔧',
      teaching: '👨‍🏫',
    };
    return icons[type] || '📚';
  };
  
  const getTypeName = (type) => {
    const names = {
      dataset: t('resources.types.dataset'),
      report: t('resources.types.report'),
      ngo: t('resources.types.ngo'),
      tool: t('resources.types.tool'),
      teaching: t('resources.types.teaching'),
    };
    return names[type] || type;
  };
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6">{t('resources.title')}</h1>

        <OceanStatsPanel oceans={oceanStats} />
        
        {/* 篩選與搜尋 */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t('resources.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">{t('resources.allTypes')}</option>
                <option value="dataset">{t('resources.types.dataset')}</option>
                <option value="report">{t('resources.types.report')}</option>
                <option value="ngo">{t('resources.types.ngo')}</option>
                <option value="tool">{t('resources.types.tool')}</option>
                <option value="teaching">{t('resources.types.teaching')}</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* 資源列表 */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="card">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{getTypeIcon(resource.type)}</span>
                  <div className="flex-1">
                    <h3 className="text-lg mb-1">{resource.title}</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getTypeName(resource.type)}
                    </span>
                  </div>
                </div>
                
                {resource.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    {resource.description}
                  </p>
                )}
                
                {resource.tags && resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {resource.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-ocean-blue-100 text-ocean-blue-700 dark:bg-ocean-blue-900/30 dark:text-ocean-blue-100 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ocean-blue-600 dark:text-ocean-blue-300 font-semibold hover:underline inline-flex items-center"
                >
                  {t('resources.viewResource')} →
                </a>
              </div>
            ))}
          </div>
        )}
        
        {!loading && filteredResources.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400">{t('resources.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
