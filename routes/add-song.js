import {
  addTrackToQueue,
  findTrackByQuery,
  isRecentDuplicateRequest,
  isTrackAlreadyInQueue,
} from "../services/spotify.js";

export function registerAddSongRoute(app) {
  app.post("/add-song", async (req, res) => {
    try {
      const { query, user } = req.body || {};

      if (!query || !query.trim()) {
        return res.status(400).send("missing query");
      }

      if (isRecentDuplicateRequest(user, query)) {
        return res.send("duplicate request");
      }

      const track = await findTrackByQuery(query.trim());
      if (!track) {
        return res.status(404).send("track not found");
      }

      const alreadyQueued = await isTrackAlreadyInQueue(track.uri);
      if (alreadyQueued) {
        return res.send("duplicate track");
      }

      await addTrackToQueue(track.uri);
      return res.send("added");
    } catch (error) {
      console.error("POST /add-song failed:", error.response?.data || error.message);
      return res.status(500).send("error");
    }
  });
}
