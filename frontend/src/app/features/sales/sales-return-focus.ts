import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SalesReturnFocus {
  private target: { id: number; credential: string } | null = null;

  remember(id: number, credential: string | null): void {
    if (credential) this.target = { id, credential };
  }

  take(credential: string | null): number | null {
    const target = this.target;
    this.target = null;
    return target && target.credential === credential ? target.id : null;
  }
}
