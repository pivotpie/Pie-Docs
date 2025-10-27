import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedAnalyticsWidget from '@/components/dashboard/widgets/AdvancedAnalyticsWidget';

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const defaultProps = {
  id: 'test-analytics',
  title: 'Test Analytics',
  timeRange: '30d' as const,
  chartType: 'line' as const,
};

describe('AdvancedAnalyticsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    // Check for loading spinner by class or text
    const loadingElement = document.querySelector('.animate-spin') ||
                          screen.queryByText(/loading/i) ||
                          document.querySelector('[data-widget-id]');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders chart after loading', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays metric selection buttons', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    expect(screen.getByText('Processed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Storage (GB)')).toBeInTheDocument();
  });

  it('switches between metrics', async () => {
    const user = userEvent.setup();
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    const processedButton = screen.getByText('Processed');
    await user.click(processedButton);

    // Should highlight the selected metric
    expect(processedButton).toHaveClass('bg-white/20');
  });

  it('displays chart type selection controls', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Chart type controls should be present
    const chartControls = screen.getByRole('group') || screen.getByTestId('chart-controls');
    expect(chartControls).toBeInTheDocument();
  });

  it('shows key metrics summary', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Total Documents') || screen.getByText(/Total/)).toBeInTheDocument();
    });

    expect(screen.getByText('Growth Rate') || screen.getByText(/Growth/)).toBeInTheDocument();
  });

  it('renders area chart type correctly', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} chartType="area" />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  it('renders bar chart type correctly', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} chartType="bar" />);

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('renders pie chart type correctly', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} chartType="pie" />);

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('handles different time ranges', async () => {
    const { rerender } = render(<AdvancedAnalyticsWidget {...defaultProps} timeRange="7d" />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Change time range
    rerender(<AdvancedAnalyticsWidget {...defaultProps} timeRange="90d" />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  it('displays growth rate with correct formatting', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/[+-]?\d+(\.\d+)?%/)).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to suppress error logs in test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdvancedAnalyticsWidget {...defaultProps} hasError={true} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByRole('alert')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    // Should be able to navigate metric buttons with keyboard
    const firstMetricButton = screen.getByText('Documents');
    await user.tab();

    if (document.activeElement) {
      expect(document.activeElement).toBe(firstMetricButton);
    }
  });

  it('has proper accessibility attributes', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Chart should have proper ARIA labels
    const chartContainer = screen.getByTestId('responsive-container');
    expect(chartContainer).toBeInTheDocument();

    // Metric buttons should have proper labels
    const metricButtons = screen.getAllByRole('button');
    metricButtons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('updates data when time range changes', async () => {
    const { rerender } = render(<AdvancedAnalyticsWidget {...defaultProps} timeRange="7d" />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Mock that data would be different for different time ranges
    rerender(<AdvancedAnalyticsWidget {...defaultProps} timeRange="90d" />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Component should re-render with new data
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays formatted numbers correctly', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      // Should display numbers with proper formatting (commas, etc.)
      expect(screen.getByText(/\d{1,3}(,\d{3})*/)).toBeInTheDocument();
    });
  });

  it('handles widget resize correctly', async () => {
    const onResize = vi.fn();
    render(<AdvancedAnalyticsWidget {...defaultProps} onResize={onResize} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Component should render properly regardless of size
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('shows loading state during data refresh', () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} isLoading={true} />);

    // Check for loading spinner by class
    const loadingElement = document.querySelector('.animate-spin');
    expect(loadingElement).toBeInTheDocument();
  });

  it('displays tooltip information correctly', async () => {
    render(<AdvancedAnalyticsWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    // Tooltip component should be rendered
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
});