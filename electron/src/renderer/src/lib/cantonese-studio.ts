export function isCantoneseStudio(): boolean {
  return typeof window !== "undefined" && Boolean(window.voicestudio?.backend?.installOmniVoice);
}

export const cantoneseSettings = new Set([
  "/settings/general",
  "/settings/appearance",
  "/settings/models",
  "/settings/storage",
  "/settings/logs",
]);
