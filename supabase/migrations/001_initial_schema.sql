-- =====================================================
-- EMD Dashboard - Supabase Database Schema
-- =====================================================
-- Purpose: Historical data storage and analysis for the Exception Management Dashboard
-- Version: 1.0
-- Created: 2025-11-10
-- 
-- This schema supports:
-- - Job history tracking with full audit trail
-- - Alert history and analytics
-- - Efficiency metrics over time
-- - Profitability tracking and trends
-- - Performance analytics and reporting
-- =====================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: jobs_history
-- Purpose: Store historical snapshots of all jobs for trend analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Job Identification
  job_id VARCHAR(20) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  mod_id VARCHAR(50),
  
  -- Job Details
  job_date DATE NOT NULL,
  job_status VARCHAR(50) NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  job_status_driver VARCHAR(100),
  
  -- Assignments
  truck_id VARCHAR(20),
  driver_id VARCHAR(100),
  route_id VARCHAR(20),
  lead_id VARCHAR(100),
  
  -- Timing Information
  time_arrival TIMESTAMP,
  time_complete TIMESTAMP,
  due_date TIMESTAMP,
  
  -- Location & Customer
  address TEXT,
  customer_name TEXT,
  contact_info TEXT,
  coordinates_lat DECIMAL(10, 6),
  coordinates_lng DECIMAL(10, 6),
  
  -- Financial Data (for future use)
  revenue DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  margin DECIMAL(10, 2),
  
  -- Efficiency Metrics
  total_miles DECIMAL(10, 2),
  optimal_miles DECIMAL(10, 2),
  excess_miles DECIMAL(10, 2),
  
  -- Metadata
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  data_source VARCHAR(50) DEFAULT 'filemaker',
  raw_data JSONB, -- Store complete raw data for reference
  
  -- Indexes for performance
  CONSTRAINT jobs_history_job_date_check CHECK (job_date IS NOT NULL)
);

-- Create indexes for efficient querying
CREATE INDEX idx_jobs_history_job_id ON jobs_history(job_id);
CREATE INDEX idx_jobs_history_job_date ON jobs_history(job_date);
CREATE INDEX idx_jobs_history_status ON jobs_history(job_status);
CREATE INDEX idx_jobs_history_truck ON jobs_history(truck_id);
CREATE INDEX idx_jobs_history_snapshot ON jobs_history(snapshot_timestamp DESC);
CREATE INDEX idx_jobs_history_composite ON jobs_history(job_date, job_status, truck_id);

-- =====================================================
-- TABLE: alerts_history
-- Purpose: Store all alerts for analysis and reporting
-- =====================================================
CREATE TABLE IF NOT EXISTS alerts_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Alert Identification
  alert_id VARCHAR(50) UNIQUE NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  
  -- Alert Details
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Job
  job_id VARCHAR(20),
  job_status VARCHAR(50),
  job_date DATE,
  truck_id VARCHAR(20),
  
  -- Alert Lifecycle
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by VARCHAR(100),
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  dismissed_by VARCHAR(100),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  
  -- Additional Context
  details JSONB,
  metadata JSONB,
  
  -- Response Metrics
  response_time_seconds INTEGER, -- Time to acknowledge
  resolution_time_seconds INTEGER -- Time to resolve
);

-- Create indexes for alert queries
CREATE INDEX idx_alerts_history_alert_id ON alerts_history(alert_id);
CREATE INDEX idx_alerts_history_severity ON alerts_history(severity);
CREATE INDEX idx_alerts_history_job_id ON alerts_history(job_id);
CREATE INDEX idx_alerts_history_created ON alerts_history(created_at DESC);
CREATE INDEX idx_alerts_history_rule ON alerts_history(rule_id);
CREATE INDEX idx_alerts_history_status ON alerts_history(acknowledged, dismissed, resolved);

