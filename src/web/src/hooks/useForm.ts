import { useState, useCallback } from 'react'; // ^18.0.0
import { validateCalculationInput, validateScenarioInput } from '../utils/validation-helpers';
import type { APIResponse } from '../types/api.types';

// Constants for form management
const DEFAULT_ERROR_MESSAGE = 'An error occurred. Please try again.';
const VALIDATION_DEBOUNCE_MS = 300;
const FORM_PERSISTENCE_KEY = 'form_state';

/**
 * Interface for form validation options
 */
interface ValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  persistState?: boolean;
  debounceMs?: number;
}

/**
 * Interface for form field errors with accessibility support
 */
interface FieldError {
  message: string;
  type: string;
  ariaLabel?: string;
}

/**
 * Type for form field touched state tracking
 */
type TouchedFields<T> = {
  [K in keyof T]?: boolean;
};

/**
 * Type for form validation errors
 */
type FormErrors<T> = {
  [K in keyof T]?: FieldError;
};

/**
 * Enhanced form state management hook with validation and accessibility support
 * @param initialValues Initial form values
 * @param onSubmit Form submission handler
 * @param validateFn Custom validation function
 * @param options Form validation options
 */
export default function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<APIResponse>,
  validateFn?: (values: T) => Promise<{ success: boolean; error?: string }>,
  options: ValidationOptions = {}
) {
  // Destructure options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    persistState = true,
    debounceMs = VALIDATION_DEBOUNCE_MS
  } = options;

  // Initialize form state
  const [values, setValues] = useState<T>(() => {
    if (persistState) {
      const savedState = localStorage.getItem(FORM_PERSISTENCE_KEY);
      return savedState ? JSON.parse(savedState) : initialValues;
    }
    return initialValues;
  });

  // Form state management
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Validation cache for debouncing
  let validationTimeout: NodeJS.Timeout;

  /**
   * Validates the entire form or a specific field
   * @param fieldName Optional field name for single-field validation
   */
  const validateForm = useCallback(async (fieldName?: keyof T) => {
    try {
      const valuesToValidate = fieldName ? { [fieldName]: values[fieldName] } : values;
      
      // Use appropriate validation function based on form type
      const validationFn = validateFn || (
        'traditionalIRABalance' in values 
          ? validateCalculationInput 
          : validateScenarioInput
      );

      const result = await validationFn(valuesToValidate as any);

      if (!result.success) {
        const newErrors = {
          ...errors,
          [fieldName || '']: {
            message: result.error || DEFAULT_ERROR_MESSAGE,
            type: 'validation',
            ariaLabel: `Error in ${String(fieldName)}: ${result.error}`
          }
        };
        setErrors(newErrors);
        setIsValid(false);
        return false;
      }

      // Clear errors for validated fields
      const newErrors = { ...errors };
      if (fieldName) {
        delete newErrors[fieldName];
      } else {
        setErrors({});
      }
      setIsValid(Object.keys(newErrors).length === 0);
      return true;
    } catch (error) {
      setErrors({
        ...errors,
        form: {
          message: DEFAULT_ERROR_MESSAGE,
          type: 'system',
          ariaLabel: 'Form validation error'
        }
      });
      setIsValid(false);
      return false;
    }
  }, [values, errors, validateFn]);

  /**
   * Handles field value changes with debounced validation
   */
  const handleChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const newValue = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value;

    setValues(prev => {
      const newValues = { ...prev, [name]: newValue };
      if (persistState) {
        localStorage.setItem(FORM_PERSISTENCE_KEY, JSON.stringify(newValues));
      }
      return newValues;
    });
    setIsDirty(true);

    if (validateOnChange) {
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(() => {
        validateForm(name as keyof T);
      }, debounceMs);
    }
  }, [validateOnChange, debounceMs, persistState]);

  /**
   * Handles field blur events with validation
   */
  const handleBlur = useCallback((
    event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validateOnBlur) {
      validateForm(name as keyof T);
    }
  }, [validateOnBlur]);

  /**
   * Handles form submission with error boundary
   */
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setIsSubmitting(true);
    try {
      const isFormValid = await validateForm();
      if (!isFormValid) {
        return;
      }

      const response = await onSubmit(values);
      if (!response.success) {
        setErrors({
          form: {
            message: response.error?.message || DEFAULT_ERROR_MESSAGE,
            type: 'submission',
            ariaLabel: 'Form submission error'
          }
        });
        return;
      }

      // Reset form state on successful submission
      if (persistState) {
        localStorage.removeItem(FORM_PERSISTENCE_KEY);
      }
      setIsDirty(false);
      setTouched({});
    } catch (error) {
      setErrors({
        form: {
          message: DEFAULT_ERROR_MESSAGE,
          type: 'system',
          ariaLabel: 'System error occurred'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, persistState]);

  /**
   * Resets form to initial state
   */
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsValid(true);
    if (persistState) {
      localStorage.removeItem(FORM_PERSISTENCE_KEY);
    }
  }, [initialValues, persistState]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue: (field: keyof T, value: any) => {
      setValues(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);
      if (validateOnChange) {
        validateForm(field);
      }
    },
    setFieldTouched: (field: keyof T, isTouched: boolean = true) => {
      setTouched(prev => ({ ...prev, [field]: isTouched }));
    },
    validateField: (field: keyof T) => validateForm(field),
    validateForm
  };
}