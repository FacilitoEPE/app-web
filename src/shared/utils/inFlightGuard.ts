export function createInFlightGuard() {
  let inFlight = false;

  return {
    get isInFlight() {
      return inFlight;
    },
    acquire() {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    release() {
      inFlight = false;
    },
  };
}
