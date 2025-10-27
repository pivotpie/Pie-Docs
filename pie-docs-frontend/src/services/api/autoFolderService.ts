export interface Folder {
  id: string;
  name: string;
  path: string;
  parent_id?: string | null;
  description?: string;
  created_at: string;
}

export interface AutoFolderResult {
  success: boolean;
  folder?: Folder;
  matchType?: 'exact' | 'plural' | 'contains' | 'none';
  error?: string;
}

export class AutoFolderService {
  private static instance: AutoFolderService;
  private folders: Folder[] = [];
  private initialized: boolean = false;

  static getInstance(): AutoFolderService {
    if (!AutoFolderService.instance) {
      AutoFolderService.instance = new AutoFolderService();
    }
    return AutoFolderService.instance;
  }

  /**
   * Initialize service by loading all available folders
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Fetch all folders with pagination support
      let allFolders: Folder[] = [];
      let currentPage = 1;
      const pageSize = 100; // Backend limit
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await fetch(
          `http://localhost:8001/api/v1/folders?status=active&page=${currentPage}&page_size=${pageSize}`
        );

        if (!response.ok) {
          console.warn(`Failed to fetch folders page ${currentPage}:`, response.status);
          break;
        }

        const data = await response.json();
        const folders = data.folders || [];

        if (folders.length === 0) {
          hasMorePages = false;
        } else {
          allFolders = [...allFolders, ...folders];

          // Check if there might be more pages
          if (folders.length < pageSize) {
            hasMorePages = false;
          } else {
            currentPage++;
          }
        }
      }

      this.folders = allFolders;
      this.initialized = true;
      console.log(`AutoFolderService initialized with ${this.folders.length} folders`);
    } catch (error) {
      console.error('Failed to load folders for auto-assignment:', error);
      this.folders = [];
      this.initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  /**
   * Refresh folder list (call after creating new folders)
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Normalize string for comparison (lowercase, trim, remove special chars)
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Convert singular to plural (simple heuristic)
   */
  private pluralize(word: string): string {
    const normalized = word.toLowerCase();

    // Common irregular plurals
    const irregulars: Record<string, string> = {
      'invoice': 'invoices',
      'contract': 'contracts',
      'receipt': 'receipts',
      'order': 'orders',
      'document': 'documents',
      'report': 'reports',
      'statement': 'statements',
      'agreement': 'agreements',
      'certificate': 'certificates',
      'license': 'licenses',
      'policy': 'policies',
      'warranty': 'warranties'
    };

    if (irregulars[normalized]) {
      return irregulars[normalized];
    }

    // Simple plural rules
    if (normalized.endsWith('y') && !normalized.endsWith('ay') && !normalized.endsWith('ey')) {
      return normalized.slice(0, -1) + 'ies';
    } else if (normalized.endsWith('s') || normalized.endsWith('x') || normalized.endsWith('z') ||
               normalized.endsWith('ch') || normalized.endsWith('sh')) {
      return normalized + 'es';
    } else {
      return normalized + 's';
    }
  }

