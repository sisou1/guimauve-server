import { skipCurrentTrack } from "../services/spotify.js";

export function registerSkipRoute(app) {
  app.post("/skip", async (_req, res) => {
    try {
      await skipCurrentTrack();
      return res.send("skipped");
    } catch (error) {
      console.error("POST /skip failed:", error.response?.data || error.message);
      return res.status(500).send("error");
    }
  });
}
