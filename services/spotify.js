import axios from "axios";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

let accessToken = null;

const recentRequests = new Map();
const DUPLICATE_WINDOW_MS = 10000;

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBigrams(text) {
  const source = ` ${text} `;
  const grams = [];
  for (let i = 0; i < source.length - 1; i += 1) {
    grams.push(source.slice(i, i + 2));
  }
  return grams;
}

function diceCoefficient(a, b) {
  if (!a || !b) {
    return 0;
  }

  const aBigrams = buildBigrams(a);
  const bBigrams = buildBigrams(b);
  if (!aBigrams.length || !bBigrams.length) {
    return 0;
  }

  const seen = new Map();
  for (const gram of aBigrams) {
    seen.set(gram, (seen.get(gram) || 0) + 1);
  }

  let overlap = 0;
  for (const gram of bBigrams) {
    const count = seen.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      seen.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

function scoreTrack(query, track) {
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  const trackName = normalizeText(track?.name);
  const artistName = normalizeText((track?.artists || []).map((artist) => artist.name).join(" "));
  const fullText = `${trackName} ${artistName}`.trim();

  let score = 0;

  if (!normalizedQuery || !fullText) {
    return score;
  }

  if (trackName === normalizedQuery) {
    score += 1000;
  }
  if (fullText.includes(normalizedQuery)) {
    score += 400;
  }
  if (trackName.startsWith(normalizedQuery)) {
    score += 250;
  }

  for (const word of queryWords) {
    if (trackName === word) {
      score += 220;
    } else if (trackName.includes(word)) {
      score += 120;
    }

    if (artistName === word) {
      score += 180;
    } else if (artistName.includes(word)) {
      score += 80;
    }
  }

  score += Math.round(diceCoefficient(normalizedQuery, trackName) * 300);
  score += Math.round(diceCoefficient(normalizedQuery, fullText) * 120);

  return score;
}

function requestKey(user, query) {
  const safeUser = user || "anonymous";
  const safeQuery = (query || "").trim().toLowerCase();
  return `${safeUser}:${safeQuery}`;
}

export function isRecentDuplicateRequest(user, query) {
  const key = requestKey(user, query);
  const now = Date.now();
  const previous = recentRequests.get(key);

  if (previous && now - previous < DUPLICATE_WINDOW_MS) {
    return true;
  }

  recentRequests.set(key, now);

  if (recentRequests.size > 1000) {
    for (const [savedKey, timestamp] of recentRequests.entries()) {
      if (now - timestamp > DUPLICATE_WINDOW_MS) {
        recentRequests.delete(savedKey);
      }
    }
  }

  return false;
}

async function refreshAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Missing CLIENT_ID, CLIENT_SECRET or REFRESH_TOKEN environment variables");
  }

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
    {
      headers: {
        Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = response.data.access_token;
}

async function withAccessToken(callback) {
  if (!accessToken) {
    await refreshAccessToken();
  }

  try {
    return await callback(accessToken);
  } catch (error) {
    if (error.response?.status !== 401) {
      throw error;
    }

    await refreshAccessToken();
    return callback(accessToken);
  }
}

export async function findTrackByQuery(query) {
  return withAccessToken(async (token) => {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: query,
        type: "track",
        limit: 10,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const tracks = response.data?.tracks?.items ?? [];
    if (!tracks.length) {
      return null;
    }

    const rankedTracks = tracks
      .map((track) => ({ track, score: scoreTrack(query, track) }))
      .sort((a, b) => b.score - a.score);

    return rankedTracks[0].track;
  });
}

export async function isTrackAlreadyInQueue(trackUri) {
  return withAccessToken(async (token) => {
    const response = await axios.get("https://api.spotify.com/v1/me/player/queue", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const currentlyPlayingUri = response.data?.currently_playing?.uri;
    const queuedUris = (response.data?.queue || []).map((item) => item.uri);

    return currentlyPlayingUri === trackUri || queuedUris.includes(trackUri);
  });
}

export async function addTrackToQueue(trackUri) {
  return withAccessToken(async (token) => {
    await axios.post("https://api.spotify.com/v1/me/player/queue", null, {
      params: { uri: trackUri },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });
}

export async function skipCurrentTrack() {
  return withAccessToken(async (token) => {
    await axios.post("https://api.spotify.com/v1/me/player/next", null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });
}
