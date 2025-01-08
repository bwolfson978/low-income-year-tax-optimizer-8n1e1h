import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion'; // v10.0.0
import { Input } from '../ui/Input';
import { useForm } from '../../hooks/useForm';
import { useCalculation } from '../../hooks/useCalculation';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { CalculationFormData, FilingStatus } from '../../types/calculation.types';
import { VALIDATION_RULES, TAX_CONSTANTS } from '../../lib/constants';

interface CalculationFormProps {
  onCalculationComplete: (result: CalculationResult) => void;
  initialValues?: Partial<CalculationFormData>;
  className?: string;
}

const INITIAL_VALUES: CalculationFormData = {
  traditionalIRABalance: 0,
  rothIRABalance: 0,
  capitalGains: 0,
  taxState: '',
  filingStatus: FilingStatus.SINGLE,
  riskTolerance: 2,
  timeHorizon: 20
};

const CalculationForm: React.FC<CalculationFormProps> = ({
  onCalculationComplete,
  initialValues,
  className
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { calculateOptimization, loading, error: calculationError } = useCalculation();

  // Initialize form with validation and state management
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValid
  } = useForm<CalculationFormData>(
    { ...INITIAL_VALUES, ...initialValues },
    async (formData) => {
      try {
        const result = await calculateOptimization(formData);
        if (result) {
          onCalculationComplete(result);
          toast({
            message: 'Calculation completed successfully',
            type: 'success'
          });
        }
        return { success: true, data: result };
      } catch (error) {
        toast({
          message: error.message || 'Calculation failed',
          type: 'error'
        });
        return { success: false, error };
      }
    }
  );

  // Handle form submission with validation
  const onSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    await handleSubmit();
  }, [handleSubmit]);

  // Effect to handle calculation errors
  useEffect(() => {
    if (calculationError) {
      toast({
        message: calculationError,
        type: 'error',
        duration: 5000
      });
    }
  }, [calculationError, toast]);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={className}
      noValidate
      aria-label="Tax Optimization Calculator"
    >
      <div className="space-y-6">
        {/* Traditional IRA Balance Input */}
        <Input
          id="traditionalIRABalance"
          name="traditionalIRABalance"
          type="currency"
          label="Traditional IRA Balance"
          value={values.traditionalIRABalance}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.traditionalIRABalance ? errors.traditionalIRABalance?.message : undefined}
          min={VALIDATION_RULES.IRA_BALANCE.MIN}
          max={VALIDATION_RULES.IRA_BALANCE.MAX}
          required
          disabled={isSubmitting}
          ariaLabel="Enter your Traditional IRA balance"
        />

        {/* Roth IRA Balance Input */}
        <Input
          id="rothIRABalance"
          name="rothIRABalance"
          type="currency"
          label="Roth IRA Balance"
          value={values.rothIRABalance}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.rothIRABalance ? errors.rothIRABalance?.message : undefined}
          min={VALIDATION_RULES.IRA_BALANCE.MIN}
          max={VALIDATION_RULES.IRA_BALANCE.MAX}
          required
          disabled={isSubmitting}
          ariaLabel="Enter your Roth IRA balance"
        />

        {/* Capital Gains Input */}
        <Input
          id="capitalGains"
          name="capitalGains"
          type="currency"
          label="Capital Gains"
          value={values.capitalGains}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.capitalGains ? errors.capitalGains?.message : undefined}
          min={VALIDATION_RULES.CAPITAL_GAINS.MIN}
          max={VALIDATION_RULES.CAPITAL_GAINS.MAX}
          required
          disabled={isSubmitting}
          ariaLabel="Enter your capital gains amount"
        />

        {/* Tax State Selection */}
        <div className="form-field">
          <label
            htmlFor="taxState"
            className="block text-sm font-medium mb-1"
          >
            State of Residence
          </label>
          <select
            id="taxState"
            name="taxState"
            value={values.taxState}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
            }`}
            required
            disabled={isSubmitting}
            aria-invalid={!!errors.taxState}
            aria-describedby={errors.taxState ? 'taxState-error' : undefined}
          >
            <option value="">Select State</option>
            {TAX_CONSTANTS.SUPPORTED_STATES.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {touched.taxState && errors.taxState && (
            <p id="taxState-error" className="mt-1 text-sm text-red-500" role="alert">
              {errors.taxState.message}
            </p>
          )}
        </div>

        {/* Filing Status Selection */}
        <div className="form-field">
          <label
            htmlFor="filingStatus"
            className="block text-sm font-medium mb-1"
          >
            Filing Status
          </label>
          <select
            id="filingStatus"
            name="filingStatus"
            value={values.filingStatus}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
            }`}
            required
            disabled={isSubmitting}
            aria-invalid={!!errors.filingStatus}
            aria-describedby={errors.filingStatus ? 'filingStatus-error' : undefined}
          >
            {Object.entries(TAX_CONSTANTS.FILING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {touched.filingStatus && errors.filingStatus && (
            <p id="filingStatus-error" className="mt-1 text-sm text-red-500" role="alert">
              {errors.filingStatus.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white
            ${isValid && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
            } transition-colors`}
          disabled={!isValid || isSubmitting}
          whileTap={{ scale: 0.98 }}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="ml-2">Calculating...</span>
            </span>
          ) : (
            'Calculate Optimization'
          )}
        </motion.button>
      </div>
    </form>
  );
};

export default CalculationForm;