-- =====================================================
-- TABLE: efficiency_metrics
-- Purpose: Track route efficiency and optimization metrics over time
-- =====================================================
CREATE TABLE IF NOT EXISTS efficiency_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identification
  truck_id VARCHAR(20) NOT NULL,
  route_id VARCHAR(20),
  date DATE NOT NULL,
  
  -- Mileage Metrics
  total_miles DECIMAL(10, 2) NOT NULL,
  optimal_miles DECIMAL(10, 2),
  excess_miles DECIMAL(10, 2),
  excess_percentage DECIMAL(5, 2),
  
  -- Efficiency Scoring
  efficiency_grade CHAR(1) CHECK (efficiency_grade IN ('A', 'B', 'C', 'D', 'F')),
  efficiency_score DECIMAL(5, 2), -- 0-100 score
  
  -- Issue Counts
  proximity_waste_count INTEGER DEFAULT 0,
  backtrack_count INTEGER DEFAULT 0,
  clustering_opportunities INTEGER DEFAULT 0,
  
  -- Job Statistics
  total_jobs INTEGER NOT NULL,
  completed_jobs INTEGER,
  on_time_jobs INTEGER,
  late_jobs INTEGER,
  
  -- Time Metrics
  total_drive_time_minutes INTEGER,
  total_service_time_minutes INTEGER,
  idle_time_minutes INTEGER,
  
  -- Financial Impact
  fuel_cost_estimate DECIMAL(10, 2),
  labor_cost_estimate DECIMAL(10, 2),
  potential_savings DECIMAL(10, 2),
  
  -- Metadata
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  calculation_method VARCHAR(50),
  
  -- Ensure one record per truck per date
  CONSTRAINT efficiency_metrics_unique UNIQUE(truck_id, date)
);

-- Create indexes for efficiency queries
CREATE INDEX idx_efficiency_truck ON efficiency_metrics(truck_id);
CREATE INDEX idx_efficiency_date ON efficiency_metrics(date DESC);
CREATE INDEX idx_efficiency_grade ON efficiency_metrics(efficiency_grade);
CREATE INDEX idx_efficiency_composite ON efficiency_metrics(truck_id, date DESC);

-- =====================================================
-- TABLE: profitability_metrics
-- Purpose: Track job and route profitability over time
-- =====================================================
CREATE TABLE IF NOT EXISTS profitability_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identification
  job_id VARCHAR(20),
  truck_id VARCHAR(20),
  route_id VARCHAR(20),
  date DATE NOT NULL,
  aggregation_level VARCHAR(20) NOT NULL CHECK (aggregation_level IN ('job', 'route', 'truck', 'daily')),
  
  -- Revenue
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Costs
  fuel_cost DECIMAL(10, 2) DEFAULT 0,
  labor_cost DECIMAL(10, 2) DEFAULT 0,
  vehicle_cost DECIMAL(10, 2) DEFAULT 0,
  overhead_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Profitability
  gross_profit DECIMAL(10, 2),
  profit_margin DECIMAL(5, 2), -- Percentage
  
  -- Volume Metrics
  job_count INTEGER DEFAULT 0,
  miles_driven DECIMAL(10, 2),
  
  -- Efficiency Indicators
  revenue_per_mile DECIMAL(10, 2),
  cost_per_mile DECIMAL(10, 2),
  profit_per_job DECIMAL(10, 2),
  
  -- Metadata
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for profitability queries
CREATE INDEX idx_profitability_job ON profitability_metrics(job_id);
CREATE INDEX idx_profitability_truck ON profitability_metrics(truck_id);
CREATE INDEX idx_profitability_date ON profitability_metrics(date DESC);
CREATE INDEX idx_profitability_level ON profitability_metrics(aggregation_level);
CREATE INDEX idx_profitability_margin ON profitability_metrics(profit_margin);

-- =====================================================
-- TABLE: system_metrics
-- Purpose: Track system performance and health metrics
-- =====================================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Metric Details
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15, 4),
  metric_unit VARCHAR(20),
  
  -- Context
  component VARCHAR(50), -- e.g., 'polling', 'alerts', 'cache'
  environment VARCHAR(20) DEFAULT 'production',
  
  -- Metadata
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  tags JSONB,
  metadata JSONB
);

-- Create indexes for system metrics
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX idx_system_metrics_component ON system_metrics(component);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Note: For a single-tenant application, you may want to disable RLS
-- or create permissive policies. For multi-tenant, customize these policies.

-- Enable RLS on all tables
ALTER TABLE jobs_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE efficiency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profitability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (backend access)
-- These allow full access when using the service role key

CREATE POLICY "Enable all access for service role" ON jobs_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON alerts_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON efficiency_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON profitability_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON system_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- For authenticated users (if you add authentication later):
-- CREATE POLICY "Enable read access for authenticated users" ON jobs_history
--   FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate alert response time
CREATE OR REPLACE FUNCTION calculate_alert_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.acknowledged = TRUE AND OLD.acknowledged = FALSE THEN
    NEW.response_time_seconds := EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.created_at));
  END IF;

  IF NEW.resolved = TRUE AND OLD.resolved = FALSE THEN
    NEW.resolution_time_seconds := EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate response times
CREATE TRIGGER alert_response_time_trigger
  BEFORE UPDATE ON alerts_history
  FOR EACH ROW
  EXECUTE FUNCTION calculate_alert_response_time();

