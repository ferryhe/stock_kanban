import { db } from "../db";
import {
  userRankings,
  portfolios,
  strategyPerformance,
  users,
  type UserRanking,
  type InsertUserRanking,
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Calculate and update user rankings for a specific date
 * This aggregates all public and shared portfolios to create a leaderboard
 */
export async function calculateUserRankings(rankingDate: Date): Promise<UserRanking[]> {
  const dateStr = rankingDate.toISOString().split("T")[0];

  // Get latest performance metrics for all eligible portfolios
  // Include: public portfolios and live portfolios (exclude backtests for rankings)
  const portfoliosWithPerformance = await db
    .select({
      userId: portfolios.userId,
      portfolioId: portfolios.id,
      portfolioName: portfolios.name,
      totalValue: portfolios.totalValue,
      totalReturn: strategyPerformance.totalReturn,
      annualizedReturn: strategyPerformance.annualizedReturn,
      sharpeRatio: strategyPerformance.sharpeRatio,
      performanceDate: strategyPerformance.calculationDate,
    })
    .from(portfolios)
    .leftJoin(
      strategyPerformance,
      eq(portfolios.id, strategyPerformance.portfolioId),
    )
    .where(
      and(
        eq(portfolios.type, "live"),
        // Portfolio must be public or shared to be ranked
        sql`${portfolios.visibility} IN ('public', 'shared')`,
      ),
    )
    .orderBy(desc(strategyPerformance.calculationDate));

  // Group by portfolio and take the latest performance
  const latestPerformanceByPortfolio = new Map<string, typeof portfoliosWithPerformance[0]>();
  
  for (const record of portfoliosWithPerformance) {
    if (!latestPerformanceByPortfolio.has(record.portfolioId)) {
      latestPerformanceByPortfolio.set(record.portfolioId, record);
    }
  }

  // Convert to array and sort by total return (descending)
  const rankedPortfolios = Array.from(latestPerformanceByPortfolio.values())
    .filter((p) => p.totalReturn !== null)
    .sort((a, b) => {
      const returnA = Number(a.totalReturn) || 0;
      const returnB = Number(b.totalReturn) || 0;
      return returnB - returnA;
    });

  // Calculate ranks and percentiles
  const totalPortfolios = rankedPortfolios.length;
  const rankings: InsertUserRanking[] = rankedPortfolios.map((portfolio, index) => {
    const rank = index + 1;
    const percentile = totalPortfolios > 1 
      ? ((totalPortfolios - rank) / (totalPortfolios - 1)) * 100 
      : 100;

    return {
      userId: portfolio.userId!,
      portfolioId: portfolio.portfolioId,
      rankingDate: dateStr,
      totalReturn: portfolio.totalReturn,
      annualizedReturn: portfolio.annualizedReturn,
      sharpeRatio: portfolio.sharpeRatio,
      totalValue: portfolio.totalValue,
      rank,
      percentile: percentile.toFixed(2),
    };
  });

  // Upsert rankings (insert or update if exists)
  if (rankings.length > 0) {
    const inserted = await db
      .insert(userRankings)
      .values(rankings)
      .onConflictDoUpdate({
        target: [userRankings.portfolioId, userRankings.rankingDate],
        set: {
          totalReturn: sql`EXCLUDED.total_return`,
          annualizedReturn: sql`EXCLUDED.annualized_return`,
          sharpeRatio: sql`EXCLUDED.sharpe_ratio`,
          totalValue: sql`EXCLUDED.total_value`,
          rank: sql`EXCLUDED.rank`,
          percentile: sql`EXCLUDED.percentile`,
        },
      })
      .returning();

    return inserted;
  }

  return [];
}

/**
 * Get user rankings for a specific date
 */
export async function getUserRankings(
  rankingDate: Date,
  limit: number = 100,
): Promise<Array<UserRanking & { username: string }>> {
  const dateStr = rankingDate.toISOString().split("T")[0];

  const rankings = await db
    .select({
      id: userRankings.id,
      userId: userRankings.userId,
      portfolioId: userRankings.portfolioId,
      rankingDate: userRankings.rankingDate,
      totalReturn: userRankings.totalReturn,
      annualizedReturn: userRankings.annualizedReturn,
      sharpeRatio: userRankings.sharpeRatio,
      totalValue: userRankings.totalValue,
      rank: userRankings.rank,
      percentile: userRankings.percentile,
      createdAt: userRankings.createdAt,
      username: users.username,
    })
    .from(userRankings)
    .innerJoin(users, eq(userRankings.userId, users.id))
    .where(eq(userRankings.rankingDate, dateStr))
    .orderBy(userRankings.rank)
    .limit(limit);

  return rankings;
}

/**
 * Get a user's ranking for a specific date and portfolio
 */
export async function getUserRanking(
  userId: string,
  portfolioId: string,
  rankingDate: Date,
): Promise<(UserRanking & { username: string }) | null> {
  const dateStr = rankingDate.toISOString().split("T")[0];

  const [ranking] = await db
    .select({
      id: userRankings.id,
      userId: userRankings.userId,
      portfolioId: userRankings.portfolioId,
      rankingDate: userRankings.rankingDate,
      totalReturn: userRankings.totalReturn,
      annualizedReturn: userRankings.annualizedReturn,
      sharpeRatio: userRankings.sharpeRatio,
      totalValue: userRankings.totalValue,
      rank: userRankings.rank,
      percentile: userRankings.percentile,
      createdAt: userRankings.createdAt,
      username: users.username,
    })
    .from(userRankings)
    .innerJoin(users, eq(userRankings.userId, users.id))
    .where(
      and(
        eq(userRankings.userId, userId),
        eq(userRankings.portfolioId, portfolioId),
        eq(userRankings.rankingDate, dateStr),
      ),
    )
    .limit(1);

  return ranking || null;
}

/**
 * Get all rankings for a user across all their portfolios
 */
export async function getUserAllRankings(
  userId: string,
  limit: number = 10,
): Promise<Array<UserRanking & { portfolioName: string }>> {
  const rankings = await db
    .select({
      id: userRankings.id,
      userId: userRankings.userId,
      portfolioId: userRankings.portfolioId,
      rankingDate: userRankings.rankingDate,
      totalReturn: userRankings.totalReturn,
      annualizedReturn: userRankings.annualizedReturn,
      sharpeRatio: userRankings.sharpeRatio,
      totalValue: userRankings.totalValue,
      rank: userRankings.rank,
      percentile: userRankings.percentile,
      createdAt: userRankings.createdAt,
      portfolioName: portfolios.name,
    })
    .from(userRankings)
    .innerJoin(portfolios, eq(userRankings.portfolioId, portfolios.id))
    .where(eq(userRankings.userId, userId))
    .orderBy(desc(userRankings.rankingDate), userRankings.rank)
    .limit(limit);

  return rankings;
}
