import {
  addTrackToQueue,
  findTrackByQuery,
  isRecentDuplicateRequest,
} from "../services/spotify.js";
import { setLastAddEvent } from "../services/widget-state.js";

export function registerAddSongRoute(app) {
  app.post("/add-song", async (req, res) => {
    try {
      const { query, user } = req.body || {};

      if (!query || !query.trim()) {
        return res.status(400).send("missing query");
      }

      if (isRecentDuplicateRequest(user, query)) {
        return res.send("duplicate");
      }

      const track = await findTrackByQuery(query.trim());
      if (!track) {
        return res.status(404).send("track not found");
      }
      res.locals.trackLabel = `${track.name} - ${track.artists?.[0]?.name || "Unknown artist"}`;

      await addTrackToQueue(track.uri);
      setLastAddEvent(track);
      return res.send("added");
    } catch (error) {
      console.error("POST /add-song failed:", error.response?.data || error.message);
      return res.status(500).send("error");
    }
  });
}
