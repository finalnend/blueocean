import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '../../i18n';
import TrackerPage from '../TrackerPage';
import SimulatorPage from '../SimulatorPage';
import ResourcesPage from '../ResourcesPage';

// Mock Services
vi.mock('../../services/pollutionService', () => ({
  getMapData: vi.fn().mockResolvedValue({ features: [] }),
  getPollutionTypes: vi.fn().mockResolvedValue([]),
  getTimeSeries: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../services/trackerService', () => ({
  getLocationEnvironmentData: vi.fn().mockResolvedValue({}),
  getCoordinatesFromMapEvent: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  getTrackerSources: vi.fn().mockResolvedValue({ sources: [] }),
}));

vi.mock('../../services/gameService', () => ({
  submitScore: vi.fn().mockResolvedValue({}),
  getLeaderboard: vi.fn().mockResolvedValue({ leaderboard: [] }),
}));

vi.mock('../../services/resourceService', () => ({
  getResources: vi.fn().mockResolvedValue({ resources: [] }),
  getResourceTypes: vi.fn().mockResolvedValue([]),
}));

describe('I18n Integration Tests', () => {
  beforeEach(() => {
    // Reset language to English before each test
    act(() => {
      i18n.changeLanguage('en');
    });
  });

  describe('TrackerPage', () => {
    it('should load default language (English) and switch to Chinese', async () => {
      render(<TrackerPage />);

      // Check for English content
      // 'tracker.title' -> 'Pollution Tracker'
      expect(screen.getByText('Pollution Tracker')).toBeInTheDocument();
      // 'tracker.pollutionType' -> 'Pollution Type'
      expect(screen.getByText('Pollution Type')).toBeInTheDocument();

      // Switch language
      await act(async () => {
        await i18n.changeLanguage('zh');
      });

      // Check for Chinese content
      // 'tracker.title' -> '污染追蹤'
      expect(screen.getByText('污染追蹤')).toBeInTheDocument();
      // 'tracker.pollutionType' -> '污染類型'
      expect(screen.getByText('污染類型')).toBeInTheDocument();
    });
  });

  describe('SimulatorPage', () => {
    it('should load default language (English) and switch to Chinese', async () => {
      render(<SimulatorPage />);

      // Check for English content
      // 'simulator.title' -> 'Marine Cleanup Simulator'
      expect(screen.getByText('Marine Cleanup Simulator')).toBeInTheDocument();
      // 'simulator.ready.start' -> 'Start Game'
      expect(screen.getByText('Start Game')).toBeInTheDocument();

      // Switch language
      await act(async () => {
        await i18n.changeLanguage('zh');
      });

      // Check for Chinese content
      // 'simulator.title' -> '海洋清理模擬遊戲'
      expect(screen.getByText('海洋清理模擬遊戲')).toBeInTheDocument();
      // 'simulator.ready.start' -> '開始遊戲'
      expect(screen.getByText('開始遊戲')).toBeInTheDocument();
    });
  });

  describe('ResourcesPage', () => {
    it('should load default language (English) and switch to Chinese', async () => {
      render(<ResourcesPage />);

      // Check for English content
      // 'resources.title' -> 'Educational Resources'
      expect(screen.getByText('Educational Resources')).toBeInTheDocument();
      // 'resources.searchPlaceholder' -> 'Search resources...'
      expect(screen.getByPlaceholderText('Search resources...')).toBeInTheDocument();

      // Switch language
      await act(async () => {
        await i18n.changeLanguage('zh');
      });

      // Check for Chinese content
      // 'resources.title' -> '教育資源'
      expect(screen.getByText('教育資源')).toBeInTheDocument();
      // 'resources.searchPlaceholder' -> '搜尋資源...'
      expect(screen.getByPlaceholderText('搜尋資源...')).toBeInTheDocument();
    });
  });
});