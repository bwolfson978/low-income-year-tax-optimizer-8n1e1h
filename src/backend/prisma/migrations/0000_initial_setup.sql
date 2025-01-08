-- PostgreSQL 15+ Migration File
-- Description: Initial database setup for Tax Optimizer application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create update_timestamp function for triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create Scenarios table
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trad_ira_balance DECIMAL(15,2) NOT NULL CHECK (trad_ira_balance >= 0),
    roth_ira_balance DECIMAL(15,2) NOT NULL CHECK (roth_ira_balance >= 0),
    capital_gains DECIMAL(15,2) NOT NULL,
    tax_state VARCHAR(2) NOT NULL,
    additional_inputs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create Calculations table
CREATE TABLE calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    conversion_amount DECIMAL(15,2) NOT NULL CHECK (conversion_amount >= 0),
    gains_realization DECIMAL(15,2) NOT NULL,
    results JSONB NOT NULL,
    tax_savings DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'completed',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create Explanations table
CREATE TABLE explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id UUID NOT NULL REFERENCES calculations(id) ON DELETE CASCADE,
    explanation TEXT NOT NULL,
    context JSONB NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for Users table
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- Create indexes for Scenarios table
CREATE INDEX idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX idx_scenarios_created_at ON scenarios(created_at);
CREATE INDEX idx_scenarios_tax_state ON scenarios(tax_state);
CREATE INDEX idx_scenarios_user_created ON scenarios(user_id, created_at);

-- Create indexes for Calculations table
CREATE INDEX idx_calculations_scenario_id ON calculations(scenario_id);
CREATE INDEX idx_calculations_calculated_at ON calculations(calculated_at);
CREATE INDEX idx_calculations_status ON calculations(status);
CREATE INDEX idx_calculations_scenario_calculated ON calculations(scenario_id, calculated_at);

-- Create indexes for Explanations table
CREATE INDEX idx_explanations_calculation_id ON explanations(calculation_id);
CREATE INDEX idx_explanations_created_at ON explanations(created_at);
CREATE INDEX idx_explanations_type ON explanations(type);
CREATE INDEX idx_explanations_calc_created ON explanations(calculation_id, created_at);

-- Add unique constraints
ALTER TABLE scenarios 
    ADD CONSTRAINT unique_user_scenario_time 
    UNIQUE (user_id, created_at);

ALTER TABLE calculations 
    ADD CONSTRAINT unique_scenario_calculation_time 
    UNIQUE (scenario_id, calculated_at);

-- Add check constraints
ALTER TABLE scenarios 
    ADD CONSTRAINT check_positive_balances 
    CHECK (trad_ira_balance >= 0 AND roth_ira_balance >= 0);

-- Create update triggers
CREATE TRIGGER update_scenarios_timestamp
    BEFORE UPDATE ON scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_calculations_timestamp
    BEFORE UPDATE ON calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_explanations_timestamp
    BEFORE UPDATE ON explanations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY user_isolation ON users 
    FOR ALL TO authenticated_users 
    USING (id = current_user_id());

CREATE POLICY scenario_isolation ON scenarios 
    FOR ALL TO authenticated_users 
    USING (user_id = current_user_id());

CREATE POLICY calculation_isolation ON calculations 
    FOR ALL TO authenticated_users 
    USING (scenario_id IN (
        SELECT id FROM scenarios WHERE user_id = current_user_id()
    ));

CREATE POLICY explanation_isolation ON explanations 
    FOR ALL TO authenticated_users 
    USING (calculation_id IN (
        SELECT id FROM calculations 
        WHERE scenario_id IN (
            SELECT id FROM scenarios WHERE user_id = current_user_id()
        )
    ));

-- Create indexes for performance optimization
CREATE INDEX idx_scenarios_composite 
    ON scenarios(user_id, created_at, tax_state);

CREATE INDEX idx_calculations_composite 
    ON calculations(scenario_id, status, calculated_at);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores user account information and preferences';
COMMENT ON TABLE scenarios IS 'Stores user tax optimization scenarios';
COMMENT ON TABLE calculations IS 'Stores optimization calculation results';
COMMENT ON TABLE explanations IS 'Stores AI-generated explanations and recommendations';