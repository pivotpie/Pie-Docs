import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText, TrendingUp, Info, Settings, Zap, Eye, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  DocumentSimilarity,
  SimilarityExplanation,
  ContentFingerprint
} from '@/types/domain/SemanticSearch';
import { SimilarDocumentDiscovery as SimilarityService } from '@/services/semantic/SimilarDocumentDiscovery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Progress } from '@/components/ui/Progress';
import { Textarea } from '@/components/ui/Textarea';

interface SimilarDocumentDiscoveryProps {
  documentId?: string;
  content?: string;
  onDocumentSelect?: (documentId: string) => void;
  onSimilarityExplain?: (explanation: SimilarityExplanation) => void;
  className?: string;
}

export const SimilarDocumentDiscoveryComponent: React.FC<SimilarDocumentDiscoveryProps> = ({
  documentId,
  content,
  onDocumentSelect,
  onSimilarityExplain,
  className = ''
}) => {
  const { t } = useTranslation();
  const [similarityService] = useState(() => new SimilarityService());

  // State
  const [similarDocuments, setSimilarDocuments] = useState<DocumentSimilarity[]>([]);
  const [fingerprint, setFingerprint] = useState<ContentFingerprint | null>(null);
  const [explanation, setExplanation] = useState<SimilarityExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchText, setSearchText] = useState('');
  const [isTextSearch, setIsTextSearch] = useState(false);

  // Configuration
  const [includeTextSimilarity, setIncludeTextSimilarity] = useState(true);
  const [includeSemanticSimilarity, setIncludeSemanticSimilarity] = useState(true);
  const [includeStructuralSimilarity, setIncludeStructuralSimilarity] = useState(false);
  const [includeMetadataSimilarity, setIncludeMetadataSimilarity] = useState(true);
  const [textWeight, setTextWeight] = useState(0.4);
  const [semanticWeight, setSemanticWeight] = useState(0.4);
  const [structuralWeight, setStructuralWeight] = useState(0.1);
  const [metadataWeight, setMetadataWeight] = useState(0.1);
  const [minSimilarityScore, setMinSimilarityScore] = useState(0.3);
  const [maxResults, setMaxResults] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active modes
  const [activeMode, setActiveMode] = useState<'document' | 'text' | 'pattern'>('document');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  /**
   * Find similar documents to the current document
   */
  const findSimilarDocuments = useCallback(async () => {
    if (!documentId && !isTextSearch) return;

    setIsLoading(true);
    setError(null);

    try {
      let similar: DocumentSimilarity[];

      if (isTextSearch && searchText.trim()) {
        // Find documents similar to text
        similar = await similarityService.findSimilarToText(searchText, {
          includeTextSimilarity,
          includeSemanticSimilarity,
          includeStructuralSimilarity,
          includeMetadataSimilarity,
          textWeight,
          semanticWeight,
          structuralWeight,
          metadataWeight,
          minSimilarityScore,
          maxResults,
          explainSimilarity: true
        });
      } else if (documentId) {
        // Find documents similar to specific document
        similar = await similarityService.findSimilarDocuments(documentId, {
          includeTextSimilarity,
          includeSemanticSimilarity,
          includeStructuralSimilarity,
          includeMetadataSimilarity,
          textWeight,
          semanticWeight,
          structuralWeight,
          metadataWeight,
          minSimilarityScore,
          maxResults,
          explainSimilarity: true
        });
      } else {
        similar = [];
      }

      setSimilarDocuments(similar);

    } catch (error) {
      console.error('Failed to find similar documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to find similar documents');
    } finally {
      setIsLoading(false);
    }
  }, [
    documentId,
    isTextSearch,
    searchText,
    similarityService,
    includeTextSimilarity,
    includeSemanticSimilarity,
    includeStructuralSimilarity,
    includeMetadataSimilarity,
    textWeight,
    semanticWeight,
    structuralWeight,
    metadataWeight,
    minSimilarityScore,
    maxResults
  ]);

  /**
   * Generate content fingerprint
   */
  const generateFingerprint = useCallback(async () => {
    if (!documentId || !content) return;

    try {
      const fp = await similarityService.generateContentFingerprint(documentId, content);
      setFingerprint(fp);
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
    }
  }, [documentId, content, similarityService]);

  /**
   * Explain similarity between documents
   */
  const explainSimilarity = useCallback(async (similarDocId: string) => {
    if (!documentId) return;

    try {
      setIsLoading(true);
      const explanation = await similarityService.explainSimilarity(documentId, similarDocId);
      setExplanation(explanation);
      setSelectedDocument(similarDocId);
      onSimilarityExplain?.(explanation);
    } catch (error) {
      console.error('Failed to explain similarity:', error);
      setError('Failed to explain similarity');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, similarityService, onSimilarityExplain]);

  /**
   * Handle document selection
   */
  const handleDocumentSelect = (docId: string) => {
    onDocumentSelect?.(docId);
  };

  /**
   * Handle text search
   */
  const handleTextSearch = () => {
    if (searchText.trim()) {
      setIsTextSearch(true);
      findSimilarDocuments();
    }
  };

  /**
   * Get similarity color based on score
   */
  const getSimilarityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  /**
   * Format similarity score as percentage
   */
  const formatScore = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  // Auto-find similar documents when documentId changes
  useEffect(() => {
    if (documentId && !isTextSearch) {
      findSimilarDocuments();
      generateFingerprint();
    }
  }, [documentId, findSimilarDocuments, generateFingerprint, isTextSearch]);

  // Re-search when configuration changes
  useEffect(() => {
    if ((documentId || isTextSearch) && !isLoading) {
      const timeoutId = setTimeout(() => {
        findSimilarDocuments();
      }, 500); // Debounce

      return () => clearTimeout(timeoutId);
    }
  }, [
    textWeight,
    semanticWeight,
    structuralWeight,
    metadataWeight,
    minSimilarityScore,
    maxResults,
    includeTextSimilarity,
    includeSemanticSimilarity,
    includeStructuralSimilarity,
    includeMetadataSimilarity
  ]);

  return (
    <div className={`similar-document-discovery ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Copy className="w-6 h-6" />
            {t('similarity.findSimilar')}
          </h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4 mr-1" />
              {t('similarity.settings')}
            </Button>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeMode === 'document' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveMode('document');
              setIsTextSearch(false);
            }}
            disabled={!documentId}
          >
            <FileText className="w-4 h-4 mr-1" />
            {t('similarity.documentMode')}
          </Button>
          <Button
            variant={activeMode === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveMode('text');
              setIsTextSearch(true);
            }}
          >
            <Search className="w-4 h-4 mr-1" />
            {t('similarity.textMode')}
          </Button>
        </div>

        {/* Text Search Input */}
        {activeMode === 'text' && (
          <div className="mb-4">
            <div className="flex gap-2">
              <Textarea
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('similarity.textSearchPlaceholder')}
                className="flex-1"
                rows={3}
              />
              <Button
                onClick={handleTextSearch}
                disabled={!searchText.trim() || isLoading}
                className="px-6"
              >
                <Search className="w-4 h-4 mr-1" />
                {t('similarity.search')}
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Configuration */}
        {showAdvanced && (
          <Card className="p-4 mb-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('similarity.advancedSettings')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Similarity Types */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium">{t('similarity.includeSimilarityTypes')}</h5>

                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('similarity.textSimilarity')}</span>
                  <Switch
                    checked={includeTextSimilarity}
                    onCheckedChange={setIncludeTextSimilarity}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('similarity.semanticSimilarity')}</span>
                  <Switch
                    checked={includeSemanticSimilarity}
                    onCheckedChange={setIncludeSemanticSimilarity}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('similarity.structuralSimilarity')}</span>
                  <Switch
                    checked={includeStructuralSimilarity}
                    onCheckedChange={setIncludeStructuralSimilarity}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('similarity.metadataSimilarity')}</span>
                  <Switch
                    checked={includeMetadataSimilarity}
                    onCheckedChange={setIncludeMetadataSimilarity}
                  />
                </div>
              </div>

              {/* Weights */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium">{t('similarity.weights')}</h5>

                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.textWeight')}: {formatScore(textWeight)}
                  </label>
                  <Slider
                    value={[textWeight]}
                    onValueChange={([value]) => setTextWeight(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                    disabled={!includeTextSimilarity}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.semanticWeight')}: {formatScore(semanticWeight)}
                  </label>
                  <Slider
                    value={[semanticWeight]}
                    onValueChange={([value]) => setSemanticWeight(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                    disabled={!includeSemanticSimilarity}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.structuralWeight')}: {formatScore(structuralWeight)}
                  </label>
                  <Slider
                    value={[structuralWeight]}
                    onValueChange={([value]) => setStructuralWeight(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                    disabled={!includeStructuralSimilarity}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.metadataWeight')}: {formatScore(metadataWeight)}
                  </label>
                  <Slider
                    value={[metadataWeight]}
                    onValueChange={([value]) => setMetadataWeight(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                    disabled={!includeMetadataSimilarity}
                  />
                </div>
              </div>

              {/* Other Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.minScore')}: {formatScore(minSimilarityScore)}
                  </label>
                  <Slider
                    value={[minSimilarityScore]}
                    onValueChange={([value]) => setMinSimilarityScore(value)}
                    min={0.1}
                    max={0.9}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">
                    {t('similarity.maxResults')}: {maxResults}
                  </label>
                  <Slider
                    value={[maxResults]}
                    onValueChange={([value]) => setMaxResults(value)}
                    min={3}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Content Fingerprint */}
      {fingerprint && activeMode === 'document' && (
        <Card className="mb-6 p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {t('similarity.contentFingerprint')}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('similarity.structure')}</p>
              <div className="space-y-1 text-sm">
                <p>{t('similarity.paragraphs')}: {fingerprint.structuralFingerprint.paragraphs}</p>
                <p>{t('similarity.sentences')}: {fingerprint.structuralFingerprint.sentences}</p>
                <p>{t('similarity.avgSentenceLength')}: {fingerprint.structuralFingerprint.avgSentenceLength}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">{t('similarity.textFeatures')}</p>
              <div className="space-y-1 text-sm">
                <p>{t('similarity.keyPhrases')}: {fingerprint.textFingerprint.length}</p>
                <p>{t('similarity.semanticDimensions')}: {fingerprint.semanticFingerprint.length}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">{t('similarity.metadata')}</p>
              <div className="space-y-1 text-sm">
                {Object.entries(fingerprint.metadataFingerprint).slice(0, 3).map(([key, value]) => (
                  <p key={key}>{key}: {String(value)}</p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-4 p-4 border-red-200 bg-red-50">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>{t('similarity.finding')}</span>
          </div>
        </Card>
      )}

      {/* Similar Documents Results */}
      {!isLoading && (
        <>
          {similarDocuments.length === 0 ? (
            <Card className="p-8">
              <p className="text-gray-500 text-center">
                {!documentId && !isTextSearch
                  ? t('similarity.noDocumentSelected')
                  : t('similarity.noSimilarDocuments')
                }
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">
                  {t('similarity.foundSimilarDocuments', { count: similarDocuments.length })}
                </h4>
              </div>

              {similarDocuments.map((doc) => (
                <Card
                  key={doc.documentId}
                  className={`p-4 hover:shadow-lg transition-all cursor-pointer ${getSimilarityColor(doc.similarityScore)}`}
                  onClick={() => handleDocumentSelect(doc.documentId)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="font-medium text-lg">
                      Document {doc.documentId}
                    </h5>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatScore(doc.similarityScore)} similar
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          explainSimilarity(doc.documentId);
                        }}
                      >
                        <Info className="w-4 h-4 mr-1" />
                        {t('similarity.explain')}
                      </Button>
                    </div>
                  </div>

                  {/* Similarity Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('similarity.text')}</p>
                      <Progress value={doc.similarityScore * 100} className="h-2 mt-1" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('similarity.semantic')}</p>
                      <Progress value={doc.similarityScore * 90} className="h-2 mt-1" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('similarity.structure')}</p>
                      <Progress value={doc.similarityScore * 70} className="h-2 mt-1" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('similarity.metadata')}</p>
                      <Progress value={doc.similarityScore * 80} className="h-2 mt-1" />
                    </div>
                  </div>

                  {/* Shared Concepts */}
                  {doc.sharedConcepts.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {t('similarity.sharedConcepts')}:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {doc.sharedConcepts.slice(0, 5).map((concept, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relationship Type */}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {doc.relationshipType} relationship
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatScore(doc.similarityScore)} overall similarity
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Similarity Explanation Modal/Panel */}
      {explanation && selectedDocument && (
        <Card className="mt-6 p-4 border-blue-200 bg-blue-50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('similarity.explanationFor')} Document {selectedDocument}
          </h4>

          <div className="space-y-4">
            {/* Overall Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{t('similarity.overallSimilarity')}</span>
                <span className="font-bold text-lg">{formatScore(explanation.overallScore)}</span>
              </div>
              <Progress value={explanation.overallScore * 100} className="h-3" />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">{t('similarity.textSimilarity')}: {formatScore(explanation.textSimilarity)}</p>
                <Progress value={explanation.textSimilarity * 100} className="h-2 mt-1" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('similarity.semanticSimilarity')}: {formatScore(explanation.semanticSimilarity)}</p>
                <Progress value={explanation.semanticSimilarity * 100} className="h-2 mt-1" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('similarity.structuralSimilarity')}: {formatScore(explanation.structuralSimilarity)}</p>
                <Progress value={explanation.structuralSimilarity * 100} className="h-2 mt-1" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('similarity.metadataSimilarity')}: {formatScore(explanation.metadataSimilarity)}</p>
                <Progress value={explanation.metadataSimilarity * 100} className="h-2 mt-1" />
              </div>
            </div>

            {/* Explanation Text */}
            <div>
              <p className="text-sm font-medium mb-2">{t('similarity.explanation')}:</p>
              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                {explanation.explanation}
              </p>
            </div>

            {/* Key Factors */}
            {explanation.keyFactors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('similarity.keyFactors')}:</p>
                <div className="flex flex-wrap gap-1">
                  {explanation.keyFactors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('similarity.confidence')}:</span>
              <span className="text-sm">{formatScore(explanation.confidence)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExplanation(null);
                setSelectedDocument(null);
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};