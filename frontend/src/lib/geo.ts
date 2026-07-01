/**
 * Best-effort GPS capture for inspection arrive/depart events — mirrors
 * propsense's field-control capture. Never throws and never blocks the
 * caller: resolves to `undefined` when geolocation is unavailable, denied,
 * or slow (a short timeout), same "warn, don't block" philosophy as the
 * ported backend logic.
 */
export function captureGps(timeoutMs = 4000): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(undefined)
      return
    }
    let settled = false
    const done = (value?: { lat: number; lng: number }) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => done({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => done(undefined),
      { timeout: timeoutMs, maximumAge: 30000 }
    )
    setTimeout(() => done(undefined), timeoutMs + 500)
  })
}

export const TRANSPORT_MODES = [
  { value: "car", label: "Company / personal car" },
  { value: "motorcycle", label: "Motorcycle / boda" },
  { value: "public", label: "Public transport" },
  { value: "walk", label: "On foot" },
  { value: "other", label: "Other" },
]

export function transportModeLabel(value: string): string {
  return TRANSPORT_MODES.find((t) => t.value === value)?.label || value
}
