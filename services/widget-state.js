let lastEvent = null;

export function setLastAddEvent(track) {
  lastEvent = {
    type: "add",
    title: track?.name || "",
    artist: track?.artists?.[0]?.name || "",
    cover: track?.album?.images?.[0]?.url || "",
    timestamp: Date.now(),
  };
}

export function setLastSkipEvent() {
  lastEvent = {
    type: "skip",
    timestamp: Date.now(),
  };
}

export function getWidgetState() {
  return lastEvent || {};
}
