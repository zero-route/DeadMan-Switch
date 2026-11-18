import { timingSafeEqual } from "crypto";

export function isValidPin(providedPin: string | undefined | null): boolean {
  const realPin = process.env.SWITCH_PIN;
  if (!realPin) throw new Error("Missing env var: SWITCH_PIN");
  if (!providedPin) return false;

  const a = Buffer.from(String(providedPin));
  const b = Buffer.from(realPin);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
