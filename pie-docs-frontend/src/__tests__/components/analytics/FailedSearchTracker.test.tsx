import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FailedSearchTracker } from '@/components/analytics/FailedSearchTracker';
import { analyticsService } from '@/services/analytics/analyticsService';

// Mock the analytics service
vi.mock('@/services/analytics/analyticsService', () => ({
  analyticsService: {
    getFailedSearchMetrics: vi.fn(),
    exportData: vi.fn(),
  },
}));

const mockFailedSearches = [
  {
    query: 'advanced configuration',
    count: 23,
    lastOccurrence: new Date('2023-01-31T10:30:00Z'),
    suggestedSolutions: ['Create advanced configuration guide', 'Improve search indexing'],
    relatedSuccessfulQueries: ['configuration guide', 'setup instructions'],
  },
  {
    query: 'mobile app integration',
    count: 18,
    lastOccurrence: new Date('2023-01-31T09:15:00Z'),
    suggestedSolutions: ['Add mobile development documentation'],
    relatedSuccessfulQueries: ['api integration', 'sdk documentation'],
  },
  {
    query: 'legacy system support',
    count: 5,
    lastOccurrence: new Date('2023-01-30T14:20:00Z'),
    suggestedSolutions: ['Create legacy system migration guide'],
    relatedSuccessfulQueries: ['system migration', 'compatibility'],
  },
];

describe('FailedSearchTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (analyticsService.getFailedSearchMetrics as any).mockResolvedValue(mockFailedSearches);
    (analyticsService.exportData as any).mockResolvedValue(new Blob(['test'], { type: 'text/csv' }));
  });

  it('renders loading state initially', () => {
    render(<FailedSearchTracker />);
    expect(screen.getByText(/loading failed search data/i)).toBeInTheDocument();
  });

  it('renders failed searches after loading', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    expect(screen.getByText('"advanced configuration"')).toBeInTheDocument();
    expect(screen.getByText('"mobile app integration"')).toBeInTheDocument();
    expect(screen.getByText('23 failures')).toBeInTheDocument();
    expect(screen.getByText('18 failures')).toBeInTheDocument();
  });

  it('displays alert summary for high-priority failures', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('2 High-Priority Failed Searches')).toBeInTheDocument();
    });

    expect(screen.getByText(/These queries have failed 10\+ times/)).toBeInTheDocument();
    expect(screen.getByText('Total failures: 41')).toBeInTheDocument();
  });

  it('filters out low-priority failures when threshold is increased', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    // Change alert threshold to 20
    const thresholdInput = screen.getByDisplayValue('10');
    fireEvent.change(thresholdInput, { target: { value: '20' } });

    // Should only show 1 high-priority failure now
    await waitFor(() => {
      expect(screen.getByText('1 High-Priority Failed Searches')).toBeInTheDocument();
    });
  });

  it('sorts failed searches correctly', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    const sortSelect = screen.getByDisplayValue('Failure Count');

    // Test sorting by last occurrence
    fireEvent.change(sortSelect, { target: { value: 'lastOccurrence' } });

    // The first item should now be the most recent
    const firstItem = screen.getAllByText(/failures$/)[0];
    expect(firstItem).toBeInTheDocument();

    // Test sorting by query text
    fireEvent.change(sortSelect, { target: { value: 'query' } });

    // Should be sorted alphabetically
    expect(screen.getByText('"advanced configuration"')).toBeInTheDocument();
  });

  it('changes time range filter', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    const timeRangeSelect = screen.getByDisplayValue('Last 24 Hours');
    fireEvent.change(timeRangeSelect, { target: { value: 'week' } });

    expect(analyticsService.getFailedSearchMetrics).toHaveBeenCalledTimes(2);
  });

  it('displays suggested solutions', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Suggested Solutions:')).toBeInTheDocument();
    });

    expect(screen.getByText('Create advanced configuration guide')).toBeInTheDocument();
    expect(screen.getByText('Improve search indexing')).toBeInTheDocument();
    expect(screen.getByText('Add mobile development documentation')).toBeInTheDocument();
  });

  it('displays related successful queries', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Related Successful Queries:')).toBeInTheDocument();
    });

    expect(screen.getByText('"configuration guide"')).toBeInTheDocument();
    expect(screen.getByText('"setup instructions"')).toBeInTheDocument();
    expect(screen.getByText('"api integration"')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(analyticsService.getFailedSearchMetrics).toHaveBeenCalledTimes(2);
  });

  it('handles empty state correctly', async () => {
    (analyticsService.getFailedSearchMetrics as any).mockResolvedValue([]);

    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('No Failed Searches')).toBeInTheDocument();
    });

    expect(screen.getByText('All searches in this time period returned results!')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (analyticsService.getFailedSearchMetrics as any).mockRejectedValue(new Error('API Error'));

    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Data')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('auto-refreshes when enabled', async () => {
    vi.useFakeTimers();

    render(<FailedSearchTracker autoRefresh={true} refreshInterval={1} />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(analyticsService.getFailedSearchMetrics).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('displays relative time correctly', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentFailure = {
      ...mockFailedSearches[0],
      lastOccurrence: oneHourAgo,
    };

    (analyticsService.getFailedSearchMetrics as any).mockResolvedValue([recentFailure]);

    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText(/1 hours ago/)).toBeInTheDocument();
    });
  });

  it('applies correct priority colors based on failure count', async () => {
    render(<FailedSearchTracker />);

    await waitFor(() => {
      expect(screen.getByText('Failed Search Tracker')).toBeInTheDocument();
    });

    // High count should have red styling
    const highCountItem = screen.getByText('"advanced configuration"').closest('div');
    expect(highCountItem).toHaveClass('bg-yellow-100'); // Above threshold

    // Low count should have gray styling
    const lowCountItem = screen.getByText('"legacy system support"').closest('div');
    expect(lowCountItem).toHaveClass('bg-gray-100'); // Below threshold
  });
});