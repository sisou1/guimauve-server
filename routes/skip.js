import { isRecentDuplicateRequest, skipCurrentTrack } from "../services/spotify.js";
import { recordSkip } from "../services/analytics.js";
import { setLastSkipEvent } from "../services/widget-state.js";

export function registerSkipRoute(app) {
  const handleSkip = async (req, res) => {
    try {
      const user = req.body?.user || req.query?.user;
      if (isRecentDuplicateRequest(user, "__skip__")) {
        return res.send("duplicate");
      }

      await skipCurrentTrack();
      setLastSkipEvent();
      recordSkip({ user });
      return res.send("skipped");
    } catch (error) {
      console.error(`${req.method} /skip failed:`, error.response?.data || error.message);
      return res.status(500).send("error");
    }
  };

  app.post("/skip", handleSkip);
  app.get("/skip", handleSkip);
}
