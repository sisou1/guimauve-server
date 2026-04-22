import { isRecentDuplicateRequest, skipCurrentTrack } from "../services/spotify.js";
import { setLastSkipEvent } from "../services/widget-state.js";

export function registerSkipRoute(app) {
  app.post("/skip", async (req, res) => {
    try {
      const user = req.body?.user;
      if (isRecentDuplicateRequest(user, "__skip__")) {
        return res.send("duplicate");
      }

      await skipCurrentTrack();
      setLastSkipEvent();
      return res.send("skipped");
    } catch (error) {
      console.error("POST /skip failed:", error.response?.data || error.message);
      return res.status(500).send("error");
    }
  });
}
