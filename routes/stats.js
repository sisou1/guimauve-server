import { getAnalyticsSnapshot } from "../services/analytics.js";

export function registerStatsRoute(app) {
  app.get("/stats", (req, res) => {
    const requestedLimit = Number(req.query?.top || 20);
    const topLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 20;
    return res.json(getAnalyticsSnapshot(topLimit));
  });
}
