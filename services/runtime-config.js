function readArgMode() {
  const rawArg = process.argv.find((arg) => arg.startsWith("--mode="));
  if (!rawArg) {
    return null;
  }

  const value = rawArg.split("=")[1];
  if (!value) {
    return null;
  }

  return String(value).trim().toLowerCase();
}

function normalizeMode(mode) {
  if (mode === "dev" || mode === "development") {
    return "dev";
  }
  return "prod";
}

const envMode = String(process.env.APP_MODE || "").trim().toLowerCase();
const argMode = readArgMode();

export const runtimeMode = normalizeMode(argMode || envMode);
export const isPlaybackMockEnabled = runtimeMode === "dev";
