CREATE TABLE "backtest_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"algorithm" varchar(16) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"initial_cash" numeric(18, 2) NOT NULL,
	"config" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"equity_curve" jsonb NOT NULL,
	"trades" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_settlements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"settlement_date" date NOT NULL,
	"total_value" numeric(15, 2) NOT NULL,
	"cash" numeric(15, 2) NOT NULL,
	"holdings_value" numeric(15, 2) NOT NULL,
	"daily_return" numeric(10, 6),
	"cumulative_return" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"avg_cost" numeric(15, 4) NOT NULL,
	"current_price" numeric(15, 4),
	"market_value" numeric(15, 2),
	"unrealized_pnl" numeric(15, 2),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"strategy_id" varchar,
	"user_id" varchar,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"initial_cash" numeric(15, 2) NOT NULL,
	"current_cash" numeric(15, 2) NOT NULL,
	"total_value" numeric(15, 2) NOT NULL,
	"backtest_start_date" date,
	"backtest_end_date" date,
	"backtest_status" varchar(20),
	"source_backtest_result_id" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" varchar(100) NOT NULL,
	"algorithm_id" varchar(50) NOT NULL,
	"description" text,
	"parameters" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_performance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"calculation_date" date NOT NULL,
	"total_return" numeric(10, 6),
	"annualized_return" numeric(10, 6),
	"volatility" numeric(10, 6),
	"max_drawdown" numeric(10, 6),
	"sharpe_ratio" numeric(10, 6),
	"sortino_ratio" numeric(10, 6),
	"calmar_ratio" numeric(10, 6),
	"win_rate" numeric(10, 6),
	"total_trades" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"trade_type" varchar(10) NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"price" numeric(15, 4) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"commission" numeric(10, 2) DEFAULT '0' NOT NULL,
	"slippage" numeric(10, 2) DEFAULT '0' NOT NULL,
	"signal_source" varchar(50),
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255),
	"risk_tolerance" varchar(20) DEFAULT 'moderate' NOT NULL,
	"notifications_trade_alerts" boolean DEFAULT true NOT NULL,
	"notifications_daily_report" boolean DEFAULT false NOT NULL,
	"notifications_weekly_report" boolean DEFAULT false NOT NULL,
	"theme" varchar(10) DEFAULT 'light' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "daily_settlements" ADD CONSTRAINT "daily_settlements_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_source_backtest_result_id_backtest_results_id_fk" FOREIGN KEY ("source_backtest_result_id") REFERENCES "public"."backtest_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_performance" ADD CONSTRAINT "strategy_performance_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_settlements_portfolio_date" ON "daily_settlements" USING btree ("portfolio_id","settlement_date");--> statement-breakpoint
CREATE INDEX "idx_settlements_portfolio_date" ON "daily_settlements" USING btree ("portfolio_id","settlement_date");--> statement-breakpoint
CREATE INDEX "idx_holdings_portfolio" ON "holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_holdings_portfolio_ticker" ON "holdings" USING btree ("portfolio_id","ticker");--> statement-breakpoint
CREATE INDEX "idx_portfolios_user" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_portfolios_type" ON "portfolios" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_portfolios_source_backtest" ON "portfolios" USING btree ("source_backtest_result_id");--> statement-breakpoint
CREATE INDEX "idx_strategies_algorithm_id" ON "strategies" USING btree ("algorithm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_strategy_performance_portfolio_date" ON "strategy_performance" USING btree ("portfolio_id","calculation_date");--> statement-breakpoint
CREATE INDEX "idx_trades_portfolio_date" ON "trades" USING btree ("portfolio_id","executed_at");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");