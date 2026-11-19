import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { UserProfile } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { LowStockItemResponse } from './data/reports.models';
import { LowStockReportPageComponent } from './low-stock-report-page.component';

describe('LowStockReportPageComponent', () => {
  const endpoint = '/api/v1/reports/low-stock';
  const emptyMessage = 'No hay registros para el threshold seleccionado.';
  const mainStock: LowStockItemResponse = {
    productId: 41, sku: 'SYN-41', barcode: null, productName: 'Cuaderno',
    warehouseId: 7, warehouseName: 'Principal', currentStock: 0, threshold: 5,
  };
  const secondaryStock: LowStockItemResponse = {
    ...mainStock, warehouseId: 9, warehouseName: 'Secundario', currentStock: 2,
  };
  const removedStock: LowStockItemResponse = {
    ...mainStock, productId: 42, sku: 'SYN-42', productName: 'Lapiz', currentStock: 4,
  };

  let profile: Subject<UserProfile>;
  let fixture: ComponentFixture<LowStockReportPageComponent>;
  let http: HttpTestingController;
  let page: HTMLElement;
  let threshold: HTMLInputElement;
  let apply: HTMLButtonElement;
  let form: HTMLFormElement;

  beforeEach(() => {
    profile = new Subject<UserProfile>();
    TestBed.configureTestingModule({
      imports: [LowStockReportPageComponent],
      providers: [
        provideZoneChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { me: () => profile.asObservable() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LowStockReportPageComponent);
    page = fixture.nativeElement;
    fixture.detectChanges();
    threshold = page.querySelector<HTMLInputElement>('input[formControlName="threshold"]')!;
    apply = page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    form = page.querySelector<HTMLFormElement>('form')!;
  });

  afterEach(() => http.verify());

  function resolveProfile(role: string): void {
    profile.next({ id: 'synthetic-stock', username: 'synthetic', email: 'synthetic@example.invalid', roles: [role] });
    profile.complete();
    fixture.detectChanges();
  }

  function expectLoad(expectedThreshold: string): TestRequest {
    return http.expectOne({ method: 'GET', url: `${endpoint}?threshold=${expectedThreshold}` });
  }

  function submitThreshold(value: string): void {
    threshold.value = value;
    threshold.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function tableRows(): HTMLTableRowElement[] {
    return Array.from(page.querySelectorAll<HTMLTableRowElement>('.low-stock-table > tbody > tr'));
  }

  function cellText(row: HTMLTableRowElement): string[] {
    return Array.from(row.cells, cell => cell.textContent?.trim() ?? '');
  }

  function alertText(): string | undefined {
    return page.querySelector('.ui-alert--error')?.textContent?.trim();
  }

  function expectEmptyRow(): void {
    const [row] = tableRows();
    expect(tableRows().length).toBe(1);
    expect(row?.querySelector('.ui-table__empty')?.getAttribute('colspan')).toBe('6');
    expect(row?.textContent?.trim()).toBe(emptyMessage);
  }

  for (const role of ['ADMIN', 'SUPERVISOR', 'ALMACENERO']) {
    it(`allows ${role} to load the report with the default threshold`, () => {
      resolveProfile(role);
      const request = expectLoad('5');
      expect(apply.disabled).toBeTrue();
      expect(page.querySelector('.ui-kpi-grid')).not.toBeNull();
      expect(tableRows()).toEqual([]);

      request.flush([mainStock]);
      fixture.detectChanges();

      expect(apply.disabled).toBeFalse();
      expect(alertText()).toBeUndefined();
      expect(cellText(tableRows()[0])).toEqual(['Cuaderno', 'SYN-41', '-', 'Principal (#7)', '0.00', '5.00']);
    });
  }

  it('keeps the initial empty row and disables Apply until the profile is known', () => {
    http.expectNone(request => request.url === endpoint);
    expect(threshold.value).toBe('5');
    expect(apply.disabled).toBeTrue();
    expect(page.querySelector('.ui-kpi-grid')).toBeNull();
    expect(alertText()).toBeUndefined();
    expectEmptyRow();
  });

  it('retains the permission alert and empty row for a role without access', () => {
    resolveProfile('CAJERO');

    http.expectNone(request => request.url === endpoint);
    expect(apply.disabled).toBeTrue();
    expect(page.querySelector('.ui-kpi-grid')).toBeNull();
    expect(alertText()).toBe('No tienes permisos para ver este reporte.');
    expectEmptyRow();
  });

  it('retains the identity error and empty row when the profile lookup fails', () => {
    profile.error(new Error('Synthetic profile failure'));
    fixture.detectChanges();

    http.expectNone(request => request.url === endpoint);
    expect(apply.disabled).toBeTrue();
    expect(page.querySelector('.ui-kpi-grid')).toBeNull();
    expect(alertText()).toBe('No se pudo validar permisos del usuario.');
    expectEmptyRow();
  });

  it('rejects a negative threshold without another GET and retains the current rows', () => {
    resolveProfile('ALMACENERO');
    expectLoad('5').flush([mainStock]);
    fixture.detectChanges();
    const [previousRow] = tableRows();

    submitThreshold('-1');

    http.expectNone(request => request.url === endpoint);
    expect(alertText()).toBe('El threshold debe ser mayor o igual a 0.');
    expect(apply.disabled).toBeFalse();
    expect(tableRows()[0]).toBe(previousRow);
  });

  it('hides the empty row during a request and restores it after an empty or failed response', () => {
    resolveProfile('ALMACENERO');
    expectLoad('5').flush([]);
    fixture.detectChanges();
    expectEmptyRow();
    expect(apply.disabled).toBeFalse();

    submitThreshold('2');
    expect(apply.disabled).toBeTrue();
    expect(tableRows()).toEqual([]);
    expectLoad('2').flush({}, { status: 500, statusText: 'Synthetic error' });
    fixture.detectChanges();

    expect(alertText()).toBe('Error interno del servidor. Intenta nuevamente.');
    expectEmptyRow();
    expect(apply.disabled).toBeFalse();
  });

  it('keeps previous rows when a reload fails', () => {
    resolveProfile('ALMACENERO');
    expectLoad('5').flush([mainStock]);
    fixture.detectChanges();
    const [previousRow] = tableRows();

    submitThreshold('4');
    expect(apply.disabled).toBeTrue();
    expect(tableRows()[0]).toBe(previousRow);
    expectLoad('4').flush({}, { status: 500, statusText: 'Synthetic error' });
    fixture.detectChanges();

    expect(alertText()).toBe('Error interno del servidor. Intenta nuevamente.');
    expect(tableRows().length).toBe(1);
    expect(tableRows()[0]).toBe(previousRow);
    expect(page.querySelector('.ui-empty-state')).toBeNull();
    expect(apply.disabled).toBeFalse();
  });

  it('moves retained rows by product and warehouse, updates their content and preserves filter focus', () => {
    resolveProfile('ALMACENERO');
    expectLoad('5').flush([mainStock, secondaryStock, removedStock]);
    fixture.detectChanges();
    const [mainRow, secondaryRow, removedRow] = tableRows();
    const mainChip = mainRow.querySelector('.ui-chip')!;
    expect(mainChip.classList.contains('ui-chip--danger')).toBeTrue();
    expect(Array.from(page.querySelectorAll('.low-stock-table > thead > tr > th'), cell => cell.textContent?.trim()))
      .toEqual(['Producto', 'SKU', 'Barcode', 'Almacen', 'Stock actual', 'Threshold']);
    threshold.focus();
    expect(document.activeElement).toBe(threshold);

    submitThreshold('6');
    expect(tableRows()[0]).toBe(mainRow);
    expect(document.activeElement).toBe(threshold);
    expectLoad('6').flush([
      { ...secondaryStock, currentStock: 1, threshold: 6 },
      { ...mainStock, currentStock: 4, threshold: 6 },
    ]);
    fixture.detectChanges();

    const reordered = tableRows();
    expect(reordered.length).toBe(2);
    expect(reordered[0]).toBe(secondaryRow);
    expect(reordered[1]).toBe(mainRow);
    expect(cellText(reordered[0])).toEqual(['Cuaderno', 'SYN-41', '-', 'Secundario (#9)', '1.00', '6.00']);
    expect(cellText(reordered[1])).toEqual(['Cuaderno', 'SYN-41', '-', 'Principal (#7)', '4.00', '6.00']);
    expect(mainRow.querySelector('.ui-chip')).toBe(mainChip);
    expect(mainChip.classList.contains('ui-chip--info')).toBeTrue();
    expect(mainChip.classList.contains('ui-chip--danger')).toBeFalse();
    expect(page.contains(removedRow)).toBeFalse();
    expect(page.querySelector('input[formControlName="threshold"]')).toBe(threshold);
    expect(document.activeElement).toBe(threshold);
    expect(apply.disabled).toBeFalse();
  });
});
