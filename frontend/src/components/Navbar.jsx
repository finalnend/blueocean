import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: t('navbar.home') },
    { path: '/tracker', label: t('navbar.tracker') },
    { path: '/simulator', label: t('navbar.simulator') },
    { path: '/resources', label: t('navbar.resources') },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-ocean-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
            <span className="text-xl font-bold">Blue Earth Watch</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${isActive(item.path)
                    ? 'bg-ocean-blue-600 font-semibold'
                    : 'hover:bg-ocean-blue-600'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <button className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
