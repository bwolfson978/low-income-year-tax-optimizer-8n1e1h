import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // v7.0.0
import * as yup from 'yup'; // v1.3.0
import { Input } from '../ui/Input';
import useScenario from '../../hooks/useScenario';
import { ScenarioFormData } from '../../types/scenario.types';
import { FilingStatus } from '../../types/calculation.types';
import { VALIDATION_RULES, TAX_CONSTANTS } from '../../lib/constants';
import useToast from '../../hooks/useToast';

interface ScenarioFormProps {
  initialData?: ScenarioFormData;
  onSuccess: (scenario: ScenarioFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: Error | null;
}

// Validation schema using yup
const validationSchema = yup.object().shape({
  name: yup.string()
    .required('Name is required')
    .min(VALIDATION_RULES.SCENARIO_NAME.MIN_LENGTH, VALIDATION_RULES.SCENARIO_NAME.ERROR_MESSAGES.MIN)
    .max(VALIDATION_RULES.SCENARIO_NAME.MAX_LENGTH, VALIDATION_RULES.SCENARIO_NAME.ERROR_MESSAGES.MAX)
    .matches(VALIDATION_RULES.SCENARIO_NAME.PATTERN, VALIDATION_RULES.SCENARIO_NAME.ERROR_MESSAGES.PATTERN),
  description: yup.string().optional(),
  traditionalIRABalance: yup.number()
    .required('Traditional IRA balance is required')
    .min(VALIDATION_RULES.IRA_BALANCE.MIN, VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN)
    .max(VALIDATION_RULES.IRA_BALANCE.MAX, VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX),
  rothIRABalance: yup.number()
    .required('Roth IRA balance is required')
    .min(VALIDATION_RULES.IRA_BALANCE.MIN, VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MIN)
    .max(VALIDATION_RULES.IRA_BALANCE.MAX, VALIDATION_RULES.IRA_BALANCE.ERROR_MESSAGES.MAX),
  capitalGains: yup.number()
    .required('Capital gains is required')
    .min(VALIDATION_RULES.CAPITAL_GAINS.MIN, VALIDATION_RULES.CAPITAL_GAINS.ERROR_MESSAGES.MIN)
    .max(VALIDATION_RULES.CAPITAL_GAINS.MAX, VALIDATION_RULES.CAPITAL_GAINS.ERROR_MESSAGES.MAX),
  taxState: yup.string()
    .required('Tax state is required')
    .oneOf(TAX_CONSTANTS.SUPPORTED_STATES, 'Invalid state selection'),
  filingStatus: yup.string()
    .required('Filing status is required')
    .oneOf(Object.values(FilingStatus), 'Invalid filing status')
});

export const ScenarioForm: React.FC<ScenarioFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  isSubmitting,
  error
}) => {
  const { createScenario, updateScenario } = useScenario();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<ScenarioFormData>({
    defaultValues: initialData || {
      name: '',
      description: '',
      traditionalIRABalance: 0,
      rothIRABalance: 0,
      capitalGains: 0,
      taxState: '',
      filingStatus: FilingStatus.SINGLE
    },
    resolver: async (data) => {
      try {
        const values = await validationSchema.validate(data, { abortEarly: false });
        return { values, errors: {} };
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          const errors = err.inner.reduce((acc, error) => {
            if (error.path) {
              acc[error.path] = { message: error.message, type: 'validation' };
            }
            return acc;
          }, {} as Record<string, { message: string; type: string; }>);
          return { values: {}, errors };
        }
        return { values: {}, errors: {} };
      }
    }
  });

  // Handle form submission
  const onSubmit = useCallback(async (data: ScenarioFormData) => {
    try {
      const result = initialData
        ? await updateScenario(initialData.id!, data)
        : await createScenario(data);

      toast.toast({
        message: `Scenario ${initialData ? 'updated' : 'created'} successfully`,
        type: 'success'
      });

      onSuccess(result);
      reset(data);
    } catch (err) {
      toast.toast({
        message: `Failed to ${initialData ? 'update' : 'create'} scenario`,
        type: 'error'
      });
    }
  }, [initialData, createScenario, updateScenario, onSuccess, reset, toast]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl mx-auto p-4 md:p-6 bg-background rounded-lg shadow-sm border border-border"
      noValidate
    >
      <div className="space-y-4">
        <Input
          id="name"
          label="Scenario Name"
          type="text"
          error={errors.name?.message}
          {...register('name')}
          required
          aria-describedby={errors.name ? 'name-error' : undefined}
        />

        <Input
          id="description"
          label="Description"
          type="text"
          error={errors.description?.message}
          {...register('description')}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />

        <Input
          id="traditionalIRABalance"
          label="Traditional IRA Balance"
          type="currency"
          error={errors.traditionalIRABalance?.message}
          {...register('traditionalIRABalance')}
          required
          min={VALIDATION_RULES.IRA_BALANCE.MIN}
          max={VALIDATION_RULES.IRA_BALANCE.MAX}
          aria-describedby={errors.traditionalIRABalance ? 'traditionalIRA-error' : undefined}
        />

        <Input
          id="rothIRABalance"
          label="Roth IRA Balance"
          type="currency"
          error={errors.rothIRABalance?.message}
          {...register('rothIRABalance')}
          required
          min={VALIDATION_RULES.IRA_BALANCE.MIN}
          max={VALIDATION_RULES.IRA_BALANCE.MAX}
          aria-describedby={errors.rothIRABalance ? 'rothIRA-error' : undefined}
        />

        <Input
          id="capitalGains"
          label="Capital Gains"
          type="currency"
          error={errors.capitalGains?.message}
          {...register('capitalGains')}
          required
          min={VALIDATION_RULES.CAPITAL_GAINS.MIN}
          max={VALIDATION_RULES.CAPITAL_GAINS.MAX}
          aria-describedby={errors.capitalGains ? 'capitalGains-error' : undefined}
        />

        <div className="space-y-2">
          <label 
            htmlFor="taxState" 
            className="text-sm font-medium text-foreground"
          >
            Tax State
          </label>
          <select
            id="taxState"
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            {...register('taxState')}
            aria-describedby={errors.taxState ? 'taxState-error' : undefined}
          >
            <option value="">Select a state</option>
            {TAX_CONSTANTS.SUPPORTED_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.taxState && (
            <p id="taxState-error" className="text-sm text-destructive">
              {errors.taxState.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="filingStatus" 
            className="text-sm font-medium text-foreground"
          >
            Filing Status
          </label>
          <select
            id="filingStatus"
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            {...register('filingStatus')}
            aria-describedby={errors.filingStatus ? 'filingStatus-error' : undefined}
          >
            {Object.entries(TAX_CONSTANTS.FILING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.filingStatus && (
            <p id="filingStatus-error" className="text-sm text-destructive">
              {errors.filingStatus.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="text-destructive text-sm" role="alert">
          {error.message}
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'} Scenario
        </button>
      </div>
    </form>
  );
};

export default ScenarioForm;