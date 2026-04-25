import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");

function createDefaultState() {
  return {
    totals: {
      adds: 0,
      skips: 0,
    },
    users: {},
    tracks: {},
    updatedAt: null,
  };
}

let state = createDefaultState();
let persistTimer = null;

function sanitizeUser(user) {
  const safeUser = String(user || "").trim();
  return safeUser || "anonymous";
}

function ensureUser(user) {
  if (!state.users[user]) {
    state.users[user] = {
      adds: 0,
      skips: 0,
    };
  }
  return state.users[user];
}

function markUpdated() {
  state.updatedAt = Date.now();
}

async function persistNow() {
  const tmpFile = `${ANALYTICS_FILE}.tmp`;
  const payload = JSON.stringify(state, null, 2);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(tmpFile, payload, "utf8");
  await rename(tmpFile, ANALYTICS_FILE);
}

function schedulePersist() {
  if (persistTimer) {
    return;
  }

  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      await persistNow();
    } catch (error) {
      console.error("Persist analytics failed:", error.message);
    }
  }, 500);
}

function normalizeLoadedState(loadedState) {
  const merged = createDefaultState();

  merged.totals.adds = Number(loadedState?.totals?.adds || 0);
  merged.totals.skips = Number(loadedState?.totals?.skips || 0);
  merged.users = loadedState?.users && typeof loadedState.users === "object" ? loadedState.users : {};
  merged.tracks = loadedState?.tracks && typeof loadedState.tracks === "object" ? loadedState.tracks : {};
  merged.updatedAt = Number(loadedState?.updatedAt || 0) || null;

  return merged;
}

export async function initializeAnalytics() {
  try {
    const file = await readFile(ANALYTICS_FILE, "utf8");
    const parsed = JSON.parse(file);
    state = normalizeLoadedState(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Load analytics failed:", error.message);
    }
  }
}

export function recordAdd({ user, track }) {
  const safeUser = sanitizeUser(user);
  const userStats = ensureUser(safeUser);
  const trackUri = track?.uri;

  state.totals.adds += 1;
  userStats.adds += 1;

  if (trackUri) {
    if (!state.tracks[trackUri]) {
      state.tracks[trackUri] = {
        uri: trackUri,
        title: track?.name || "",
        artist: track?.artists?.[0]?.name || "",
        count: 0,
        lastAddedAt: null,
      };
    }

    state.tracks[trackUri].title = track?.name || state.tracks[trackUri].title;
    state.tracks[trackUri].artist = track?.artists?.[0]?.name || state.tracks[trackUri].artist;
    state.tracks[trackUri].count += 1;
    state.tracks[trackUri].lastAddedAt = Date.now();
  }

  markUpdated();
  schedulePersist();
}

export function recordSkip({ user }) {
  const safeUser = sanitizeUser(user);
  const userStats = ensureUser(safeUser);

  state.totals.skips += 1;
  userStats.skips += 1;

  markUpdated();
  schedulePersist();
}

export function getAnalyticsSnapshot(limit = 20) {
  const artistCounts = {};
  for (const track of Object.values(state.tracks)) {
    const artistLabel = String(track?.artist || "Artiste inconnu").trim() || "Artiste inconnu";
    const artistKey = artistLabel.toLowerCase();
    if (!artistCounts[artistKey]) {
      artistCounts[artistKey] = {
        artist: artistLabel,
        count: 0,
      };
    }
    artistCounts[artistKey].count += Number(track?.count || 0);
  }

  const topTracks = Object.values(state.tracks)
    .sort((a, b) => b.count - a.count || (b.lastAddedAt || 0) - (a.lastAddedAt || 0))
    .slice(0, limit)
    .map((track) => {
      const artistLabel = String(track?.artist || "Artiste inconnu").trim() || "Artiste inconnu";
      const artistKey = artistLabel.toLowerCase();
      return {
        ...track,
        artistUsage: Number(artistCounts[artistKey]?.count || 0),
      };
    });

  const users = Object.entries(state.users)
    .map(([user, stats]) => ({
      user,
      adds: Number(stats?.adds || 0),
      skips: Number(stats?.skips || 0),
      totalCommands: Number(stats?.adds || 0) + Number(stats?.skips || 0),
    }))
    .sort((a, b) => b.totalCommands - a.totalCommands || a.user.localeCompare(b.user));

  return {
    totals: {
      adds: state.totals.adds,
      skips: state.totals.skips,
      commands: state.totals.adds + state.totals.skips,
    },
    users,
    topTracks,
    updatedAt: state.updatedAt,
  };
}
