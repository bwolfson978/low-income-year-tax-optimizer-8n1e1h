import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Logger } from 'winston';
import { ScenarioService } from '../../../src/services/scenario.service';
import { ScenarioModel } from '../../../src/models/scenario.model';
import { Scenario, ScenarioCreationRequest } from '../../../src/types/scenario.types';
import { FilingStatus } from '../../../src/types/tax.types';
import { APIErrorCode } from '../../../src/types/api.types';

// Mock implementations
jest.mock('../../../src/models/scenario.model');
jest.mock('winston');

describe('ScenarioService', () => {
  let mockScenarioModel: jest.Mocked<ScenarioModel>;
  let mockLogger: jest.Mocked<Logger>;
  let scenarioService: ScenarioService;

  // Valid test data
  const validScenarioData: ScenarioCreationRequest = {
    trad_ira_balance: 100000,
    roth_ira_balance: 50000,
    capital_gains: 25000,
    tax_state: 'CA',
    filing_status: FilingStatus.SINGLE,
    time_horizon: 20,
    risk_tolerance: 3
  };

  const mockScenario: Scenario = {
    id: 'test-scenario-id',
    user_id: 'test-user-id',
    version: 1,
    ...validScenarioData,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    // Reset all mocks
    mockScenarioModel = {
      createScenario: jest.fn(),
      updateScenario: jest.fn(),
      getScenario: jest.fn(),
      getUserScenarios: jest.fn(),
      deleteScenario: jest.fn()
    } as unknown as jest.Mocked<ScenarioModel>;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    scenarioService = new ScenarioService(mockScenarioModel, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createScenario', () => {
    it('should create a new scenario with valid data', async () => {
      mockScenarioModel.createScenario.mockResolvedValue(mockScenario);

      const result = await scenarioService.createScenario('test-user-id', validScenarioData);

      expect(result).toEqual(mockScenario);
      expect(mockScenarioModel.createScenario).toHaveBeenCalledWith('test-user-id', validScenarioData);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Creating new scenario',
        expect.objectContaining({
          userId: 'test-user-id',
          action: 'CREATE_SCENARIO'
        })
      );
    });

    it('should validate IRA balance ranges', async () => {
      const invalidData = {
        ...validScenarioData,
        trad_ira_balance: 5_000_001 // Exceeds maximum
      };

      await expect(
        scenarioService.createScenario('test-user-id', invalidData)
      ).rejects.toThrow('Traditional IRA balance out of valid range');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate state code format', async () => {
      const invalidData = {
        ...validScenarioData,
        tax_state: 'XX' // Invalid state code
      };

      await expect(
        scenarioService.createScenario('test-user-id', invalidData)
      ).rejects.toThrow('Invalid state code');
    });

    it('should enforce cross-field validation rules', async () => {
      const invalidData = {
        ...validScenarioData,
        trad_ira_balance: 3_000_000,
        roth_ira_balance: 3_000_000 // Combined exceeds maximum
      };

      await expect(
        scenarioService.createScenario('test-user-id', invalidData)
      ).rejects.toThrow('Combined IRA balances cannot exceed maximum limit');
    });

    it('should log security audit trail on creation', async () => {
      mockScenarioModel.createScenario.mockResolvedValue(mockScenario);

      await scenarioService.createScenario('test-user-id', validScenarioData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully created scenario',
        expect.objectContaining({
          userId: 'test-user-id',
          scenarioId: mockScenario.id,
          action: 'SCENARIO_CREATED'
        })
      );
    });
  });

  describe('updateScenario', () => {
    it('should update an existing scenario with valid data', async () => {
      const updateData = {
        trad_ira_balance: 150000
      };

      const updatedScenario = {
        ...mockScenario,
        ...updateData,
        version: 2
      };

      mockScenarioModel.updateScenario.mockResolvedValue(updatedScenario);

      const result = await scenarioService.updateScenario(
        'test-user-id',
        'test-scenario-id',
        updateData
      );

      expect(result).toEqual(updatedScenario);
      expect(mockScenarioModel.updateScenario).toHaveBeenCalledWith(
        'test-scenario-id',
        'test-user-id',
        updateData
      );
    });

    it('should validate partial updates', async () => {
      const invalidUpdate = {
        risk_tolerance: 6 // Exceeds maximum
      };

      await expect(
        scenarioService.updateScenario('test-user-id', 'test-scenario-id', invalidUpdate)
      ).rejects.toThrow('Risk tolerance out of valid range');
    });

    it('should maintain audit trail for updates', async () => {
      const updateData = { time_horizon: 25 };
      mockScenarioModel.updateScenario.mockResolvedValue({
        ...mockScenario,
        ...updateData
      });

      await scenarioService.updateScenario('test-user-id', 'test-scenario-id', updateData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully updated scenario',
        expect.objectContaining({
          userId: 'test-user-id',
          scenarioId: 'test-scenario-id',
          action: 'SCENARIO_UPDATED'
        })
      );
    });
  });

  describe('getScenario', () => {
    it('should retrieve a scenario with proper authorization', async () => {
      mockScenarioModel.getScenario.mockResolvedValue(mockScenario);

      const result = await scenarioService.getScenario('test-user-id', 'test-scenario-id');

      expect(result).toEqual(mockScenario);
      expect(mockScenarioModel.getScenario).toHaveBeenCalledWith('test-scenario-id', 'test-user-id');
    });

    it('should handle unauthorized access attempts', async () => {
      mockScenarioModel.getScenario.mockRejectedValue(new Error('Scenario not found or access denied'));

      await expect(
        scenarioService.getScenario('wrong-user-id', 'test-scenario-id')
      ).rejects.toThrow('Scenario not found or access denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to retrieve scenario',
        expect.objectContaining({
          userId: 'wrong-user-id',
          scenarioId: 'test-scenario-id',
          action: 'GET_SCENARIO_ERROR'
        })
      );
    });
  });

  describe('getUserScenarios', () => {
    it('should retrieve paginated scenarios for a user', async () => {
      const mockPaginatedResponse = {
        scenarios: [mockScenario],
        total: 1
      };

      mockScenarioModel.getUserScenarios.mockResolvedValue(mockPaginatedResponse);

      const result = await scenarioService.getUserScenarios('test-user-id', 1, 10);

      expect(result.items).toEqual([mockScenario]);
      expect(result.totalItems).toBe(1);
      expect(mockScenarioModel.getUserScenarios).toHaveBeenCalledWith('test-user-id', 1, 10);
    });

    it('should apply proper pagination limits', async () => {
      await scenarioService.getUserScenarios('test-user-id', 0, 100);

      expect(mockScenarioModel.getUserScenarios).toHaveBeenCalledWith('test-user-id', 1, 10);
    });
  });

  describe('deleteScenario', () => {
    it('should delete a scenario with proper authorization', async () => {
      mockScenarioModel.deleteScenario.mockResolvedValue(undefined);

      await scenarioService.deleteScenario('test-user-id', 'test-scenario-id');

      expect(mockScenarioModel.deleteScenario).toHaveBeenCalledWith('test-scenario-id', 'test-user-id');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully deleted scenario',
        expect.objectContaining({
          userId: 'test-user-id',
          scenarioId: 'test-scenario-id',
          action: 'SCENARIO_DELETED'
        })
      );
    });

    it('should handle unauthorized deletion attempts', async () => {
      mockScenarioModel.deleteScenario.mockRejectedValue(new Error('Scenario not found or access denied'));

      await expect(
        scenarioService.deleteScenario('wrong-user-id', 'test-scenario-id')
      ).rejects.toThrow('Scenario not found or access denied');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});