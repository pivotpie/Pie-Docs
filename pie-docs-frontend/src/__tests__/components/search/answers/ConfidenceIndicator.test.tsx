import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfidenceIndicator, {
  CompactConfidenceBadge,
  ConfidenceProgressBar
} from '@/components/search/answers/ConfidenceIndicator';
import type { ConfidenceScore } from '@/types/domain/Answer';

const mockHighConfidence: ConfidenceScore = {
  overall: 0.92,
  factualAccuracy: 0.95,
  sourceReliability: 0.91,
  answerCompleteness: 0.88,
  citationQuality: 0.90,
  explanation: 'High confidence - comprehensive answer with reliable sources and quality citations',
};

const mockMediumConfidence: ConfidenceScore = {
  overall: 0.72,
  factualAccuracy: 0.78,
  sourceReliability: 0.68,
  answerCompleteness: 0.75,
  citationQuality: 0.67,
  explanation: 'Good confidence - solid answer with good source coverage',
};

const mockLowConfidence: ConfidenceScore = {
  overall: 0.45,
  factualAccuracy: 0.50,
  sourceReliability: 0.42,
  answerCompleteness: 0.48,
  citationQuality: 0.40,
  explanation: 'Low confidence - limited sources or potential accuracy concerns',
};

describe('ConfidenceIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders high confidence with green color scheme', () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} />);

    expect(screen.getByText('92% Confidence')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();

    const container = screen.getByText('92% Confidence').closest('div');
    expect(container).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('renders medium confidence with yellow color scheme', () => {
    render(<ConfidenceIndicator confidence={mockMediumConfidence} />);

    expect(screen.getByText('72% Confidence')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();

    const container = screen.getByText('72% Confidence').closest('div');
    expect(container).toHaveClass('bg-yellow-100', 'text-yellow-700');
  });

  it('renders low confidence with red color scheme', () => {
    render(<ConfidenceIndicator confidence={mockLowConfidence} />);

    expect(screen.getByText('45% Confidence')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();

    const container = screen.getByText('45% Confidence').closest('div');
    expect(container).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('shows tooltip on hover when showDetails is true', async () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={true} />);

    const indicator = screen.getByText('92% Confidence');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText('Confidence Breakdown')).toBeInTheDocument();
    });

    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('Factual Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Source Reliability')).toBeInTheDocument();
    expect(screen.getByText('Answer Completeness')).toBeInTheDocument();
    expect(screen.getByText('Citation Quality')).toBeInTheDocument();
  });

  it('shows individual score breakdowns in tooltip', async () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={true} />);

    const indicator = screen.getByText('92% Confidence');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument(); // Factual Accuracy
      expect(screen.getByText('91%')).toBeInTheDocument(); // Source Reliability
      expect(screen.getByText('88%')).toBeInTheDocument(); // Answer Completeness
      expect(screen.getByText('90%')).toBeInTheDocument(); // Citation Quality
    });
  });

  it('closes tooltip when close button is clicked', async () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={true} />);

    const indicator = screen.getByText('92% Confidence');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText('Confidence Breakdown')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close tooltip');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Confidence Breakdown')).not.toBeInTheDocument();
    });
  });

  it('toggles tooltip on click', async () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={true} />);

    const indicator = screen.getByText('92% Confidence');

    // Click to show
    fireEvent.click(indicator);
    await waitFor(() => {
      expect(screen.getByText('Confidence Breakdown')).toBeInTheDocument();
    });

    // Click to hide
    fireEvent.click(indicator);
    await waitFor(() => {
      expect(screen.queryByText('Confidence Breakdown')).not.toBeInTheDocument();
    });
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <ConfidenceIndicator confidence={mockHighConfidence} size="small" />
    );

    let container = screen.getByText('92% Confidence').closest('div');
    expect(container).toHaveClass('px-2', 'py-1', 'text-xs');

    rerender(<ConfidenceIndicator confidence={mockHighConfidence} size="large" />);
    container = screen.getByText('92% Confidence').closest('div');
    expect(container).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('shows explanation as title when showDetails is false', () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={false} />);

    const indicator = screen.getByText('92% Confidence');
    expect(indicator.closest('div')).toHaveAttribute('title', mockHighConfidence.explanation);
  });

  it('shows recommendation for low confidence scores', async () => {
    render(<ConfidenceIndicator confidence={mockLowConfidence} showDetails={true} />);

    const indicator = screen.getByText('45% Confidence');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText(/Consider reviewing additional sources/)).toBeInTheDocument();
    });
  });

  it('displays progress bars for individual metrics', async () => {
    render(<ConfidenceIndicator confidence={mockHighConfidence} showDetails={true} />);

    const indicator = screen.getByText('92% Confidence');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Sources')).toBeInTheDocument();
      expect(screen.getByText('Completeness')).toBeInTheDocument();
      expect(screen.getByText('Citations')).toBeInTheDocument();
    });

    // Check for progress bar elements
    const progressBars = document.querySelectorAll('.bg-green-500, .bg-yellow-500, .bg-red-500');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});

describe('CompactConfidenceBadge', () => {
  it('renders compact badge with correct percentage', () => {
    render(<CompactConfidenceBadge confidence={0.85} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows appropriate color for confidence level', () => {
    const { rerender } = render(<CompactConfidenceBadge confidence={0.85} />);

    let indicator = document.querySelector('.bg-green-500');
    expect(indicator).toBeInTheDocument();

    rerender(<CompactConfidenceBadge confidence={0.65} />);
    indicator = document.querySelector('.bg-yellow-500');
    expect(indicator).toBeInTheDocument();

    rerender(<CompactConfidenceBadge confidence={0.45} />);
    indicator = document.querySelector('.bg-red-500');
    expect(indicator).toBeInTheDocument();
  });

  it('includes title with percentage for accessibility', () => {
    render(<CompactConfidenceBadge confidence={0.75} />);

    const badge = screen.getByText('75%').closest('div');
    expect(badge).toHaveAttribute('title', '75% confidence');
  });
});

describe('ConfidenceProgressBar', () => {
  it('renders progress bar with correct percentage', () => {
    render(<ConfidenceProgressBar confidence={mockHighConfidence} />);

    expect(screen.getByText('Answer Confidence')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText(mockHighConfidence.explanation)).toBeInTheDocument();
  });

  it('applies correct color based on confidence level', () => {
    const { rerender } = render(
      <ConfidenceProgressBar confidence={mockHighConfidence} />
    );

    let progressBar = document.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();

    rerender(<ConfidenceProgressBar confidence={mockMediumConfidence} />);
    progressBar = document.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();

    rerender(<ConfidenceProgressBar confidence={mockLowConfidence} />);
    progressBar = document.querySelector('.bg-red-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('sets progress bar width based on confidence percentage', () => {
    render(<ConfidenceProgressBar confidence={mockHighConfidence} />);

    const progressBar = document.querySelector('.bg-green-500');
    expect(progressBar).toHaveStyle({ width: '92%' });
  });
});