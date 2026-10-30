import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NOTE_CONFIG, NOTE_PROFILES } from "./note-model";
import { NoteSession } from "./note-session";

@Component({
  selector: "app-pos-sale-note", standalone: true, imports: [CommonModule,RouterLink], providers: [NoteSession],
  template: `<aside class="sale-confirmation" *ngIf="session.note() as note" aria-label="Última venta confirmada">
    <div role="status"><strong>{{ note.status === 'VOIDED' ? 'Venta ' + note.number + ' ANULADA.' : 'Venta ' + note.number + ' registrada.' }}</strong>
      <span>Última venta confirmada · La impresión es opcional.</span></div>
    <div class="confirmation-actions"><button class="ui-button ui-button--primary" (click)="newSale.emit()">Nueva venta</button>
      <a class="ui-button ui-button--secondary" [routerLink]="['/ventas',note.id,'nota']" [queryParams]="{from:'pos'}">Ver nota interna</a>
      <button class="ui-button print-note" *ngIf="quickFormat && note.status === 'COMPLETED'" [disabled]="session.phase() !== 'ready'" (click)="print()">Imprimir nota · {{ profiles[quickFormat].label }}</button></div>
    <p *ngIf="session.message()" role="status">{{ session.message() }}</p>
  </aside>
  <p class="ui-alert ui-alert--warning" *ngIf="session.error()" role="status">La venta conserva su estado. {{ session.error() }}</p>`,
  styles: [`:host{display:block}.sale-confirmation{border:1px solid var(--color-border-default);border-left:4px solid var(--color-success);border-radius:var(--radius-md);background:var(--color-bg-surface);padding:.8rem;display:grid;gap:.6rem}.sale-confirmation strong{display:block;font-size:.95rem}.sale-confirmation span,.sale-confirmation p{font-size:.8rem;color:var(--color-text-secondary);margin:0}.confirmation-actions{display:flex;gap:.5rem;flex-wrap:wrap}.confirmation-actions>*{min-height:44px}.print-note{border:1px solid var(--color-border-default);color:var(--color-text-primary)}`],
})
export class PosSaleNoteComponent {
  readonly quickFormat = NOTE_CONFIG.quickFormat; readonly profiles = NOTE_PROFILES;
  private previous: number | null = null;
  @Input() set saleId(id: number) { if (id !== this.previous) { this.previous = id; void this.session.load(id,false); } }
  @Output() readonly newSale = new EventEmitter<void>();
  constructor(readonly session: NoteSession) {}
  print(): void { if (this.quickFormat) { this.session.format = this.quickFormat; void this.session.output("print"); } }
}
