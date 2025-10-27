import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchAnalyticsDashboard } from '@/components/analytics/SearchAnalyticsDashboard';
import { analyticsService } from '@/services/analytics/analyticsService';

// Mock the analytics service
vi.mock('@/services/analytics/analyticsService', () => ({
  analyticsService: {
    getDashboardData: vi.fn(),
    getRealTimeMetrics: vi.fn(),
    exportData: vi.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

const mockDashboardData = {
  timeRange: { start: new Date('2023-01-01'), end: new Date('2023-01-31') },
  totalSearches: 1245,
  successRate: 0.87,
  averageResponseTime: 342,
  topQueries: [
    { query: 'document management', count: 89, successRate: 0.95 },
    { query: 'workflow automation', count: 76, successRate: 0.82 },
  ],
  failedSearches: [],
  popularContent: [],
  performanceMetrics: [],
  userBehaviorSummary: {
    avgSessionDuration: 420,
    avgQueriesPerSession: 3.2,
    refinementRate: 0.34,
    abandonmentRate: 0.12,
  },
  optimizationSuggestions: [],
  contentRecommendations: [],
};

const mockRealTimeMetrics = {
  currentActiveUsers: 23,
  searchesInLastHour: 156,
  averageResponseTime: 287,
  errorRate: 0.02,
  systemLoad: 0.67,
  trending: {
    queries: ['new feature', 'integration guide'],
    documents: ['API Reference', 'User Guide'],
  },
};

describe('SearchAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (analyticsService.getDashboardData as any).mockResolvedValue(mockDashboardData);
    (analyticsService.getRealTimeMetrics as any).mockResolvedValue(mockRealTimeMetrics);
    (analyticsService.exportData as any).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
  });

  it('renders loading state initially', () => {
    render(<SearchAnalyticsDashboard />);
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('renders dashboard with data after loading', async () => {
    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('1.2K')).toBeInTheDocument(); // Total searches formatted
    expect(screen.getByText('87.0%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('342ms')).toBeInTheDocument(); // Response time
  });

  it('displays real-time metrics when enabled', async () => {
    render(<SearchAnalyticsDashboard showRealTime={true} />);

    await waitFor(() => {
      expect(screen.getByText(/23 active users/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/156 searches/i)).toBeInTheDocument();
    expect(screen.getByText(/287ms/i)).toBeInTheDocument();
    expect(screen.getByText(/2.0%/i)).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });

    // Click Performance tab
    fireEvent.click(screen.getByText('Performance'));
    expect(screen.getByText('Response Time Trends')).toBeInTheDocument();

    // Click User Behavior tab
    fireEvent.click(screen.getByText('User Behavior'));
    expect(screen.getByText('Search Patterns')).toBeInTheDocument();

    // Click Optimization tab
    fireEvent.click(screen.getByText('Optimization'));
    expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument();
  });

  it('changes time range filter', async () => {
    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });

    const timeRangeSelect = screen.getByDisplayValue('Last 7 days');
    fireEvent.change(timeRangeSelect, { target: { value: 'month' } });

    expect(analyticsService.getDashboardData).toHaveBeenCalledTimes(2);
  });

  it('handles export functionality', async () => {
    // Mock document methods
    const mockLink = {
      click: vi.fn(),
      href: '',
      download: '',
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(analyticsService.exportData).toHaveBeenCalled();
    });

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('handles error state', async () => {
    (analyticsService.getDashboardData as any).mockRejectedValue(new Error('API Error'));

    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retries loading data when retry button is clicked', async () => {
    (analyticsService.getDashboardData as any).mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockDashboardData);

    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Analytics')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Search Analytics')).toBeInTheDocument();
    });

    expect(analyticsService.getDashboardData).toHaveBeenCalledTimes(2);
  });

  it('renders top queries correctly', async () => {
    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Top Queries')).toBeInTheDocument();
    });

    expect(screen.getByText('document management')).toBeInTheDocument();
    expect(screen.getByText('workflow automation')).toBeInTheDocument();
    expect(screen.getByText('89 searches')).toBeInTheDocument();
    expect(screen.getByText('95.0% success')).toBeInTheDocument();
  });

  it('renders user behavior summary', async () => {
    render(<SearchAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User Behavior Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('7m')).toBeInTheDocument(); // Session duration
    expect(screen.getByText('3.2')).toBeInTheDocument(); // Queries per session
    expect(screen.getByText('34.0%')).toBeInTheDocument(); // Refinement rate
    expect(screen.getByText('12.0%')).toBeInTheDocument(); // Abandonment rate
  });
});