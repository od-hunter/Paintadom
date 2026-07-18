/** Always show hours, minutes, and seconds for home rail countdowns. */
export function formatRailCountdown(ms: number) {
  if (ms <= 0) return "Ready";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatFullCountdown(ms: number) {
  if (ms <= 0) return "Ready!";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
}
