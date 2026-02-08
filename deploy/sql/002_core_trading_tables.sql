-- Backtest Phase 3: normalized trading tables from CONSOLIDATED_DESIGN 3.1
-- Execute on PostgreSQL 13+

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS strategies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  algorithm_id VARCHAR(50) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_strategies_algorithm_id ON strategies (algorithm_id);

CREATE TABLE IF NOT EXISTS portfolios (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  strategy_id VARCHAR REFERENCES strategies(id),
  user_id VARCHAR REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  initial_cash NUMERIC(15,2) NOT NULL,
  current_cash NUMERIC(15,2) NOT NULL,
  total_value NUMERIC(15,2) NOT NULL,
  backtest_start_date DATE,
  backtest_end_date DATE,
  backtest_status VARCHAR(20),
  source_backtest_result_id VARCHAR REFERENCES backtest_results(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_type ON portfolios (type);
CREATE INDEX IF NOT EXISTS idx_portfolios_source_backtest ON portfolios (source_backtest_result_id);

CREATE TABLE IF NOT EXISTS holdings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id),
  ticker VARCHAR(20) NOT NULL,
  quantity NUMERIC(15,4) NOT NULL,
  avg_cost NUMERIC(15,4) NOT NULL,
  current_price NUMERIC(15,4),
  market_value NUMERIC(15,2),
  unrealized_pnl NUMERIC(15,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uidx_holdings_portfolio_ticker UNIQUE (portfolio_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON holdings (portfolio_id);

CREATE TABLE IF NOT EXISTS trades (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id),
  ticker VARCHAR(20) NOT NULL,
  trade_type VARCHAR(10) NOT NULL,
  quantity NUMERIC(15,4) NOT NULL,
  price NUMERIC(15,4) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,
  commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  slippage NUMERIC(10,2) NOT NULL DEFAULT 0,
  signal_source VARCHAR(50),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_trades_portfolio_date ON trades (portfolio_id, executed_at);

CREATE TABLE IF NOT EXISTS daily_settlements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id),
  settlement_date DATE NOT NULL,
  total_value NUMERIC(15,2) NOT NULL,
  cash NUMERIC(15,2) NOT NULL,
  holdings_value NUMERIC(15,2) NOT NULL,
  daily_return NUMERIC(10,6),
  cumulative_return NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uidx_settlements_portfolio_date UNIQUE (portfolio_id, settlement_date)
);

CREATE INDEX IF NOT EXISTS idx_settlements_portfolio_date ON daily_settlements (portfolio_id, settlement_date);

CREATE TABLE IF NOT EXISTS strategy_performance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  portfolio_id VARCHAR NOT NULL REFERENCES portfolios(id),
  calculation_date DATE NOT NULL,
  total_return NUMERIC(10,6),
  annualized_return NUMERIC(10,6),
  volatility NUMERIC(10,6),
  max_drawdown NUMERIC(10,6),
  sharpe_ratio NUMERIC(10,6),
  sortino_ratio NUMERIC(10,6),
  calmar_ratio NUMERIC(10,6),
  win_rate NUMERIC(10,6),
  total_trades INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uidx_strategy_performance_portfolio_date UNIQUE (portfolio_id, calculation_date)
);