  /**
   * Match folder by document type with intelligent matching
   */
  findMatchingFolder(documentTypeName: string): AutoFolderResult {
    // Ensure folders array is valid
    if (!Array.isArray(this.folders)) {
      console.error('Folders array is not initialized properly');
      this.folders = [];
    }

    if (!documentTypeName || this.folders.length === 0) {
      return {
        success: false,
        matchType: 'none',
        error: 'No document type or no folders available'
      };
    }

    const normalizedDocType = this.normalizeString(documentTypeName);
    const docTypeWords = normalizedDocType.split(' ');

    // 1. Try exact match (case-insensitive)
    const exactMatch = this.folders.find(folder =>
      this.normalizeString(folder.name) === normalizedDocType
    );

    if (exactMatch) {
      console.log(`✅ Exact folder match found: "${exactMatch.name}" for "${documentTypeName}"`);
      return {
        success: true,
        folder: exactMatch,
        matchType: 'exact'
      };
    }

    // 2. Try plural form match
    const pluralForm = this.pluralize(normalizedDocType);
    const pluralMatch = this.folders.find(folder =>
      this.normalizeString(folder.name) === pluralForm
    );

    if (pluralMatch) {
      console.log(`✅ Plural folder match found: "${pluralMatch.name}" for "${documentTypeName}"`);
      return {
        success: true,
        folder: pluralMatch,
        matchType: 'plural'
      };
    }

    // 3. Try singular form if doc type is plural
    const singularMatch = this.folders.find(folder => {
      const folderNorm = this.normalizeString(folder.name);
      return pluralForm === this.pluralize(folderNorm) && folderNorm !== normalizedDocType;
    });

    if (singularMatch) {
      console.log(`✅ Singular folder match found: "${singularMatch.name}" for "${documentTypeName}"`);
      return {
        success: true,
        folder: singularMatch,
        matchType: 'plural'
      };
    }

    // 4. Try contains match (folder name contains document type or vice versa)
    const containsMatch = this.folders.find(folder => {
      const folderNorm = this.normalizeString(folder.name);
      const folderWords = folderNorm.split(' ');

      // Check if any significant word matches
      return docTypeWords.some(docWord => {
        if (docWord.length < 3) return false; // Skip short words like "of", "the"
        return folderWords.some(folderWord =>
          folderWord.includes(docWord) || docWord.includes(folderWord)
        );
      });
    });

    if (containsMatch) {
      console.log(`✅ Partial folder match found: "${containsMatch.name}" for "${documentTypeName}"`);
      return {
        success: true,
        folder: containsMatch,
        matchType: 'contains'
      };
    }

    // 5. No match found
    console.log(`❌ No folder match found for "${documentTypeName}"`);
    return {
      success: false,
      matchType: 'none',
      error: `No folder found matching "${documentTypeName}"`
    };
  }

  /**
   * Auto-assign folder for a file based on document type
   */
  async autoAssignFolder(documentTypeName?: string): Promise<AutoFolderResult> {
    // Ensure folders are loaded
    if (!this.initialized) {
      await this.initialize();
    }

    if (!documentTypeName) {
      return {
        success: false,
        matchType: 'none',
        error: 'No document type provided'
      };
    }

    return this.findMatchingFolder(documentTypeName);
  }

  /**
   * Create a new folder for document type if it doesn't exist
   */
  async createFolderForDocumentType(documentTypeName: string, parentId?: string): Promise<AutoFolderResult> {
    try {
      // Pluralize the name for folder creation
      const folderName = this.pluralize(documentTypeName);

      const response = await fetch('http://localhost:8001/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.charAt(0).toUpperCase() + folderName.slice(1), // Capitalize first letter
          description: `Auto-created folder for ${documentTypeName} documents`,
          parent_id: parentId || null
        })
      });

      if (response.ok) {
        const newFolder = await response.json();

        // Refresh folder list
        await this.refresh();

        console.log(`✅ Created new folder: "${newFolder.name}" for "${documentTypeName}"`);

        return {
          success: true,
          folder: newFolder,
          matchType: 'exact'
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          matchType: 'none',
          error: error.detail || 'Failed to create folder'
        };
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      return {
        success: false,
        matchType: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all folders (for manual selection)
   */
  getFolders(): Folder[] {
    return this.folders;
  }

  /**
   * Get folder by ID
   */
  getFolderById(folderId: string): Folder | undefined {
    return this.folders.find(f => f.id === folderId);
  }

  /**
   * Suggest folder names based on document type
   */
  suggestFolderNames(documentTypeName: string): string[] {
    const normalized = this.normalizeString(documentTypeName);
    const plural = this.pluralize(normalized);

    return [
      // Capitalized plural form
      plural.charAt(0).toUpperCase() + plural.slice(1),
      // Capitalized original form
      normalized.charAt(0).toUpperCase() + normalized.slice(1),
      // With year suffix
      `${plural.charAt(0).toUpperCase() + plural.slice(1)} ${new Date().getFullYear()}`,
      // Generic
      'Documents'
    ];
  }
}

// Export singleton instance
export const autoFolderService = AutoFolderService.getInstance();
