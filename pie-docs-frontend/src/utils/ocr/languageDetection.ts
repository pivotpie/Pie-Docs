import type { OCRLanguage } from '@/types/domain/OCR';

export interface LanguageDetectionResult {
  language: OCRLanguage;
  confidence: number;
  alternatives?: Array<{ language: OCRLanguage; confidence: number }>;
  script?: 'latin' | 'arabic' | 'mixed';
  direction?: 'ltr' | 'rtl' | 'mixed';
}

export interface BilingualTextSegment {
  id: string;
  text: string;
  language: OCRLanguage;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  direction: 'ltr' | 'rtl';
}

// Unicode ranges for different scripts
const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_RANGE = /[A-Za-z]/;
// const ARABIC_NUMERALS = /[\u0660-\u0669]/;
// const LATIN_NUMERALS = /[0-9]/;

// Common Arabic words for detection
const ARABIC_COMMON_WORDS = [
  'في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'كان', 'كانت',
  'أن', 'أو', 'لا', 'نعم', 'ما', 'كل', 'بعض', 'أول', 'أخر', 'جديد'
];

// Common English words for detection
const ENGLISH_COMMON_WORDS = [
  'the', 'and', 'or', 'to', 'of', 'in', 'for', 'with', 'on', 'at',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have'
];

export function detectTextLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      language: 'auto',
      confidence: 0,
      script: 'latin',
      direction: 'ltr',
    };
  }

  const cleanText = text.trim();
  const totalChars = cleanText.length;

  // Count characters by script
  const arabicMatches = cleanText.match(ARABIC_RANGE) || [];
  const latinMatches = cleanText.match(LATIN_RANGE) || [];

  const arabicRatio = arabicMatches.length / totalChars;
  const latinRatio = latinMatches.length / totalChars;

  // Word-based detection
  const words = cleanText.toLowerCase().split(/\s+/);
  const arabicWordMatches = words.filter(word =>
    ARABIC_COMMON_WORDS.some(commonWord => word.includes(commonWord))
  ).length;
  const englishWordMatches = words.filter(word =>
    ENGLISH_COMMON_WORDS.includes(word)
  ).length;

  const arabicWordRatio = arabicWordMatches / words.length;
  const englishWordRatio = englishWordMatches / words.length;

  // Calculate confidence scores
  const arabicScore = (arabicRatio * 0.7) + (arabicWordRatio * 0.3);
  const englishScore = (latinRatio * 0.7) + (englishWordRatio * 0.3);

  // Determine script and direction
  let script: 'latin' | 'arabic' | 'mixed' = 'latin';
  let direction: 'ltr' | 'rtl' | 'mixed' = 'ltr';

  if (arabicRatio > 0.3 && latinRatio > 0.3) {
    script = 'mixed';
    direction = 'mixed';
  } else if (arabicRatio > latinRatio) {
    script = 'arabic';
    direction = 'rtl';
  }

  // Determine primary language
  let language: OCRLanguage;
  let confidence: number;
  const alternatives: Array<{ language: OCRLanguage; confidence: number }> = [];

  if (arabicScore > englishScore && arabicScore > 0.3) {
    language = script === 'mixed' ? 'ar-en' : 'ar';
    confidence = Math.min(arabicScore, 0.95);
    if (englishScore > 0.1) {
      alternatives.push({ language: 'en', confidence: englishScore });
    }
  } else if (englishScore > arabicScore && englishScore > 0.3) {
    language = script === 'mixed' ? 'ar-en' : 'en';
    confidence = Math.min(englishScore, 0.95);
    if (arabicScore > 0.1) {
      alternatives.push({ language: 'ar', confidence: arabicScore });
    }
  } else if (script === 'mixed') {
    language = 'ar-en';
    confidence = Math.max(arabicScore, englishScore);
  } else {
    language = 'auto';
    confidence = 0.5;
  }

  return {
    language,
    confidence,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
    script,
    direction,
  };
}

