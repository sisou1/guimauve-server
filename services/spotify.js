import axios from "axios";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

let accessToken = null;

const recentRequests = new Map();
const DUPLICATE_WINDOW_MS = 10000;

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
    const strictQuery = `"${query}"`;
    const response = await axios.get("https://api.spotify.com/v1/search", {
      params: {
        q: strictQuery,
        type: "track",
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data?.tracks?.items?.[0] ?? null;
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
