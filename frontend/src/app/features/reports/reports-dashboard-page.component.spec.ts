import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { UserProfile } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { ReportsDashboardPageComponent } from './reports-dashboard-page.component';

describe('ReportsDashboardPageComponent', () => {
  const reportRoutes = [
    '/reportes/ventas',
    '/reportes/caja',
    '/reportes/stock-bajo',
    '/reportes/movimientos-inventario',
    '/reportes/compras',
    '/reportes/productos-mas-vendidos',
    '/reportes/cotizaciones',
    '/reportes/comprobantes',
  ];
  let profile: Subject<UserProfile>;
  let fixture: ComponentFixture<ReportsDashboardPageComponent>;
  let page: HTMLElement;

  beforeEach(() => {
    profile = new Subject<UserProfile>();
    TestBed.configureTestingModule({
      imports: [ReportsDashboardPageComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { me: () => profile.asObservable() } },
      ],
    });
    fixture = TestBed.createComponent(ReportsDashboardPageComponent);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  function resolveProfile(...roles: string[]): void {
    profile.next({ id: 'synthetic-reports', username: 'synthetic', email: 'synthetic@example.invalid', roles });
    profile.complete();
    fixture.detectChanges();
  }

  function links(): HTMLAnchorElement[] {
    return Array.from(page.querySelectorAll<HTMLAnchorElement>('.cards-grid > a.report-card'));
  }

  function hrefs(): (string | null)[] {
    return links().map(link => link.getAttribute('href'));
  }

  function expectEmptyReport(): void {
    expect(page.querySelector('.ui-empty-state')?.textContent?.trim()).toBe(
      'No hay reportes habilitados para tu rol en esta sesion.',
    );
    for (const selector of ['.cards-grid', '.quick-guide', '.hint-row']) {
      expect(page.querySelector(selector)).withContext(selector).toBeNull();
    }
  }

  for (const role of ['ADMIN', 'SUPERVISOR']) {
    it(`shows the eight report destinations in order for ${role}`, () => {
      resolveProfile(role);

      expect(hrefs()).toEqual(reportRoutes);
      expect(page.querySelector('.ui-alert--error')).toBeNull();
      expect(page.querySelector('.ui-empty-state')).toBeNull();
      expect(page.querySelector('.quick-guide')).not.toBeNull();
      expect(page.querySelector('.hint-row')).not.toBeNull();
    });
  }

  it('shows only the two inventory reports for ALMACENERO', () => {
    resolveProfile('ALMACENERO');

    expect(hrefs()).toEqual(['/reportes/stock-bajo', '/reportes/movimientos-inventario']);
    expect(page.querySelector('.ui-alert--error')).toBeNull();
    expect(page.querySelector('.ui-empty-state')).toBeNull();
  });

  it('keeps the initial empty state without an alert while the profile is pending', () => {
    expectEmptyReport();
    expect(page.querySelector('.ui-alert--error')).toBeNull();
  });

  it('keeps the permission alert and empty state visible together when no report is allowed', () => {
    resolveProfile('CAJERO');

    expect(page.querySelector('.ui-alert--error')?.textContent?.trim()).toBe(
      'No tienes permisos para consultar reportes operativos.',
    );
    expectEmptyReport();
  });

  it('keeps the profile error alert and empty state visible together when the request fails', () => {
    profile.error(new Error('Synthetic profile failure'));
    fixture.detectChanges();

    expect(page.querySelector('.ui-alert--error')?.textContent?.trim()).toBe(
      'No se pudo validar permisos del usuario.',
    );
    expectEmptyReport();
  });

  it('keeps the same links and focus when cards are replaced with new objects for the same routes', () => {
    resolveProfile('ALMACENERO');
    const [stock, movements] = links();
    stock.focus();
    expect(document.activeElement).toBe(stock);

    const component = fixture.componentInstance;
    component.cards = component.cards.map(card => ({ ...card, description: `Updated ${card.title}` }));
    fixture.detectChanges();

    expect(links()[0]).toBe(stock);
    expect(links()[1]).toBe(movements);
    expect(stock.querySelector('.report-card__description')?.textContent?.trim()).toBe('Updated Stock bajo');
    expect(hrefs()).toEqual(['/reportes/stock-bajo', '/reportes/movimientos-inventario']);
    expect(document.activeElement).toBe(stock);
  });

  it('reorders and removes links using route identity', () => {
    resolveProfile('ADMIN');
    const originalLinks = links();
    const component = fixture.componentInstance;
    const [stock, movements] = component.cards.slice(2, 4);
    component.cards = [{ ...movements }, { ...stock }];
    fixture.detectChanges();

    expect(hrefs()).toEqual(['/reportes/movimientos-inventario', '/reportes/stock-bajo']);
    expect(links()[0]).toBe(originalLinks[3]);
    expect(links()[1]).toBe(originalLinks[2]);
    expect(page.contains(originalLinks[0])).toBeFalse();
  });
});