export function segmentBilingualText(
  text: string,
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>
): BilingualTextSegment[] {
  const segments: BilingualTextSegment[] = [];

  if (!text || text.trim().length === 0) {
    return segments;
  }

  // Split text into sentences or logical blocks
  const blocks = text.split(/[.!?。؟]\s+/).filter(block => block.trim().length > 0);

  blocks.forEach((block, index) => {
    const detection = detectTextLanguage(block);
    const defaultBoundingBox = {
      x: 0,
      y: index * 20,
      width: block.length * 8,
      height: 16,
    };

    const boundingBox = boundingBoxes?.[index] || defaultBoundingBox;

    segments.push({
      id: `segment-${index}`,
      text: block.trim(),
      language: detection.language,
      confidence: detection.confidence,
      boundingBox,
      direction: detection.direction === 'mixed' ? 'ltr' : detection.direction || 'ltr',
    });
  });

  return segments;
}

export function isRTLText(text: string): boolean {
  const detection = detectTextLanguage(text);
  return detection.direction === 'rtl' || detection.script === 'arabic';
}

export function hasArabicContent(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

export function hasLatinContent(text: string): boolean {
  return LATIN_RANGE.test(text);
}

export function isMixedLanguageContent(text: string): boolean {
  return hasArabicContent(text) && hasLatinContent(text);
}

export function normalizeArabicNumbers(text: string): string {
  return text.replace(/[\u0660-\u0669]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x0660 + 0x0030);
  });
}

export function normalizeLatinNumbers(text: string): string {
  return text.replace(/[0-9]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x0030 + 0x0660);
  });
}

export function getOptimalLanguageSettings(detectionResult: LanguageDetectionResult) {
  const settings = {
    targetLanguages: ['auto'] as OCRLanguage[],
    enableLanguageDetection: true,
    preserveDirectionality: false,
    separateLanguageBlocks: false,
    confidenceThreshold: 0.7,
  };

  switch (detectionResult.language) {
    case 'ar':
      settings.targetLanguages = ['ar'];
      settings.preserveDirectionality = true;
      settings.enableLanguageDetection = false;
      break;
    case 'en':
      settings.targetLanguages = ['en'];
      settings.enableLanguageDetection = false;
      break;
    case 'ar-en':
      settings.targetLanguages = ['ar', 'en'];
      settings.preserveDirectionality = true;
      settings.separateLanguageBlocks = true;
      settings.enableLanguageDetection = true;
      break;
    default:
      settings.targetLanguages = ['ar', 'en'];
      settings.enableLanguageDetection = true;
      settings.confidenceThreshold = 0.5;
  }

  return settings;
}

export function formatBilingualText(
  segments: BilingualTextSegment[],
  options: {
    preserveOrder?: boolean;
    groupByLanguage?: boolean;
    addLanguageLabels?: boolean;
  } = {}
): string {
  if (segments.length === 0) return '';

  const { preserveOrder = true, groupByLanguage = false, addLanguageLabels = false } = options;

  if (groupByLanguage) {
    const arabicSegments = segments.filter(s => s.language === 'ar' || s.language === 'ar-en');
    const englishSegments = segments.filter(s => s.language === 'en');

    let result = '';

    if (arabicSegments.length > 0) {
      if (addLanguageLabels) result += '[Arabic]\n';
      result += arabicSegments.map(s => s.text).join(' ') + '\n\n';
    }

    if (englishSegments.length > 0) {
      if (addLanguageLabels) result += '[English]\n';
      result += englishSegments.map(s => s.text).join(' ');
    }

    return result.trim();
  }

  if (preserveOrder) {
    return segments.map(segment => {
      if (addLanguageLabels) {
        const label = segment.language === 'ar' ? '[AR]' :
                     segment.language === 'en' ? '[EN]' : '[MIXED]';
        return `${label} ${segment.text}`;
      }
      return segment.text;
    }).join(' ');
  }

  return segments.map(s => s.text).join(' ');
}