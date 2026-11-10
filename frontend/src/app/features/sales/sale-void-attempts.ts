import { Injectable } from "@angular/core";

export function saleVoidAttemptKey(actorId: string, saleId: number): string {
  return JSON.stringify([actorId, saleId]);
}

/** Only records local attempts while this Angular app is alive. */
@Injectable({ providedIn: "root" })
export class SaleVoidAttempts {
  private readonly attempts = new Map<string, "sending" | "uncertain">();

  get(key: string) { return this.attempts.get(key); }

  claim(key: string): boolean {
    if (this.attempts.has(key)) return false;
    this.attempts.set(key, "sending");
    return true;
  }

  uncertain(key: string): void { this.attempts.set(key, "uncertain"); }
  finish(key: string): void { this.attempts.delete(key); }
}
