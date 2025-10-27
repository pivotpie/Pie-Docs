import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CitationManager, { enhanceContentWithCitations } from '@/components/search/answers/CitationManager';
import type { Citation } from '@/types/domain/Answer';

const mockCitations: Citation[] = [
  {
    id: 'citation-1',
    documentId: 'doc-1',
    documentTitle: 'Introduction to Machine Learning',
    sectionId: 'section-1',
    sectionTitle: 'Neural Networks',
    pageNumber: 15,
    startOffset: 100,
    endOffset: 200,
    excerpt: 'Neural networks are computational models inspired by biological neural networks.',
    confidence: 0.95,
    url: '/documents/doc-1#section=section-1',
  },
  {
    id: 'citation-2',
    documentId: 'doc-2',
    documentTitle: 'Deep Learning Fundamentals',
    sectionId: 'section-3',
    sectionTitle: 'Convolutional Networks',
    pageNumber: 42,
    startOffset: 250,
    endOffset: 350,
    excerpt: 'Convolutional neural networks excel at image recognition tasks.',
    confidence: 0.88,
    url: '/documents/doc-2#section=section-3',
  },
  {
    id: 'citation-3',
    documentId: 'doc-3',
    documentTitle: 'AI Ethics Guidelines',
    startOffset: 50,
    endOffset: 150,
    excerpt: 'Responsible AI development requires careful consideration of ethical implications.',
    confidence: 0.72,
    url: '/documents/doc-3',
  },
];

describe('CitationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <CitationManager
        citations={mockCitations}
        {...props}
      />
    );
  };

  it('renders citations list correctly', () => {
    renderComponent();

    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('AI Ethics Guidelines')).toBeInTheDocument();
  });

  it('displays citation details with confidence scores', () => {
    renderComponent();

    expect(screen.getByText('Neural Networks • Page 15')).toBeInTheDocument();
    expect(screen.getByText('Convolutional Networks • Page 42')).toBeInTheDocument();
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
    expect(screen.getByText('88% confidence')).toBeInTheDocument();
    expect(screen.getByText('72% confidence')).toBeInTheDocument();
  });

  it('shows confidence indicators with appropriate colors', () => {
    renderComponent();

    // Look for confidence indicators in the citations list
    const citations = screen.getAllByText(/\d+% confidence/);
    expect(citations).toHaveLength(3);

    // Check that confidence scores are displayed
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
    expect(screen.getByText('88% confidence')).toBeInTheDocument();
    expect(screen.getByText('72% confidence')).toBeInTheDocument();

    // Check for colored indicators (green for high confidence, yellow for medium)
    const indicators = document.querySelectorAll('.bg-green-500, .bg-yellow-500, .bg-red-500');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('calls onCitationClick when citation is clicked', () => {
    const onCitationClick = vi.fn();
    renderComponent({ onCitationClick });

    const firstCitation = screen.getByText('Introduction to Machine Learning').closest('div');
    fireEvent.click(firstCitation!);

    expect(onCitationClick).toHaveBeenCalledWith(mockCitations[0]);
  });

  it('opens citation URL in new window when no callback provided', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderComponent();

    const firstCitation = screen.getByText('Introduction to Machine Learning').closest('div');
    fireEvent.click(firstCitation!);

    expect(windowOpenSpy).toHaveBeenCalledWith('/documents/doc-1#section=section-1', '_blank');

    windowOpenSpy.mockRestore();
  });

  it('renders empty state when no citations provided', () => {
    render(<CitationManager citations={[]} />);

    expect(screen.queryByText('Sources')).not.toBeInTheDocument();
  });

  it('handles citations without section information', () => {
    const citationsWithoutSection = [mockCitations[2]]; // AI Ethics Guidelines has no section
    render(<CitationManager citations={citationsWithoutSection} />);

    expect(screen.getByText('AI Ethics Guidelines')).toBeInTheDocument();
    expect(screen.queryByText('Page')).not.toBeInTheDocument();
  });

  it('displays proper hover effects', () => {
    renderComponent();

    // Find the citation container that has hover classes
    const citationContainers = document.querySelectorAll('.hover\\:bg-gray-50');
    expect(citationContainers.length).toBeGreaterThan(0);

    // Check for hover icon with proper classes
    const hoverIcons = document.querySelectorAll('.opacity-0.group-hover\\:opacity-100');
    expect(hoverIcons.length).toBeGreaterThan(0);
  });
});

describe('enhanceContentWithCitations', () => {
  it('replaces citation markers with clickable elements', () => {
    const content = 'This is about neural networks [1] and deep learning [2].';
    const onCitationClick = vi.fn();

    const result = enhanceContentWithCitations(content, mockCitations, onCitationClick);
    const { container } = render(<div>{result}</div>);

    expect(container.textContent).toContain('This is about neural networks');
    expect(container.textContent).toContain('and deep learning');
    expect(container.textContent).toContain('[1]');
    expect(container.textContent).toContain('[2]');

    // Check for citation links
    const citationLinks = container.querySelectorAll('sup');
    expect(citationLinks).toHaveLength(2);
  });

  it('handles content without citations', () => {
    const content = 'This content has no citations.';
    const result = enhanceContentWithCitations(content, [], undefined);
    const { container } = render(<div>{result}</div>);

    expect(container.textContent).toBe('This content has no citations.');
  });

  it('handles missing citations gracefully', () => {
    const content = 'Reference to [1] and non-existent [5].';
    const result = enhanceContentWithCitations(content, [mockCitations[0]], undefined);
    const { container } = render(<div>{result}</div>);

    expect(container.textContent).toContain('[1]');
    expect(container.textContent).toContain('[5]');

    // Check that missing citation is rendered as gray
    const missingCitation = Array.from(container.querySelectorAll('sup')).find(
      el => el.textContent === '[5]'
    );
    expect(missingCitation).toHaveClass('text-gray-400');
  });

  it('calls onCitationClick when citation is clicked', () => {
    const content = 'Check this source [1] for more info.';
    const onCitationClick = vi.fn();

    const result = enhanceContentWithCitations(content, mockCitations, onCitationClick);
    const { container } = render(<div>{result}</div>);

    const citationLink = container.querySelector('sup');
    fireEvent.click(citationLink!);

    expect(onCitationClick).toHaveBeenCalledWith(mockCitations[0]);
  });

  it('opens citation URL when no callback provided', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const content = 'See reference [1].';

    const result = enhanceContentWithCitations(content, mockCitations, undefined);
    const { container } = render(<div>{result}</div>);

    const citationLink = container.querySelector('sup');
    fireEvent.click(citationLink!);

    expect(windowOpenSpy).toHaveBeenCalledWith('/documents/doc-1#section=section-1', '_blank');

    windowOpenSpy.mockRestore();
  });

  it('handles multiple consecutive citations', () => {
    const content = 'Multiple sources [1][2][3] support this claim.';
    const result = enhanceContentWithCitations(content, mockCitations, undefined);
    const { container } = render(<div>{result}</div>);

    const citationLinks = container.querySelectorAll('sup');
    expect(citationLinks).toHaveLength(3);
    expect(container.textContent).toContain('[1][2][3]');
  });

  it('preserves text formatting around citations', () => {
    const content = 'Start text [1] middle text [2] end text.';
    const result = enhanceContentWithCitations(content, mockCitations, undefined);
    const { container } = render(<div>{result}</div>);

    expect(container.textContent).toBe('Start text [1] middle text [2] end text.');
  });
});