-- Function to calculate profitability metrics
CREATE OR REPLACE FUNCTION calculate_profitability()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost := COALESCE(NEW.fuel_cost, 0) +
                    COALESCE(NEW.labor_cost, 0) +
                    COALESCE(NEW.vehicle_cost, 0) +
                    COALESCE(NEW.overhead_cost, 0);

  NEW.gross_profit := NEW.total_revenue - NEW.total_cost;

  IF NEW.total_revenue > 0 THEN
    NEW.profit_margin := (NEW.gross_profit / NEW.total_revenue) * 100;
  ELSE
    NEW.profit_margin := 0;
  END IF;

  IF NEW.miles_driven > 0 THEN
    NEW.revenue_per_mile := NEW.total_revenue / NEW.miles_driven;
    NEW.cost_per_mile := NEW.total_cost / NEW.miles_driven;
  END IF;

  IF NEW.job_count > 0 THEN
    NEW.profit_per_job := NEW.gross_profit / NEW.job_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate profitability
CREATE TRIGGER profitability_calculation_trigger
  BEFORE INSERT OR UPDATE ON profitability_metrics
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profitability();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Daily alert summary
CREATE OR REPLACE VIEW daily_alert_summary AS
SELECT
  DATE(created_at) as alert_date,
  severity,
  COUNT(*) as alert_count,
  COUNT(*) FILTER (WHERE acknowledged = TRUE) as acknowledged_count,
  COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_count,
  AVG(response_time_seconds) as avg_response_time_seconds,
  AVG(resolution_time_seconds) as avg_resolution_time_seconds
FROM alerts_history
GROUP BY DATE(created_at), severity
ORDER BY alert_date DESC, severity;

-- View: Truck efficiency trends
CREATE OR REPLACE VIEW truck_efficiency_trends AS
SELECT
  truck_id,
  date,
  efficiency_grade,
  efficiency_score,
  total_miles,
  excess_miles,
  excess_percentage,
  total_jobs,
  on_time_jobs,
  ROUND((on_time_jobs::DECIMAL / NULLIF(total_jobs, 0)) * 100, 2) as on_time_percentage
FROM efficiency_metrics
ORDER BY truck_id, date DESC;

-- View: Profitability trends
CREATE OR REPLACE VIEW profitability_trends AS
SELECT
  date,
  aggregation_level,
  truck_id,
  SUM(total_revenue) as total_revenue,
  SUM(total_cost) as total_cost,
  SUM(gross_profit) as gross_profit,
  AVG(profit_margin) as avg_profit_margin,
  SUM(job_count) as total_jobs,
  SUM(miles_driven) as total_miles
FROM profitability_metrics
GROUP BY date, aggregation_level, truck_id
ORDER BY date DESC;

-- View: Recent job changes
CREATE OR REPLACE VIEW recent_job_changes AS
SELECT
  job_id,
  job_date,
  job_status,
  truck_id,
  snapshot_timestamp,
  LAG(job_status) OVER (PARTITION BY job_id ORDER BY snapshot_timestamp) as previous_status,
  LAG(truck_id) OVER (PARTITION BY job_id ORDER BY snapshot_timestamp) as previous_truck
FROM jobs_history
ORDER BY snapshot_timestamp DESC
LIMIT 1000;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE jobs_history IS 'Historical snapshots of all jobs for trend analysis and auditing';
COMMENT ON TABLE alerts_history IS 'Complete history of all alerts with lifecycle tracking';
COMMENT ON TABLE efficiency_metrics IS 'Route and truck efficiency metrics calculated over time';
COMMENT ON TABLE profitability_metrics IS 'Financial performance metrics at various aggregation levels';
COMMENT ON TABLE system_metrics IS 'System performance and health monitoring metrics';

COMMENT ON COLUMN jobs_history.raw_data IS 'Complete raw JSON data from FileMaker for reference';
COMMENT ON COLUMN alerts_history.response_time_seconds IS 'Automatically calculated time from creation to acknowledgment';
COMMENT ON COLUMN efficiency_metrics.efficiency_grade IS 'Letter grade (A-F) based on route optimization';
COMMENT ON COLUMN profitability_metrics.aggregation_level IS 'Level of aggregation: job, route, truck, or daily';

-- =====================================================
-- INITIAL DATA / SEED DATA (Optional)
-- =====================================================

-- Insert initial system metric to verify setup
INSERT INTO system_metrics (metric_type, metric_name, metric_value, metric_unit, component)
VALUES ('setup', 'database_initialized', 1, 'boolean', 'database')
ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANTS (if needed for specific roles)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

