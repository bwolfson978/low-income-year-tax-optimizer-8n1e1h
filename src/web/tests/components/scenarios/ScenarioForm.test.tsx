import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react-hooks';
import { axe, toHaveNoViolations } from 'jest-axe';
import ScenarioForm from '../../../src/components/scenarios/ScenarioForm';
import { FilingStatus } from '../../../src/types/calculation.types';
import { VALIDATION_RULES, TAX_CONSTANTS } from '../../../src/lib/constants';
import { ScenarioFormData } from '../../../src/types/scenario.types';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../../src/hooks/useScenario', () => ({
  __esModule: true,
  default: () => ({
    createScenario: mockCreateScenario,
    updateScenario: mockUpdateScenario
  })
}));

jest.mock('../../../src/hooks/useToast', () => ({
  __esModule: true,
  default: () => ({
    toast: mockToast
  })
}));

// Mock functions
const mockOnSuccess = jest.fn();
const mockOnCancel = jest.fn();
const mockCreateScenario = jest.fn().mockResolvedValue({ id: 'test-id' });
const mockUpdateScenario = jest.fn().mockResolvedValue({ id: 'test-id' });
const mockToast = jest.fn();

// Helper function to render component with all required props
const renderScenarioForm = (props: Partial<any> = {}) => {
  const defaultProps = {
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
    isSubmitting: false,
    error: null,
    ...props
  };

  return {
    user: userEvent.setup(),
    ...render(<ScenarioForm {...defaultProps} />)
  };
};

// Helper function to generate valid test data
const mockValidScenarioData = (overrides: Partial<ScenarioFormData> = {}): ScenarioFormData => ({
  name: 'Test Scenario',
  description: 'Test Description',
  traditionalIRABalance: 100000,
  rothIRABalance: 50000,
  capitalGains: 25000,
  taxState: 'CA',
  filingStatus: FilingStatus.SINGLE,
  ...overrides
});

describe('ScenarioForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders all form fields with correct labels', () => {
      renderScenarioForm();

      expect(screen.getByLabelText(/Scenario Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Traditional IRA Balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Roth IRA Balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Capital Gains/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tax State/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filing Status/i)).toBeInTheDocument();
    });

    it('meets accessibility standards', async () => {
      const { container } = renderScenarioForm();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders with initial data when provided', () => {
      const initialData = mockValidScenarioData();
      renderScenarioForm({ initialData });

      expect(screen.getByDisplayValue(initialData.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(initialData.description)).toBeInTheDocument();
      expect(screen.getByDisplayValue(`$${initialData.traditionalIRABalance.toLocaleString()}`)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const { user } = renderScenarioForm();

      await user.click(screen.getByRole('button', { name: /create scenario/i }));

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/traditional ira balance is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/roth ira balance is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/capital gains is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/tax state is required/i)).toBeInTheDocument();
    });

    it('validates numeric field constraints', async () => {
      const { user } = renderScenarioForm();

      await user.type(screen.getByLabelText(/Traditional IRA Balance/i), '-1');
      await user.tab();

      expect(await screen.findByText(VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN)).toBeInTheDocument();

      await user.clear(screen.getByLabelText(/Traditional IRA Balance/i));
      await user.type(screen.getByLabelText(/Traditional IRA Balance/i), '6000000');
      await user.tab();

      expect(await screen.findByText(VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX)).toBeInTheDocument();
    });

    it('validates name field pattern', async () => {
      const { user } = renderScenarioForm();

      await user.type(screen.getByLabelText(/Scenario Name/i), '@invalid#name');
      await user.tab();

      expect(await screen.findByText(VALIDATION_RULES.SCENARIO_NAME.ERROR_MESSAGES.PATTERN)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles form submission with valid data', async () => {
      const { user } = renderScenarioForm();
      const validData = mockValidScenarioData();

      await user.type(screen.getByLabelText(/Scenario Name/i), validData.name);
      await user.type(screen.getByLabelText(/Description/i), validData.description);
      await user.type(screen.getByLabelText(/Traditional IRA Balance/i), validData.traditionalIRABalance.toString());
      await user.type(screen.getByLabelText(/Roth IRA Balance/i), validData.rothIRABalance.toString());
      await user.type(screen.getByLabelText(/Capital Gains/i), validData.capitalGains.toString());
      await user.selectOptions(screen.getByLabelText(/Tax State/i), validData.taxState);
      await user.selectOptions(screen.getByLabelText(/Filing Status/i), validData.filingStatus);

      await user.click(screen.getByRole('button', { name: /create scenario/i }));

      await waitFor(() => {
        expect(mockCreateScenario).toHaveBeenCalledWith(expect.objectContaining(validData));
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('handles form cancellation', async () => {
      const { user } = renderScenarioForm();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('disables submit button while submitting', () => {
      renderScenarioForm({ isSubmitting: true });

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays API error messages', () => {
      const error = new Error('API Error');
      renderScenarioForm({ error });

      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    it('shows validation errors in real-time', async () => {
      const { user } = renderScenarioForm();

      await user.type(screen.getByLabelText(/Traditional IRA Balance/i), 'invalid');
      await user.tab();

      expect(await screen.findByText(/please enter a valid number/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('debounces rapid user input', async () => {
      const { user } = renderScenarioForm();
      const input = screen.getByLabelText(/Traditional IRA Balance/i);

      await act(async () => {
        await user.type(input, '100');
        await user.type(input, '200');
        await user.type(input, '300');
      });

      // Wait for debounce
      await waitFor(() => {
        expect(input).toHaveValue('300');
      });
    });
  });
});