import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log("🌐 HTTP:", req.method, req.url);
    next();
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

let accessToken = null;

console.log("🚀 SERVEUR SPOTIFY DEMARRÉ");

async function refreshAccessToken() {

    console.log("🔄 REFRESH TOKEN...");

    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: REFRESH_TOKEN
        }),
        {
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(
                        CLIENT_ID + ":" + CLIENT_SECRET
                    ).toString("base64"),
                "Content-Type":
                    "application/x-www-form-urlencoded"
            }
        }
    );

    accessToken = response.data.access_token;

    console.log("✅ TOKEN REFRESH OK");
}

app.get("/", (req, res) => {

    console.log("👀 PING RECU");

    res.send("alive");
});

app.post("/add-song", async (req, res) => {

    console.log("📩 REQUETE /add-song RECUE");

    try {

        const { query, user } = req.body;

        console.log("👤 USER :", user);
        console.log("🎵 QUERY :", query);

        if (!query) {

            console.log("❌ QUERY MANQUANTE");

            return res.send("missing query");
        }

        if (!accessToken) {

            console.log("🔑 TOKEN MANQUANT");

            await refreshAccessToken();
        }

        const search = await axios.get(
            "https://api.spotify.com/v1/search",
            {
                params: {
                    q: query,
                    type: "track",
                    limit: 1
                },
                headers: {
                    Authorization:
                        "Bearer " + accessToken
                }
            }
        );

        const track =
            search.data.tracks.items[0];

        if (!track) {

            console.log("❌ TRACK INTROUVABLE");

            return res.send("track not found");
        }

        console.log(
            "🎧 TRACK TROUVEE :",
            track.name,
            "-",
            track.artists[0].name
        );

        await axios.post(
            "https://api.spotify.com/v1/me/player/queue",
            null,
            {
                params: {
                    uri: track.uri
                },
                headers: {
                    Authorization:
                        "Bearer " + accessToken
                }
            }
        );

        console.log("✅ TRACK AJOUTEE A LA QUEUE");

        res.send("added");

    } catch (err) {

        console.error(
            "❌ ERREUR SERVEUR :",
            err.response?.data || err.message
        );

        if (err.response?.status === 401) {

            console.log("🔁 RETRY TOKEN REFRESH");

            await refreshAccessToken();

            return res.send("retry");
        }

        res.send("error");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌍 Serveur actif sur port ${PORT}`);
});