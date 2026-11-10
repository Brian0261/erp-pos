import { Injectable } from "@angular/core";
import { distinctUntilChanged, filter, map, startWith, Subject } from "rxjs";

export function saleVoidAttemptKey(actorId: string, saleId: number): string {
  return JSON.stringify([actorId, saleId]);
}

export type SaleVoidAttempt = { kind: "sending" | "uncertain" | "confirmed" }
  | { kind: "rejected"; status: number; session: symbol };

/** Only records local attempts while this Angular app is alive. */
@Injectable({ providedIn: "root" })
export class SaleVoidAttempts {
  private readonly attempts = new Map<string, SaleVoidAttempt>();
  private readonly changes = new Subject<string>();
  private credential: string | null = null;
  private session = Symbol();

  sessionFor(credential: string | null): symbol {
    if (credential !== this.credential) {
      this.credential = credential;
      this.session = Symbol();
    }
    return this.session;
  }

  state(key: string): SaleVoidAttempt | undefined { return this.attempts.get(key); }

  get(key: string): "sending" | "uncertain" | undefined {
    const kind = this.state(key)?.kind;
    if (kind === "sending") return kind;
    // Keep detail and confirmation blocked until an authorized read confirms the sale.
    if (kind === "uncertain" || kind === "confirmed") return "uncertain";
    return undefined;
  }

  observe(key: string) {
    return this.changes.pipe(filter(changed => changed === key), startWith(key),
      map(() => this.state(key)), distinctUntilChanged());
  }

  claim(key: string): boolean {
    if (this.attempts.has(key)) return false;
    this.update(key, { kind: "sending" });
    return true;
  }

  uncertain(key: string): void { this.update(key, { kind: "uncertain" }); }
  confirm(key: string): void { this.update(key, { kind: "confirmed" }); }
  reject(key: string, status: number, session: symbol): void { this.update(key, { kind: "rejected", status, session }); }

  finish(key: string): void {
    if (this.state(key)?.kind !== "sending" && this.attempts.delete(key)) this.changes.next(key);
  }

  private update(key: string, attempt: SaleVoidAttempt): void {
    this.attempts.set(key, attempt);
    this.changes.next(key);
  }
}
