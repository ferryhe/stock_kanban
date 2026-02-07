-- Backtest Phase 2: persistent storage for backtest results
-- Execute on PostgreSQL 13+

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS backtest_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  algorithm VARCHAR(16) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_cash NUMERIC(18, 2) NOT NULL,
  config JSONB NOT NULL,
  summary JSONB NOT NULL,
  equity_curve JSONB NOT NULL,
  trades JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_results_created_at ON backtest_results (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtest_results_algorithm ON backtest_results (algorithm);
