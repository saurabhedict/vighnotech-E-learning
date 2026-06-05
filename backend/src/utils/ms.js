// Minimal duration parser: "15m" → 900000, "7d" → 604800000. Accepts s/m/h/d.
// Plain numbers are treated as milliseconds. Mirrors the subset of `ms` we need.
const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

export default function ms(value) {
  if (typeof value === 'number') return value
  const m = /^(\d+)\s*(s|m|h|d)?$/.exec(String(value).trim())
  if (!m) throw new Error(`ms(): cannot parse duration "${value}" (use e.g. 30s, 15m, 2h, 7d)`)
  const n = Number(m[1])
  return n * (UNITS[m[2]] || 1)
}
