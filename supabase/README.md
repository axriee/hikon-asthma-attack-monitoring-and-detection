# BreathCare Supabase Backend Setup

This directory contains the database schema and migrations for the BreathCare health monitoring application.

## Database Schema Overview

### Tables Created:

1. **users** - User accounts and authentication
2. **children** - Child profiles and medical information
3. **devices** - ESP32 sensor devices
4. **health_metrics** - Real-time health data from sensors
5. **alerts** - System-generated health alerts
6. **user_sessions** - User authentication sessions

### Key Features:

- **Automatic Risk Calculation** - Function to calculate overall health risk scores
- **Smart Alert System** - Triggers alerts based on health metrics
- **Data Validation** - Proper constraints and checks for data integrity
- **Performance Optimization** - Indexes for fast queries
- **Sample Data** - Test data included for development

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase Project

```bash
# Login to Supabase
supabase login

# Initialize new project (if starting fresh)
supabase init

# Link to existing project
supabase link --project-ref your-project-ref
```

### 3. Run Migration

```bash
# Apply the migration to your database
supabase db push

# Or if using local development
supabase start
supabase db reset
```

### 4. Environment Variables

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**To get these values:**
1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the "Project URL" and "anon public" key
4. Paste them into your `.env.local` file

## Database Functions

### `calculate_risk_score()`
Calculates overall health risk based on:
- SpO2 levels
- Respiration rate
- PM2.5 air quality
- Wheeze detection
- Cough detection

### `generate_health_alerts()`
Automatically creates alerts when:
- SpO2 drops below 90%
- PM2.5 exceeds 50 µg/m³
- Wheezing is detected
- Overall risk score exceeds 70%

## Sample Data

The migration includes sample data for testing:
- 2 test users (John Doe, Jane Smith)
- 2 children (Emma, Liam)
- 2 ESP32 devices
- Sample health metrics
- Generated alerts

## API Endpoints (Next.js)

You can create API routes in your Next.js app to interact with this database:

```typescript
// Example: app/api/health-metrics/route.ts
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const data = await request.json()
  
  const { data: healthData, error } = await supabase
    .from('health_metrics')
    .insert([data])
  
  return Response.json({ healthData, error })
}
```

## Security Considerations

1. **Row Level Security (RLS)** - Enable RLS policies for data protection
2. **API Keys** - Use service role key only on server-side
3. **Data Validation** - Validate all inputs before database operations
4. **Rate Limiting** - Implement rate limiting for API endpoints

## Monitoring and Maintenance

- Monitor database performance with Supabase dashboard
- Set up alerts for critical health metrics
- Regular backups of user data
- Monitor API usage and costs

## Next Steps

1. Set up authentication with Supabase Auth
2. Create API routes for data operations
3. Implement real-time subscriptions for live updates
4. Add data visualization and analytics
5. Set up email/SMS notifications for alerts
