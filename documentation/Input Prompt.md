```
# Input: Low Income Year Tax Optimizer Tool

## Platform Purpose

A consumer platform allowing any individual to explore the financial implications of several actions which might make sense if they find themselves in an unusually low income year, such as taking time off work to go to graduate school. For example, it could be optimal tax-wise to use these years to do traditional to roth conversions, or realize long term capital gains. The platform considers several variables to solve an optimization problem including the users starting traditional (pre-tax) retirement savings balance, their roth (after-tax) retirement savings balance, and long term capital gains which the user would like to realize for diversification purposes, along with the user's state and federal (in this case, U.S.) tax brackets for the given year to conduct an analysis to find their suggested optimal actions based on minimizing marginal tax rates and maximizing NPV and wealth over time. The platform asks the user for any other inputs that may be necessary to compute these results. The platform explains it's results in a way that's easily understandable by the user, such as "you should convert $100K of traditional retirement savings to Roth and realize $50K of long term capital gains due to the relatively lower tax brackets you find yourself this year combined with staying outside of higher capital gains tax brackets"

# Platform Architecture

## Core Workflows

### User Journey

1. **Landing & Sign Up**
    - Required signup before providing financial data
2. **Providing Input Variables**
    - Provide all necessary inputs to complete the optimization problem
3. **Scenario Output and Recommendation**
    - Output of optimization problem given inputs along with a chatbot interface that allows questioning of the reasoning and explanations of why the given recommendation was made
4. **Archive**
    - Previous scenario analyses

## Technical Stack

### Core Technologies

- Language: TypeScript (.ts/.tsx)
- Framework: NextJS + React (app router)
- Backend: Serverless & edge functions through NextJS
- Styling: TailwindCSS
- UI Components & theming: Shadcn (buttons, sidebar, inputs, modals, dialogs, etc.)
- Iconography: lucide-react
- Form management: react-hook-form with yup for validation

### Backend Services

- Hosting: Vercel
- Database: Supabase (Postgres SQL)
- ORM: PrismaDB
- Authentication: Supabase
- Email: Resend
- AI: OpenAI GPT-4o mini API, OpenAI Whisper, OpenAI vision

### Architecture Notes

- Single NextJS application
- NextJS routes for all API endpoints
- No external cloud services (AWS/GCP)
- Web platform only

## User Interface

### Required Pages

1. **Landing Page**
    - user sign up
2. **Scenario Analysis Page**
    - inputs for optimization problem
    - explanation of output and recommendation
    - chatbot q and a allowing user to question how the recommendation was reached
3. **Saved Scenario Analyses**
    - summary of previous scenario analyses
5. **Profile Management**
    - Personal info
    - Profile picture

## Business Rules

### Access Control

- Email signup required for engine access

## Implementation Priority

1. Core long-term wealth optimization engine
2. Saved Scenario Analyses Viewer
3. User authentication
```