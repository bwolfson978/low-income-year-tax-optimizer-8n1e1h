import { PrismaClient, User, Scenario, Calculation, Explanation } from '@prisma/client';

// Initialize Prisma client with logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Valid US states for tax purposes
const TAX_STATES = [
  'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
  'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MD', 'MO', 'WI'
];

// Create sample users with diverse profiles
async function createSampleUsers(): Promise<User[]> {
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'graduate.student@university.edu',
        name: 'Graduate Student',
        preferences: {
          notifications: {
            email: true,
            inApp: true
          },
          defaultTaxState: 'CA',
          theme: 'light'
        },
        created_at: new Date('2024-01-01T00:00:00Z')
      }
    }),
    prisma.user.create({
      data: {
        email: 'career.break@professional.com',
        name: 'Career Break Professional',
        preferences: {
          notifications: {
            email: true,
            inApp: false
          },
          defaultTaxState: 'NY',
          theme: 'dark'
        },
        created_at: new Date('2024-01-02T00:00:00Z')
      }
    }),
    prisma.user.create({
      data: {
        email: 'early.retiree@fire.org',
        name: 'Early Retiree',
        preferences: {
          notifications: {
            email: false,
            inApp: true
          },
          defaultTaxState: 'FL',
          theme: 'system'
        },
        created_at: new Date('2024-01-03T00:00:00Z')
      }
    })
  ]);

  return users;
}

// Generate realistic scenarios for each user
async function createSampleScenarios(userId: string): Promise<Scenario[]> {
  const scenarios = await Promise.all([
    prisma.scenario.create({
      data: {
        user_id: userId,
        trad_ira_balance: 250000.00,
        roth_ira_balance: 50000.00,
        capital_gains: 75000.00,
        tax_state: TAX_STATES[Math.floor(Math.random() * TAX_STATES.length)],
        created_at: new Date('2024-01-15T00:00:00Z')
      }
    }),
    prisma.scenario.create({
      data: {
        user_id: userId,
        trad_ira_balance: 500000.00,
        roth_ira_balance: 100000.00,
        capital_gains: 150000.00,
        tax_state: TAX_STATES[Math.floor(Math.random() * TAX_STATES.length)],
        created_at: new Date('2024-02-15T00:00:00Z')
      }
    })
  ]);

  return scenarios;
}

// Create optimized calculations for scenarios
async function createSampleCalculations(scenarioId: string): Promise<Calculation[]> {
  const calculations = await Promise.all([
    prisma.calculation.create({
      data: {
        scenario_id: scenarioId,
        conversion_amount: 25000.00,
        gains_realization: 10000.00,
        results: {
          currentTaxBracket: "12%",
          projectedSavings: 3500.00,
          timeHorizon: 20,
          riskLevel: "moderate",
          stateImpact: 500.00,
          federalImpact: 3000.00
        },
        calculated_at: new Date('2024-03-01T00:00:00Z')
      }
    })
  ]);

  return calculations;
}

// Generate comprehensive AI explanations
async function createSampleExplanations(calculationId: string): Promise<Explanation[]> {
  const explanations = await Promise.all([
    prisma.explanation.create({
      data: {
        calculation_id: calculationId,
        explanation: `Based on your current tax bracket of 12% and projected future rates, converting $25,000 from your Traditional IRA to a Roth IRA this year could save approximately $3,500 in lifetime taxes. This strategy takes advantage of your temporarily low income year while considering both federal and state tax implications. Additionally, realizing $10,000 in long-term capital gains would incur 0% tax in your current bracket.`,
        context: {
          taxBracketAnalysis: {
            current: "12%",
            projected: "22%",
            breakeven: 15
          },
          stateConsiderations: {
            currentRate: "5%",
            futureProjections: "likely to increase"
          },
          riskFactors: {
            legislativeChanges: "moderate",
            incomeVariability: "low",
            marketConditions: "favorable"
          }
        },
        created_at: new Date('2024-03-01T00:00:01Z')
      }
    })
  ]);

  return explanations;
}

// Main seeding function
async function main() {
  console.log('Starting database seed...');

  try {
    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // Create sample users
      const users = await createSampleUsers();
      console.log(`Created ${users.length} sample users`);

      // Create scenarios for each user
      for (const user of users) {
        const scenarios = await createSampleScenarios(user.id);
        console.log(`Created ${scenarios.length} scenarios for user ${user.email}`);

        // Create calculations for each scenario
        for (const scenario of scenarios) {
          const calculations = await createSampleCalculations(scenario.id);
          console.log(`Created ${calculations.length} calculations for scenario ${scenario.id}`);

          // Create explanations for each calculation
          for (const calculation of calculations) {
            const explanations = await createSampleExplanations(calculation.id);
            console.log(`Created ${explanations.length} explanations for calculation ${calculation.id}`);
          }
        }
      }
    });

    console.log('Database seed completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute seeding
main()
  .catch((error) => {
    console.error('Fatal error during database seeding:', error);
    process.exit(1);
  });