import express from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import {
  calculateUserRankings,
  getUserRankings,
  getUserRanking,
  getUserAllRankings,
} from "../services/userRankingService";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/rankings
 * Get current user rankings leaderboard
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const dateParam = req.query.date as string;
    
    const rankingDate = dateParam ? new Date(dateParam) : new Date();

    const rankings = await getUserRankings(rankingDate, limit);

    res.json({ 
      rankings,
      date: rankingDate.toISOString().split("T")[0],
      count: rankings.length,
    });
  } catch (error) {
    console.error("Error getting rankings:", error);
    res.status(500).json({ error: "Failed to get rankings" });
  }
});

/**
 * POST /api/rankings/calculate
 * Calculate and update rankings for a specific date (admin only)
 */
router.post("/calculate", requireAuth, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user!.role !== "admin" && req.user!.role !== "superadmin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const dateParam = req.body.date as string;
    const rankingDate = dateParam ? new Date(dateParam) : new Date();

    const rankings = await calculateUserRankings(rankingDate);

    res.json({ 
      message: "Rankings calculated successfully",
      date: rankingDate.toISOString().split("T")[0],
      count: rankings.length,
    });
  } catch (error) {
    console.error("Error calculating rankings:", error);
    res.status(500).json({ error: "Failed to calculate rankings" });
  }
});

/**
 * GET /api/rankings/me
 * Get current user's rankings across all portfolios
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const rankings = await getUserAllRankings(req.user!.id, limit);

    res.json({ 
      rankings,
      count: rankings.length,
    });
  } catch (error) {
    console.error("Error getting user rankings:", error);
    res.status(500).json({ error: "Failed to get user rankings" });
  }
});

/**
 * GET /api/rankings/portfolio/:portfolioId
 * Get ranking for a specific portfolio
 */
router.get("/portfolio/:portfolioId", async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const dateParam = req.query.date as string;
    const rankingDate = dateParam ? new Date(dateParam) : new Date();

    // If authenticated, return their ranking
    if (req.user) {
      const ranking = await getUserRanking(req.user.id, portfolioId, rankingDate);
      
      if (!ranking) {
        res.status(404).json({ error: "Ranking not found for this portfolio" });
        return;
      }

      res.json({ ranking });
    } else {
      res.status(401).json({ error: "Authentication required" });
    }
  } catch (error) {
    console.error("Error getting portfolio ranking:", error);
    res.status(500).json({ error: "Failed to get portfolio ranking" });
  }
});

export default router;
