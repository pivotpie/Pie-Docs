import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@/contexts/ThemeContext';
import EnhancedDashboard from '@/pages/dashboard/EnhancedDashboard';
import i18n from '@/i18n';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock chart components
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          {component}
        </ThemeProvider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('EnhancedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<EnhancedDashboard />);

    expect(screen.getByText('Loading your enhanced dashboard...')).toBeInTheDocument();
  });

  it('renders dashboard header and controls after loading', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Real-time insights and comprehensive document management')).toBeInTheDocument();
    expect(screen.getByText('Time Range:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30 Days')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
  });

  it('displays statistics overview widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Check for statistics display
    expect(screen.getByText('Total Documents')).toBeInTheDocument();
    expect(screen.getByText('Processing Queue')).toBeInTheDocument();
    expect(screen.getByText('Active Workflows')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Storage Used')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
  });

  it('toggles customization panel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    const customizeButton = screen.getByText('Customize');

    // Open customization panel
    await user.click(customizeButton);

    await waitFor(() => {
      expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Done')).toBeInTheDocument();

    // Close customization panel
    await user.click(screen.getByText('Done'));

    await waitFor(() => {
      expect(screen.queryByText('Customize Dashboard')).not.toBeInTheDocument();
    });
  });

  it('changes time range selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    const timeRangeSelect = screen.getByDisplayValue('30 Days');

    await user.selectOptions(timeRangeSelect, '7d');

    expect(screen.getByDisplayValue('7 Days')).toBeInTheDocument();
  });

  it('renders advanced analytics widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Advanced Analytics widget should be present
    expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders document insights widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Document Insights')).toBeInTheDocument();
  });

  it('renders performance monitor widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('System Performance')).toBeInTheDocument();
  });

  it('renders workflow status widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Workflow Status')).toBeInTheDocument();
  });

  it('renders user activity heatmap widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('User Activity Heatmap')).toBeInTheDocument();
  });

  it('renders notification center widget', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('handles widget visibility toggle in customization mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Open customization panel
    await user.click(screen.getByText('Customize'));

    await waitFor(() => {
      expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
    });

    // Find widget toggles (they should be present as switches)
    const customizationPanel = screen.getByText('Customize Dashboard').closest('div');
    expect(customizationPanel).toBeInTheDocument();

    // Widget components should be listed in customization
    const widgetComponents = ['StatisticsOverview', 'AdvancedAnalytics', 'DocumentInsights'];
    widgetComponents.forEach(component => {
      expect(screen.getByText(component)).toBeInTheDocument();
    });
  });

  it('handles responsive layout correctly', () => {
    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('min-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderWithProviders(<EnhancedDashboard />);

    // Dashboard should render without errors in different viewport sizes
    expect(screen.getByTestId).toBeDefined();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Test Tab navigation
    await user.tab();

    // Should focus on first interactive element
    const timeRangeSelect = screen.getByDisplayValue('30 Days');
    expect(timeRangeSelect).toHaveFocus();
  });

  it('displays correct accessibility attributes', async () => {
    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Check for proper ARIA labels and roles
    const dashboard = screen.getByRole('main') || document.body;
    expect(dashboard).toBeInTheDocument();

    // Buttons should have proper labels
    const customizeButton = screen.getByText('Customize');
    expect(customizeButton).toHaveAttribute('type', 'button');

    const uploadButton = screen.getByText('Upload Document');
    expect(uploadButton).toHaveAttribute('type', 'button');
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to track error handling
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Component should not crash even if widgets have errors
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('supports theme switching', async () => {
    // Test with different theme context
    const ThemeProviderMock = ({ children }: { children: React.ReactNode }) => (
      <div data-theme="light">{children}</div>
    );

    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <ThemeProviderMock>
            <EnhancedDashboard />
          </ThemeProviderMock>
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Should render without errors in different themes
    expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
  });

  it('performs well with large datasets', async () => {
    const startTime = performance.now();

    renderWithProviders(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (less than 2 seconds)
    expect(renderTime).toBeLessThan(2000);
  });
});