import Decimal from 'decimal.js'; // v10.4.3
import { CalculationFormData, FilingStatus } from '../types/calculation.types';
import { formatCurrency } from './currency-helpers';

// Configure Decimal.js for high precision calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Tax bracket constants with precise decimal rates
const FEDERAL_TAX_BRACKETS = {
  [FilingStatus.SINGLE]: [
    { rate: new Decimal('0.10'), maxIncome: new Decimal('11000') },
    { rate: new Decimal('0.12'), maxIncome: new Decimal('44725') },
    { rate: new Decimal('0.22'), maxIncome: new Decimal('95375') },
    { rate: new Decimal('0.24'), maxIncome: new Decimal('182100') },
    { rate: new Decimal('0.32'), maxIncome: new Decimal('231250') },
    { rate: new Decimal('0.35'), maxIncome: new Decimal('578125') },
    { rate: new Decimal('0.37'), maxIncome: new Decimal('Infinity') }
  ],
  [FilingStatus.MARRIED_JOINT]: [
    { rate: new Decimal('0.10'), maxIncome: new Decimal('22000') },
    { rate: new Decimal('0.12'), maxIncome: new Decimal('89450') },
    { rate: new Decimal('0.22'), maxIncome: new Decimal('190750') },
    { rate: new Decimal('0.24'), maxIncome: new Decimal('364200') },
    { rate: new Decimal('0.32'), maxIncome: new Decimal('462500') },
    { rate: new Decimal('0.35'), maxIncome: new Decimal('693750') },
    { rate: new Decimal('0.37'), maxIncome: new Decimal('Infinity') }
  ],
  [FilingStatus.HEAD_OF_HOUSEHOLD]: [
    { rate: new Decimal('0.10'), maxIncome: new Decimal('15700') },
    { rate: new Decimal('0.12'), maxIncome: new Decimal('59850') },
    { rate: new Decimal('0.22'), maxIncome: new Decimal('95350') },
    { rate: new Decimal('0.24'), maxIncome: new Decimal('182100') },
    { rate: new Decimal('0.32'), maxIncome: new Decimal('231250') },
    { rate: new Decimal('0.35'), maxIncome: new Decimal('578100') },
    { rate: new Decimal('0.37'), maxIncome: new Decimal('Infinity') }
  ]
};

const LONG_TERM_CAPITAL_GAINS_RATES = {
  [FilingStatus.SINGLE]: [
    { rate: new Decimal('0.00'), maxIncome: new Decimal('44625') },
    { rate: new Decimal('0.15'), maxIncome: new Decimal('492300') },
    { rate: new Decimal('0.20'), maxIncome: new Decimal('Infinity') }
  ],
  [FilingStatus.MARRIED_JOINT]: [
    { rate: new Decimal('0.00'), maxIncome: new Decimal('89250') },
    { rate: new Decimal('0.15'), maxIncome: new Decimal('553850') },
    { rate: new Decimal('0.20'), maxIncome: new Decimal('Infinity') }
  ],
  [FilingStatus.HEAD_OF_HOUSEHOLD]: [
    { rate: new Decimal('0.00'), maxIncome: new Decimal('59750') },
    { rate: new Decimal('0.15'), maxIncome: new Decimal('523050') },
    { rate: new Decimal('0.20'), maxIncome: new Decimal('Infinity') }
  ]
};

const DEFAULT_STATE_TAX_RATE = new Decimal('0.05');
const NO_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'SD', 'TX', 'WA', 'WY'];

/**
 * Validates tax-related numeric inputs with comprehensive error checking
 */
export function validateTaxInput(
  value: number,
  constraints: { min?: number; max?: number } = {}
): { isValid: boolean; error?: string } {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = constraints;
  
  if (!Number.isFinite(value)) {
    return { isValid: false, error: 'Invalid numeric value' };
  }
  
  if (value < min) {
    return { isValid: false, error: `Value cannot be less than ${formatCurrency(min)}` };
  }
  
  if (value > max) {
    return { isValid: false, error: `Value cannot exceed ${formatCurrency(max)}` };
  }
  
  return { isValid: true };
}

/**
 * Calculates the marginal tax rate for a given income level and filing status
 */
export function calculateMarginalRate(
  income: number,
  filingStatus: FilingStatus
): Decimal {
  const validation = validateTaxInput(income);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const decimalIncome = new Decimal(income);
  const brackets = FEDERAL_TAX_BRACKETS[filingStatus];
  
  for (const bracket of brackets) {
    if (decimalIncome.lte(bracket.maxIncome)) {
      return bracket.rate;
    }
  }
  
  return brackets[brackets.length - 1].rate;
}

/**
 * Calculates the effective tax rate using high-precision decimal arithmetic
 */
export function calculateEffectiveTaxRate(
  totalTax: Decimal,
  totalIncome: Decimal
): Decimal {
  if (totalIncome.isZero()) {
    return new Decimal(0);
  }
  
  if (totalTax.isNegative() || totalIncome.isNegative()) {
    throw new Error('Tax and income must be non-negative');
  }
  
  return totalTax.div(totalIncome).toDecimalPlaces(6);
}

/**
 * Calculates comprehensive tax impact of Roth conversion including state taxes
 */
export function calculateRothConversionTax(
  conversionAmount: Decimal,
  formData: CalculationFormData
): {
  federalTax: Decimal;
  stateTax: Decimal;
  totalTax: Decimal;
  effectiveRate: Decimal;
} {
  const validation = validateTaxInput(conversionAmount.toNumber());
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Calculate federal tax
  const marginalRate = calculateMarginalRate(conversionAmount.toNumber(), formData.filingStatus);
  const federalTax = conversionAmount.mul(marginalRate);

  // Calculate state tax
  let stateTax = new Decimal(0);
  if (!NO_INCOME_TAX_STATES.includes(formData.taxState)) {
    stateTax = conversionAmount.mul(DEFAULT_STATE_TAX_RATE);
  }

  // Calculate totals
  const totalTax = federalTax.plus(stateTax);
  const effectiveRate = calculateEffectiveTaxRate(totalTax, conversionAmount);

  return {
    federalTax,
    stateTax,
    totalTax,
    effectiveRate
  };
}

/**
 * Calculates capital gains tax with comprehensive state tax handling
 */
export function calculateCapitalGainsTax(
  gainAmount: Decimal,
  formData: CalculationFormData
): {
  federalTax: Decimal;
  stateTax: Decimal;
  totalTax: Decimal;
  effectiveRate: Decimal;
} {
  const validation = validateTaxInput(gainAmount.toNumber());
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Calculate federal capital gains tax
  const brackets = LONG_TERM_CAPITAL_GAINS_RATES[formData.filingStatus];
  let federalTax = new Decimal(0);
  let remainingGain = gainAmount;

  for (const bracket of brackets) {
    if (remainingGain.isZero()) break;
    
    const taxableInBracket = Decimal.min(
      remainingGain,
      bracket.maxIncome
    );
    
    federalTax = federalTax.plus(taxableInBracket.mul(bracket.rate));
    remainingGain = remainingGain.minus(taxableInBracket);
  }

  // Calculate state tax
  let stateTax = new Decimal(0);
  if (!NO_INCOME_TAX_STATES.includes(formData.taxState)) {
    stateTax = gainAmount.mul(DEFAULT_STATE_TAX_RATE);
  }

  // Calculate totals
  const totalTax = federalTax.plus(stateTax);
  const effectiveRate = calculateEffectiveTaxRate(totalTax, gainAmount);

  return {
    federalTax,
    stateTax,
    totalTax,
    effectiveRate
  };
}