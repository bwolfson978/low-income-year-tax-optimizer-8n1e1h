import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import { vi, describe, it, expect, beforeEach } from 'vitest'; // v0.34.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { CalculationForm } from '../../../../src/components/calculator/CalculationForm';
import { useCalculation } from '../../../../src/hooks/useCalculation';
import { CalculationFormData, FilingStatus, TaxState } from '../../../../src/types/calculation.types';
import { VALIDATION_RULES, TAX_CONSTANTS } from '../../../../src/lib/constants';

// Mock the calculation hook
vi.mock('../../../../src/hooks/useCalculation', () => ({
  useCalculation: vi.fn()
}));

// Mock the toast hook
vi.mock('../../../../src/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock the theme hook
vi.mock('../../../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light'
  })
}));

// Test constants
const mockCalculateOptimization = vi.fn().mockResolvedValue({ success: true });
const mockOnCalculationComplete = vi.fn();

const validFormData: CalculationFormData = {
  traditionalIRABalance: 100000,
  rothIRABalance: 50000,
  capitalGains: 25000,
  taxState: 'CA',
  filingStatus: FilingStatus.SINGLE,
  riskTolerance: 2,
  timeHorizon: 20
};

const testIds = {
  form: 'calculation-form',
  traditionalIRA: 'traditional-ira-input',
  rothIRA: 'roth-ira-input',
  capitalGains: 'capital-gains-input',
  taxState: 'tax-state-select',
  filingStatus: 'filing-status-select',
  submitButton: 'calculate-button',
  loadingSpinner: 'loading-spinner',
  errorMessage: 'error-message'
};

describe('CalculationForm Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useCalculation as jest.Mock).mockReturnValue({
      calculateOptimization: mockCalculateOptimization,
      loading: false,
      error: null
    });
  });

  // Helper function to render component with test props
  const renderCalculationForm = (props = {}) => {
    const user = userEvent.setup();
    const result = render(
      <CalculationForm
        onCalculationComplete={mockOnCalculationComplete}
        {...props}
      />
    );
    return { ...result, user };
  };

  // Helper function to fill form with valid data
  const fillFormWithValidData = async (user: ReturnType<typeof userEvent.setup>) => {
    const traditionalInput = screen.getByLabelText(/Traditional IRA Balance/i);
    const rothInput = screen.getByLabelText(/Roth IRA Balance/i);
    const gainsInput = screen.getByLabelText(/Capital Gains/i);
    const stateSelect = screen.getByLabelText(/State of Residence/i);
    const statusSelect = screen.getByLabelText(/Filing Status/i);

    await user.type(traditionalInput, '100000');
    await user.type(rothInput, '50000');
    await user.type(gainsInput, '25000');
    await user.selectOptions(stateSelect, 'CA');
    await user.selectOptions(statusSelect, FilingStatus.SINGLE);
  };

  describe('Form Rendering', () => {
    it('renders all form inputs with correct labels and placeholders', () => {
      renderCalculationForm();

      expect(screen.getByLabelText(/Traditional IRA Balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Roth IRA Balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Capital Gains/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/State of Residence/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filing Status/i)).toBeInTheDocument();
    });

    it('applies proper ARIA labels and roles for accessibility', () => {
      renderCalculationForm();
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Tax Optimization Calculator');
      
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toHaveAttribute('aria-invalid', 'false');
      });
    });

    it('renders tax state dropdown with all US states', () => {
      renderCalculationForm();
      
      const stateSelect = screen.getByLabelText(/State of Residence/i);
      const options = within(stateSelect).getAllByRole('option');
      
      expect(options.length).toBe(TAX_CONSTANTS.SUPPORTED_STATES.length + 1); // +1 for placeholder
      TAX_CONSTANTS.SUPPORTED_STATES.forEach(state => {
        expect(screen.getByRole('option', { name: state })).toBeInTheDocument();
      });
    });
  });

  describe('Input Validation', () => {
    it('validates required fields on submission', async () => {
      const { user } = renderCalculationForm();
      
      await user.click(screen.getByRole('button', { name: /Calculate/i }));
      
      expect(await screen.findAllByRole('alert')).toHaveLength(5); // All required fields
    });

    it('validates minimum values for financial inputs', async () => {
      const { user } = renderCalculationForm();
      
      const traditionalInput = screen.getByLabelText(/Traditional IRA Balance/i);
      await user.type(traditionalInput, '-1');
      await user.tab();
      
      expect(await screen.findByRole('alert')).toHaveTextContent(
        VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN
      );
    });

    it('validates maximum values for financial inputs', async () => {
      const { user } = renderCalculationForm();
      
      const traditionalInput = screen.getByLabelText(/Traditional IRA Balance/i);
      await user.type(traditionalInput, '6000000');
      await user.tab();
      
      expect(await screen.findByRole('alert')).toHaveTextContent(
        VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX
      );
    });
  });

  describe('Form Submission', () => {
    it('handles valid form submission correctly', async () => {
      const { user } = renderCalculationForm();
      await fillFormWithValidData(user);
      
      await user.click(screen.getByRole('button', { name: /Calculate/i }));
      
      await waitFor(() => {
        expect(mockCalculateOptimization).toHaveBeenCalledWith(expect.objectContaining(validFormData));
        expect(mockOnCalculationComplete).toHaveBeenCalled();
      });
    });

    it('displays loading state during calculation', async () => {
      (useCalculation as jest.Mock).mockReturnValue({
        calculateOptimization: vi.fn(() => new Promise(resolve => setTimeout(resolve, 100))),
        loading: true,
        error: null
      });

      const { user } = renderCalculationForm();
      await fillFormWithValidData(user);
      
      await user.click(screen.getByRole('button', { name: /Calculate/i }));
      
      expect(screen.getByText(/Calculating/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Calculate/i })).toBeDisabled();
    });

    it('handles calculation errors appropriately', async () => {
      const errorMessage = 'Calculation failed';
      (useCalculation as jest.Mock).mockReturnValue({
        calculateOptimization: vi.fn().mockRejectedValue(new Error(errorMessage)),
        loading: false,
        error: errorMessage
      });

      const { user } = renderCalculationForm();
      await fillFormWithValidData(user);
      
      await user.click(screen.getByRole('button', { name: /Calculate/i }));
      
      expect(await screen.findByRole('alert')).toHaveTextContent(errorMessage);
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const { user } = renderCalculationForm();
      
      await user.tab(); // Focus first input
      expect(screen.getByLabelText(/Traditional IRA Balance/i)).toHaveFocus();
      
      await user.tab(); // Focus second input
      expect(screen.getByLabelText(/Roth IRA Balance/i)).toHaveFocus();
    });

    it('announces validation errors to screen readers', async () => {
      const { user } = renderCalculationForm();
      
      const traditionalInput = screen.getByLabelText(/Traditional IRA Balance/i);
      await user.type(traditionalInput, '-1');
      await user.tab();
      
      const error = await screen.findByRole('alert');
      expect(error).toHaveAttribute('aria-live', 'polite');
    });

    it('maintains focus management during form submission', async () => {
      const { user } = renderCalculationForm();
      await fillFormWithValidData(user);
      
      const submitButton = screen.getByRole('button', { name: /Calculate/i });
      await user.click(submitButton);
      
      expect(submitButton).toHaveFocus();
    });
  });
});