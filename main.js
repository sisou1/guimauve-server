import express from "express";
import cors from "cors";
import { registerAddSongRoute } from "./routes/add-song.js";
import { registerSkipRoute } from "./routes/skip.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.method === "POST" && req.url === "/add-song") {
    const query = req.body?.query ?? "";
    const user = req.body?.user ?? "";
    console.log(`[REQ] POST /add-song query="${query}" user="${user}"`);
  } else {
    const bodyLog = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "{}";
    console.log(`[REQ] ${req.method} ${req.url} body=${bodyLog}`);
  }

  const originalSend = res.send.bind(res);
  res.send = (payload) => {
    if (req.method === "POST" && req.url === "/add-song") {
      const result =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const trackLog = res.locals?.trackLabel ? ` track="${res.locals.trackLabel}"` : "";
      console.log(`[RES] POST /add-song status=${res.statusCode} result="${result}"${trackLog}`);
    } else {
      const responseLog =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      console.log(`[RES] ${req.method} ${req.url} status=${res.statusCode} body=${responseLog}`);
    }
    return originalSend(payload);
  };

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
