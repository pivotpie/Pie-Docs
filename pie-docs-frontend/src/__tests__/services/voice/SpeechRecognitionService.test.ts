import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SpeechRecognitionService, VoiceCommand, VoiceRecognitionConfig, VoiceSession } from '../../../services/voice/SpeechRecognitionService';

const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  serviceURI: '',
  grammars: null,
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null,
  onnomatch: null,
  onspeechstart: null,
  onspeechend: null,
  onaudiostart: null,
  onaudioend: null,
  onsoundstart: null,
  onsoundend: null
};

const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn()
};

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  pending: false,
  paused: false
};

Object.defineProperty(window, 'SpeechRecognition', {
  value: vi.fn(() => mockSpeechRecognition),
  writable: true,
  configurable: true
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: vi.fn(() => mockSpeechRecognition),
  writable: true,
  configurable: true
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: vi.fn(),
  writable: true,
  configurable: true
});

describe('SpeechRecognitionService', () => {
  let service: SpeechRecognitionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton
    (SpeechRecognitionService as any).instance = null;

    // Ensure mocks are available
    (window as any).SpeechRecognition = vi.fn(() => mockSpeechRecognition);
    (window as any).webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

    service = SpeechRecognitionService.getInstance();
    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    });
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      { deviceId: 'mic1', kind: 'audioinput', label: 'Default Microphone' }
    ]);
  });

  afterEach(() => {
    service.stopListening();
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should return singleton instance', () => {
      const instance1 = SpeechRecognitionService.getInstance();
      const instance2 = SpeechRecognitionService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check browser compatibility', () => {
      expect(service.isBrowserSupported()).toBe(true);
    });

    it('should get default configuration', () => {
      const config = service.getConfiguration();
      expect(config).toEqual({
        language: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        confidence: 0.7,
        noiseReduction: true,
        echoCancellation: true
      });
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', async () => {
      const newConfig: Partial<VoiceRecognitionConfig> = {
        language: 'ar-SA',
        continuous: false,
        confidence: 0.8
      };

      await service.updateConfiguration(newConfig);
      const config = service.getConfiguration();
      expect(config.language).toBe('ar-SA');
      expect(config.continuous).toBe(false);
      expect(config.confidence).toBe(0.8);
    });

    it('should validate configuration values', async () => {
      const invalidConfig = {
        confidence: 1.5,
        maxAlternatives: -1
      };

      await service.updateConfiguration(invalidConfig);
      const config = service.getConfiguration();
      expect(config.confidence).toBe(1.0);
      expect(config.maxAlternatives).toBe(1);
    });
  });

  describe('Voice Command Management', () => {
    const testCommand: VoiceCommand = {
      id: 'test-command',
      patterns: ['test pattern', 'test *'],
      description: 'Test command',
      category: 'test',
      language: 'en',
      handler: vi.fn(),
      enabled: true,
      confidence: 0.8
    };

    it('should register voice command', () => {
      service.registerVoiceCommand(testCommand);
      const commands = service.getVoiceCommands();
      expect(commands).toContain(testCommand);
    });

    it('should update existing voice command', () => {
      service.registerVoiceCommand(testCommand);
      const updatedCommand = { ...testCommand, description: 'Updated description' };

      service.registerVoiceCommand(updatedCommand);
      const commands = service.getVoiceCommands();
      const found = commands.find(c => c.id === 'test-command');
      expect(found?.description).toBe('Updated description');
    });

    it('should unregister voice command', () => {
      service.registerVoiceCommand(testCommand);
      service.unregisterVoiceCommand('test-command');

      const commands = service.getVoiceCommands();
      expect(commands.find(c => c.id === 'test-command')).toBeUndefined();
    });

    it('should get commands by category', () => {
      service.registerVoiceCommand(testCommand);
      const categoryCommands = service.getVoiceCommands('test');
      expect(categoryCommands).toHaveLength(1);
      expect(categoryCommands[0]).toBe(testCommand);
    });

    it('should filter commands by language', () => {
      const arabicCommand: VoiceCommand = {
        ...testCommand,
        id: 'arabic-command',
        language: 'ar'
      };

      service.registerVoiceCommand(testCommand);
      service.registerVoiceCommand(arabicCommand);

      const englishCommands = service.getVoiceCommands(undefined, 'en');
      expect(englishCommands).toHaveLength(1);
      expect(englishCommands[0].language).toBe('en');
    });
  });

  describe('Speech Recognition', () => {
    it('should start listening', async () => {
      await service.startListening();
      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(service.isListening()).toBe(true);
    });

    it('should stop listening', () => {
      service.stopListening();
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
      expect(service.isListening()).toBe(false);
    });

    it('should handle permission denied', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(service.startListening()).rejects.toThrow('Permission denied');
    });

    it('should toggle listening state', async () => {
      expect(service.isListening()).toBe(false);

      await service.toggleListening();
      expect(service.isListening()).toBe(true);

      await service.toggleListening();
      expect(service.isListening()).toBe(false);
    });
  });

  describe('Voice Command Processing', () => {
    beforeEach(() => {
      const searchCommand: VoiceCommand = {
        id: 'search',
        patterns: ['search for *', 'find *'],
        description: 'Search for documents',
        category: 'search',
        language: 'en',
        handler: vi.fn(),
        enabled: true,
        confidence: 0.8
      };
      service.registerVoiceCommand(searchCommand);
    });

    it('should process exact pattern match', async () => {
      const result = await service.processVoiceInput('search for reports');
      expect(result.recognized).toBe(true);
      expect(result.command?.id).toBe('search');
      expect(result.parameters).toEqual({ '*': 'reports' });
    });

    it('should process wildcard pattern match', async () => {
      const result = await service.processVoiceInput('find financial documents');
      expect(result.recognized).toBe(true);
      expect(result.command?.id).toBe('search');
      expect(result.parameters).toEqual({ '*': 'financial documents' });
    });

    it('should handle unrecognized input', async () => {
      const result = await service.processVoiceInput('unknown command');
      expect(result.recognized).toBe(false);
      expect(result.command).toBeUndefined();
      expect(result.suggestions).toEqual(expect.arrayContaining([
        expect.stringContaining('search for')
      ]));
    });

    it('should handle low confidence input', async () => {
      const result = await service.processVoiceInput('search for', 0.5);
      expect(result.recognized).toBe(false);
      expect(result.reason).toBe('Low confidence score');
    });

    it('should execute command handler', async () => {
      const handler = vi.fn();
      const command: VoiceCommand = {
        id: 'test-exec',
        patterns: ['execute test'],
        description: 'Test execution',
        category: 'test',
        language: 'en',
        handler,
        enabled: true,
        confidence: 0.8
      };

      service.registerVoiceCommand(command);
      await service.processVoiceInput('execute test');
      expect(handler).toHaveBeenCalledWith({ query: 'execute test', parameters: {} });
    });
  });

  describe('Session Management', () => {
    it('should start new voice session', () => {
      const sessionId = service.startVoiceSession();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toHaveLength(36); // UUID format
    });

    it('should get current session', () => {
      const sessionId = service.startVoiceSession();
      const session = service.getCurrentSession();
      expect(session?.id).toBe(sessionId);
      expect(session?.isActive).toBe(true);
    });

    it('should end voice session', () => {
      const sessionId = service.startVoiceSession();
      service.endVoiceSession();

      const session = service.getCurrentSession();
      expect(session?.isActive).toBe(false);
      expect(session?.endTime).toBeDefined();
    });

    it('should record voice input in session', async () => {
      service.startVoiceSession();
      await service.processVoiceInput('test input');

      const session = service.getCurrentSession();
      expect(session?.inputs).toHaveLength(1);
      expect(session?.inputs[0].text).toBe('test input');
    });

    it('should get session history', () => {
      const sessionId1 = service.startVoiceSession();
      service.endVoiceSession();

      const sessionId2 = service.startVoiceSession();
      service.endVoiceSession();

      const history = service.getSessionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe(sessionId2); // Most recent first
      expect(history[1].id).toBe(sessionId1);
    });
  });

  describe('Audio Device Management', () => {
    it('should get available microphones', async () => {
      const devices = await service.getAvailableMicrophones();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('mic1');
      expect(devices[0].label).toBe('Default Microphone');
    });

    it('should set microphone device', async () => {
      await service.setMicrophoneDevice('mic1');
      // Should not throw
    });

    it('should handle device enumeration failure', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Device access denied'));

      const devices = await service.getAvailableMicrophones();
      expect(devices).toEqual([]);
    });
  });

  describe('Noise Level Calibration', () => {
    it('should start noise calibration', async () => {
      const promise = service.calibrateNoiseLevel();

      // Simulate audio context and analysis
      setTimeout(() => {
        service.stopNoiseCalibration();
      }, 100);

      const noiseLevel = await promise;
      expect(typeof noiseLevel).toBe('number');
      expect(noiseLevel).toBeGreaterThanOrEqual(0);
    });

    it('should stop noise calibration', async () => {
      const promise = service.calibrateNoiseLevel();
      service.stopNoiseCalibration();

      const noiseLevel = await promise;
      expect(noiseLevel).toBe(0);
    });

    it('should get current noise level', () => {
      const noiseLevel = service.getCurrentNoiseLevel();
      expect(typeof noiseLevel).toBe('number');
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      service.addEventListener('voiceCommand', listener);
      service.removeEventListener('voiceCommand', listener);

      // Should not throw
    });

    it('should emit voice command events', async () => {
      const listener = vi.fn();
      service.addEventListener('voiceCommand', listener);

      const command: VoiceCommand = {
        id: 'test-event',
        patterns: ['test event'],
        description: 'Test event',
        category: 'test',
        language: 'en',
        handler: vi.fn(),
        enabled: true,
        confidence: 0.8
      };

      service.registerVoiceCommand(command);
      await service.processVoiceInput('test event');

      expect(listener).toHaveBeenCalled();
    });

    it('should emit recognition events', async () => {
      const startListener = vi.fn();
      const endListener = vi.fn();

      service.addEventListener('recognitionStart', startListener);
      service.addEventListener('recognitionEnd', endListener);

      await service.startListening();
      service.stopListening();

      expect(startListener).toHaveBeenCalled();
      expect(endListener).toHaveBeenCalled();
    });
  });

  describe('Text-to-Speech', () => {
    it('should speak text', async () => {
      await service.speak('Hello world');
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should speak with voice options', async () => {
      await service.speak('Hello world', {
        voice: 'en-US-female',
        rate: 1.2,
        pitch: 1.1,
        volume: 0.8
      });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should stop speaking', () => {
      service.stopSpeaking();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should check if speaking', () => {
      mockSpeechSynthesis.speaking = true;
      expect(service.isSpeaking()).toBe(true);

      mockSpeechSynthesis.speaking = false;
      expect(service.isSpeaking()).toBe(false);
    });
  });

  describe('Analytics and Metrics', () => {
    it('should get recognition statistics', () => {
      service.startVoiceSession();
      const stats = service.getRecognitionStatistics();

      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('totalInputs');
      expect(stats).toHaveProperty('successfulRecognitions');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('commandUsage');
    });

    it('should track command usage', async () => {
      const command: VoiceCommand = {
        id: 'tracked-command',
        patterns: ['track this'],
        description: 'Tracked command',
        category: 'test',
        language: 'en',
        handler: vi.fn(),
        enabled: true,
        confidence: 0.8
      };

      service.registerVoiceCommand(command);
      service.startVoiceSession();

      await service.processVoiceInput('track this');

      const stats = service.getRecognitionStatistics();
      expect(stats.commandUsage['tracked-command']).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle speech recognition errors', () => {
      const errorEvent = new Event('error') as any;
      errorEvent.error = 'network';

      const errorListener = vi.fn();
      service.addEventListener('recognitionError', errorListener);

      // Simulate error
      mockSpeechRecognition.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1](errorEvent);

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'network' })
      );
    });

    it('should handle microphone access errors', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('Microphone not available')
      );

      await expect(service.startListening()).rejects.toThrow('Microphone not available');
    });

    it('should gracefully handle unsupported browsers', () => {
      // Temporarily remove SpeechRecognition
      const originalSR = (window as any).SpeechRecognition;
      const originalWebkitSR = (window as any).webkitSpeechRecognition;

      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const newService = new (SpeechRecognitionService as any)();
      expect(newService.isBrowserSupported()).toBe(false);

      // Restore for other tests
      (window as any).SpeechRecognition = originalSR;
      (window as any).webkitSpeechRecognition = originalWebkitSR;
    });
  });

  describe('Multi-language Support', () => {
    it('should switch recognition language', async () => {
      await service.updateConfiguration({ language: 'ar-SA' });
      await service.startListening();

      expect(mockSpeechRecognition.lang).toBe('ar-SA');
    });

    it('should filter commands by current language', async () => {
      const englishCommand: VoiceCommand = {
        id: 'en-command',
        patterns: ['english command'],
        description: 'English command',
        category: 'test',
        language: 'en',
        handler: vi.fn(),
        enabled: true,
        confidence: 0.8
      };

      const arabicCommand: VoiceCommand = {
        id: 'ar-command',
        patterns: ['أمر عربي'],
        description: 'Arabic command',
        category: 'test',
        language: 'ar',
        handler: vi.fn(),
        enabled: true,
        confidence: 0.8
      };

      service.registerVoiceCommand(englishCommand);
      service.registerVoiceCommand(arabicCommand);

      await service.updateConfiguration({ language: 'ar-SA' });

      const result = await service.processVoiceInput('أمر عربي');
      expect(result.recognized).toBe(true);
      expect(result.command?.id).toBe('ar-command');
    });
  });
});