export function isValidPin(providedPin: string | undefined | null): boolean {
  const realPin = process.env.SWITCH_PIN;
  if (!realPin) throw new Error("Missing env var: SWITCH_PIN");
  if (!providedPin) return false;
  return providedPin === realPin;
}
