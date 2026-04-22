import express from "express";
import cors from "cors";
import { registerAddSongRoute } from "./routes/add-song.js";
import { registerSkipRoute } from "./routes/skip.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`HTTP ${req.method} ${req.url}`);
  next();
});

app.get("/", (_req, res) => {
  res.send("alive");
});

registerAddSongRoute(app);
registerSkipRoute(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
