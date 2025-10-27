/**
 * SpeechRecognitionService provides voice input capabilities for the application
 */

export interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidence: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  timestamp: Date;
}

export interface VoiceCommand {
  id: string;
  patterns: string[];
  description: string;
  category: string;
  language: string;
  handler: (params: { query: string; parameters: Record<string, any> }) => void;
  enabled: boolean;
  confidence: number;
}

export interface VoiceProcessingResult {
  recognized: boolean;
  command?: VoiceCommand;
  parameters: Record<string, any>;
  confidence: number;
  suggestions: string[];
  reason?: string;
}

export interface VoiceInput {
  text: string;
  confidence: number;
  timestamp: Date;
  recognized: boolean;
  command?: VoiceCommand;
}

export interface VoiceSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  inputs: VoiceInput[];
  language: string;
  isActive: boolean;
  metrics: {
    totalDuration: number;
    wordCount: number;
    commandCount: number;
    averageConfidence: number;
    errorCount: number;
  };
}

type VoiceEventType = 'recognitionStart' | 'recognitionEnd' | 'recognitionError' | 'voiceCommand' | 'start' | 'result' | 'end' | 'error' | 'command' | 'noise';

export interface VoiceEvent {
  type: VoiceEventType;
  data: any;
  timestamp: Date;
}

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService | null = null;
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;
  private _isListening: boolean = false;
  private currentSession: VoiceSession | null = null;
  private config: VoiceRecognitionConfig;
  private eventListeners: Map<VoiceEventType, Array<(event: VoiceEvent) => void>> = new Map();
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private silenceTimer: NodeJS.Timeout | null = null;
  private noiseLevel: number = 0;
  private sessionHistory: VoiceSession[] = [];
  private selectedMicrophoneId: string | null = null;
  private isNoiseCalibrating: boolean = false;
  private currentNoiseLevel: number = 0;
  private noiseCalibrationResolver: ((value: number) => void) | null = null;

  private constructor() {
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      confidence: 0.7,
      noiseReduction: true,
      echoCancellation: true
    };

    this.checkSupport();
    // this.initializeDefaultCommands(); // Disabled for testing
  }

  static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  /**
   * Check if speech recognition is supported in the current browser
   */
  private checkSupport(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;

    if (this.isSupported) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  /**
   * Setup speech recognition with event handlers
   */
  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this._isListening = true;
      this.emitEvent('start', { session: this.currentSession });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onend = () => {
      this._isListening = false;
      this.endSession();
      this.emitEvent('end', { session: this.currentSession });
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleError(event);
      this.emitEvent('recognitionError', { error: event.error });
    };

    this.recognition.onnomatch = () => {
      this.emitEvent('error', {
        error: 'No speech was recognized',
        type: 'nomatch'
      });
    };

    this.recognition.onspeechstart = () => {
      this.clearSilenceTimer();
    };

    this.recognition.onspeechend = () => {
      this.startSilenceTimer();
    };
  }

  /**
   * Initialize default voice commands
   */
  private initializeDefaultCommands(): void {
    const defaultCommands: VoiceCommand[] = [
      {
        id: 'search',
        patterns: [
          'search for *',
          'find *',
          'look for *',
          'show me *',
          'get *'
        ],
        description: 'Search for documents using voice',
        category: 'search',
        language: 'en',
        handler: ({ query, parameters }) => {
          console.log('Search command executed:', query, parameters);
        },
        enabled: true,
        confidence: 0.8
      },
      {
        id: 'filter',
        name: 'Filter Results',
        patterns: [
          'filter by *',
          'show only *',
          'limit to *',
          'filter *'
        ],
        action: 'filter',
        description: 'Filter search results by criteria',
        examples: [
          'Filter by PDF files',
          'Show only documents from last month',
          'Limit to my documents'
        ],
        enabled: true
      },
      {
        id: 'open',
        name: 'Open Document',
        patterns: [
          'open *',
          'show *',
          'display *',
          'view *'
        ],
        action: 'open',
        description: 'Open a specific document',
        examples: [
          'Open the project plan',
          'Show the user manual',
          'Display the report'
        ],
        enabled: true
      },
      {
        id: 'help',
        name: 'Get Help',
        patterns: [
          'help',
          'what can I say',
          'voice commands',
          'how do I *'
        ],
        action: 'help',
        description: 'Get help with voice commands',
        examples: [
          'Help',
          'What can I say',
          'Show voice commands'
        ],
        enabled: true
      },
      {
        id: 'navigate',
        name: 'Navigate',
        patterns: [
          'go to *',
          'navigate to *',
          'show *',
          'take me to *'
        ],
        action: 'navigate',
        description: 'Navigate to different sections',
        examples: [
          'Go to settings',
          'Navigate to dashboard',
          'Take me to uploads'
        ],
        enabled: true
      },
      {
        id: 'language',
        name: 'Change Language',
        patterns: [
          'switch to *',
          'change language to *',
          'use * language'
        ],
        action: 'language',
        description: 'Change interface language',
        examples: [
          'Switch to Arabic',
          'Change language to English',
          'Use Arabic language'
        ],
        enabled: true
      },
      {
        id: 'cancel',
        name: 'Cancel',
        patterns: [
          'cancel',
          'stop',
          'never mind',
          'abort'
        ],
        action: 'cancel',
        description: 'Cancel current operation',
        examples: [
          'Cancel',
          'Stop',
          'Never mind'
        ],
        enabled: true
      }
    ];

    defaultCommands.forEach(command => {
      this.voiceCommands.set(command.id, command);
    });
  }

  /**
   * Start voice recognition session
   */
  async startListening(sessionConfig?: Partial<VoiceRecognitionConfig>): Promise<string> {
    if (!this.isSupported) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    if (this._isListening) {
      throw new Error('Already listening');
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      throw new Error('Microphone permission denied');
    }

    // Update configuration if provided
    if (sessionConfig) {
      this.config = { ...this.config, ...sessionConfig };
      this.updateRecognitionConfig();
    }

    // Create new session
    const sessionId = `voice_session_${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      inputs: [],
      language: this.config.language,
      isActive: true,
      metrics: {
        totalDuration: 0,
        wordCount: 0,
        commandCount: 0,
        averageConfidence: 0,
        errorCount: 0
      }
    };

    // Start recognition
    this.recognition?.start();
    this.emitEvent('recognitionStart', { sessionId });

    return sessionId;
  }

  /**
   * Stop voice recognition
   */
  stopListening(): void {
    if (this._isListening && this.recognition) {
      this.recognition.stop();
      this.emitEvent('recognitionEnd', {});
    }
  }

  /**
   * Update recognition configuration
   */
  private updateRecognitionConfig(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  /**
   * Handle speech recognition results
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    if (!this.currentSession) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      const voiceResult: VoiceRecognitionResult = {
        transcript: transcript.trim(),
        confidence,
        isFinal: result.isFinal,
        alternatives: Array.from(result).slice(1).map(alt => ({
          transcript: alt.transcript.trim(),
          confidence: alt.confidence
        })),
        timestamp: new Date()
      };

      this.currentSession.results.push(voiceResult);

      // Update metrics
      if (result.isFinal) {
        this.updateSessionMetrics(voiceResult);
      }

      // Check for voice commands
      if (result.isFinal && confidence >= this.config.confidence) {
        this.processVoiceCommand(transcript.trim());
      }

      this.emitEvent('result', voiceResult);
    }
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(transcript: string): void {
    const command = this.matchVoiceCommand(transcript);

    if (command) {
      const parameters = this.extractCommandParameters(transcript, command);

      this.currentSession?.metrics && this.currentSession.metrics.commandCount++;

      this.emitEvent('command', {
        command,
        parameters,
        transcript,
        session: this.currentSession
      });
    }
  }

  /**
   * Match transcript against voice commands
   */
  private matchVoiceCommand(transcript: string): VoiceCommand | null {
    const normalizedTranscript = transcript.toLowerCase();

    for (const command of this.voiceCommands.values()) {
      if (!command.enabled) continue;

      for (const pattern of command.patterns) {
        if (this.matchSimplePattern(normalizedTranscript, pattern.toLowerCase())) {
          return command;
        }
      }
    }

    return null;
  }

  /**
   * Match text against pattern with wildcards
   */
  private matchSimplePattern(text: string, pattern: string): boolean {
    // Convert pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(text);
  }

  /**
   * Extract parameters from voice command
   */
  private extractCommandParameters(transcript: string, command: VoiceCommand): Record<string, any> {
    const parameters: Record<string, any> = {};
    const normalizedTranscript = transcript.toLowerCase();

    // Find the matching pattern
    const matchingPattern = command.patterns.find(pattern =>
      this.matchSimplePattern(normalizedTranscript, pattern.toLowerCase())
    );

    if (matchingPattern && matchingPattern.includes('*')) {
      // Extract the wildcard content
      const patternParts = matchingPattern.toLowerCase().split('*');

      if (patternParts.length === 2) {
        const prefix = patternParts[0];
        const suffix = patternParts[1];

        let extracted = normalizedTranscript;
        if (prefix) {
          extracted = extracted.substring(prefix.length);
        }
        if (suffix) {
          extracted = extracted.substring(0, extracted.length - suffix.length);
        }

        parameters.query = extracted.trim();
      }
    }

    // Command-specific parameter extraction
    switch (command.action) {
      case 'filter':
        parameters.filterType = this.extractFilterType(normalizedTranscript);
        break;
      case 'language':
        parameters.language = this.extractLanguage(normalizedTranscript);
        break;
      case 'navigate':
        parameters.destination = this.extractDestination(normalizedTranscript);
        break;
    }

    return parameters;
  }

  /**
   * Extract filter type from transcript
   */
  private extractFilterType(transcript: string): string | null {
    const filterTypes = ['pdf', 'word', 'excel', 'image', 'video', 'audio', 'text'];

    for (const type of filterTypes) {
      if (transcript.includes(type)) {
        return type;
      }
    }

    // Check for time-based filters
    if (transcript.includes('today') || transcript.includes('recent')) return 'recent';
    if (transcript.includes('last week')) return 'last_week';
    if (transcript.includes('last month')) return 'last_month';
    if (transcript.includes('this year')) return 'this_year';

    return null;
  }

  /**
   * Extract language from transcript
   */
  private extractLanguage(transcript: string): string | null {
    if (transcript.includes('english')) return 'en';
    if (transcript.includes('arabic')) return 'ar';
    if (transcript.includes('spanish')) return 'es';
    if (transcript.includes('french')) return 'fr';

    return null;
  }

  /**
   * Extract navigation destination from transcript
   */
  private extractDestination(transcript: string): string | null {
    const destinations = [
      'dashboard', 'settings', 'uploads', 'search', 'documents',
      'profile', 'help', 'admin', 'reports', 'analytics'
    ];

    for (const dest of destinations) {
      if (transcript.includes(dest)) {
        return dest;
      }
    }

    return null;
  }

  /**
   * Handle speech recognition errors
   */
  private handleError(event: SpeechRecognitionErrorEvent): void {
    this.currentSession?.metrics && this.currentSession.metrics.errorCount++;

    this.emitEvent('error', {
      error: event.error,
      message: event.message,
      session: this.currentSession
    });
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(result: VoiceRecognitionResult): void {
    if (!this.currentSession) return;

    const metrics = this.currentSession.metrics;

    // Update word count
    metrics.wordCount += result.transcript.split(' ').length;

    // Update average confidence
    const resultCount = this.currentSession.results.filter(r => r.isFinal).length;
    metrics.averageConfidence = (
      (metrics.averageConfidence * (resultCount - 1) + result.confidence) / resultCount
    );

    // Update duration
    if (this.currentSession.endTime) {
      metrics.totalDuration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    }
  }

  /**
   * End current session
   */
  private endSession(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      this.currentSession.endTime = new Date();
      this.updateSessionMetrics({ transcript: '', confidence: 0, isFinal: true, timestamp: new Date() });
    }
  }

  /**
   * Start silence timer for auto-stop
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this._isListening) {
        this.stopListening();
      }
    }, 3000); // 3 seconds of silence
  }

  /**
   * Clear silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(type: VoiceEventType, listener: (event: VoiceEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)?.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: VoiceEventType, listener: (event: VoiceEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(type: VoiceEventType, data: any): void {
    const event: VoiceEvent = {
      type,
      data,
      timestamp: new Date()
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): VoiceRecognitionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<VoiceRecognitionConfig>): Promise<void> {
    // Validate configuration values
    const validatedConfig = { ...newConfig };

    if (validatedConfig.confidence !== undefined) {
      validatedConfig.confidence = Math.min(1.0, Math.max(0.0, validatedConfig.confidence));
    }

    if (validatedConfig.maxAlternatives !== undefined) {
      validatedConfig.maxAlternatives = Math.max(1, validatedConfig.maxAlternatives);
    }

    this.config = { ...this.config, ...validatedConfig };
    this.updateRecognitionConfig();
  }

  /**
   * Check if speech recognition is supported
   */
  isBrowserSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if currently listening
   */
  isListening(): boolean {
    return this._isListening;
  }

  /**
   * Get current session
   */
  getCurrentSession(): VoiceSession | null {
    return this.currentSession;
  }

  /**
   * Register voice command
   */
  registerVoiceCommand(command: VoiceCommand): void {
    this.voiceCommands.set(command.id, command);
  }

  /**
   * Unregister voice command
   */
  unregisterVoiceCommand(commandId: string): void {
    this.voiceCommands.delete(commandId);
  }

  /**
   * Get voice commands
   */
  getVoiceCommands(category?: string, language?: string): VoiceCommand[] {
    const commands = Array.from(this.voiceCommands.values());
    return commands.filter(cmd => {
      if (category && cmd.category !== category) return false;
      if (language && cmd.language !== language) return false;
      return true;
    });
  }

  /**
   * Process voice input
   */
  async processVoiceInput(input: string, confidence: number = 1.0): Promise<VoiceProcessingResult> {
    if (confidence < this.config.confidence) {
      return {
        recognized: false,
        parameters: {},
        confidence,
        suggestions: this.generateSuggestions(),
        reason: 'Low confidence score'
      };
    }

    // Find matching command
    const currentLang = this.config.language.startsWith('ar') ? 'ar' : 'en';
    const commands = this.getVoiceCommands(undefined, currentLang);

    for (const command of commands) {
      const match = this.matchPattern(input, command.patterns);
      if (match.matches) {
        // Record in current session
        if (this.currentSession) {
          this.currentSession.inputs.push({
            text: input,
            confidence,
            timestamp: new Date(),
            recognized: true,
            command
          });
        }

        // Execute command handler
        if (command.handler) {
          command.handler({ query: input, parameters: match.parameters });
        }

        // Emit event
        this.emitEvent('voiceCommand', { command, input, parameters: match.parameters });

        return {
          recognized: true,
          command,
          parameters: match.parameters,
          confidence,
          suggestions: []
        };
      }
    }

    // Record unrecognized input
    if (this.currentSession) {
      this.currentSession.inputs.push({
        text: input,
        confidence,
        timestamp: new Date(),
        recognized: false
      });
    }

    return {
      recognized: false,
      parameters: {},
      confidence,
      suggestions: this.generateSuggestions()
    };
  }

  /**
   * Match input against command patterns
   */
  private matchPattern(input: string, patterns: string[]): { matches: boolean; parameters: Record<string, any> } {
    const normalizedInput = input.toLowerCase().trim();

    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase().trim();

      if (normalizedPattern === normalizedInput) {
        return { matches: true, parameters: {} };
      }

      // Handle wildcard patterns
      if (normalizedPattern.includes('*')) {
        const regex = normalizedPattern.replace(/\*/g, '(.+)');
        const match = normalizedInput.match(new RegExp('^' + regex + '$'));
        if (match) {
          const parameters: Record<string, any> = {};
          if (match[1]) {
            parameters['*'] = match[1].trim();
          }
          return { matches: true, parameters };
        }
      }
    }

    return { matches: false, parameters: {} };
  }

  /**
   * Generate suggestions for unrecognized input
   */
  private generateSuggestions(): string[] {
    const commands = this.getVoiceCommands();
    return commands.slice(0, 3).map(cmd => cmd.patterns[0]);
  }

  /**
   * Start new voice session
   */
  startVoiceSession(): string {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      inputs: [],
      language: this.config.language,
      isActive: true,
      metrics: {
        totalDuration: 0,
        wordCount: 0,
        commandCount: 0,
        averageConfidence: 0,
        errorCount: 0
      }
    };
    return sessionId;
  }

  /**
   * End current voice session
   */
  endVoiceSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.currentSession.isActive = false;
      this.sessionHistory.unshift(this.currentSession);
      if (this.sessionHistory.length > 50) {
        this.sessionHistory = this.sessionHistory.slice(0, 50);
      }
      this.currentSession = null;
    }
  }

  /**
   * Get session history
   */
  getSessionHistory(): VoiceSession[] {
    return [...this.sessionHistory];
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Toggle listening state
   */
  async toggleListening(): Promise<void> {
    if (this._isListening) {
      this.stopListening();
    } else {
      await this.startListening();
    }
  }

  /**
   * Get available microphones
   */
  async getAvailableMicrophones(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting microphones:', error);
      return [];
    }
  }

  /**
   * Set microphone device
   */
  async setMicrophoneDevice(deviceId: string): Promise<void> {
    this.selectedMicrophoneId = deviceId;
  }

  /**
   * Calibrate noise level
   */
  calibrateNoiseLevel(): Promise<number> {
    return new Promise((resolve) => {
      this.noiseCalibrationResolver = resolve;
      this.isNoiseCalibrating = true;

      // Simulate calibration process
      setTimeout(() => {
        if (this.isNoiseCalibrating) {
          this.stopNoiseCalibration();
        }
      }, 3000);
    });
  }

  /**
   * Stop noise calibration
   */
  stopNoiseCalibration(): void {
    this.isNoiseCalibrating = false;
    if (this.noiseCalibrationResolver) {
      this.noiseCalibrationResolver(this.currentNoiseLevel);
      this.noiseCalibrationResolver = null;
    }
  }

  /**
   * Get current noise level
   */
  getCurrentNoiseLevel(): number {
    return this.currentNoiseLevel;
  }

  /**
   * Text-to-speech functionality
   */
  async speak(text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (options) {
      if (options.rate) utterance.rate = options.rate;
      if (options.pitch) utterance.pitch = options.pitch;
      if (options.volume) utterance.volume = options.volume;
    }

    speechSynthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Check if speaking
   */
  isSpeaking(): boolean {
    return 'speechSynthesis' in window && speechSynthesis.speaking;
  }

  /**
   * Get recognition statistics
   */
  getRecognitionStatistics(): {
    totalSessions: number;
    totalInputs: number;
    successfulRecognitions: number;
    averageConfidence: number;
    commandUsage: Record<string, number>;
  } {
    const allSessions = this.currentSession ? [...this.sessionHistory, this.currentSession] : this.sessionHistory;
    const allInputs = allSessions.flatMap(session => session.inputs);
    const successfulRecognitions = allInputs.filter(input => input.recognized);

    const commandUsage: Record<string, number> = {};
    successfulRecognitions.forEach(input => {
      if (input.command) {
        commandUsage[input.command.id] = (commandUsage[input.command.id] || 0) + 1;
      }
    });

    const averageConfidence = allInputs.length > 0
      ? allInputs.reduce((sum, input) => sum + input.confidence, 0) / allInputs.length
      : 0;

    return {
      totalSessions: allSessions.length,
      totalInputs: allInputs.length,
      successfulRecognitions: successfulRecognitions.length,
      averageConfidence,
      commandUsage
    };
  }

  /**
   * Remove voice command
   */
  removeVoiceCommand(commandId: string): boolean {
    return this.voiceCommands.delete(commandId);
  }


  /**
   * Enable/disable voice command
   */
  setCommandEnabled(commandId: string, enabled: boolean): void {
    const command = this.voiceCommands.get(commandId);
    if (command) {
      command.enabled = enabled;
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA',
      'ar-SA', 'ar-EG', 'ar-AE',
      'es-ES', 'es-MX',
      'fr-FR', 'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN', 'zh-TW'
    ];
  }

  /**
   * Test microphone access
   */
  async testMicrophone(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get audio input devices
   */
  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      return [];
    }
  }

  /**
   * Calibrate noise level
   */
  async calibrateNoise(duration: number = 2000): Promise<number> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      source.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let sum = 0;
      let count = 0;

      const startTime = Date.now();

      const measure = () => {
        if (Date.now() - startTime < duration) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          sum += average;
          count++;
          requestAnimationFrame(measure);
        } else {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          this.noiseLevel = sum / count;
        }
      };

      measure();

      return this.noiseLevel;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get noise level
   */
  getNoiseLevel(): number {
    return this.noiseLevel;
  }
}

// Extend Window interface for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Export singleton instance
export const speechRecognitionService = SpeechRecognitionService.getInstance();