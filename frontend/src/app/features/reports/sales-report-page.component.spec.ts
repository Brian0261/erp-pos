import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ReportsService } from './data/reports.service';
import { SalesReportPageComponent } from './sales-report-page.component';
describe('Sales report commercial dates and session',()=>{
  const report={totalSalesAmount:10,totalSalesCount:1,averageTicket:10,voidedSalesCount:0,salesByPaymentMethod:[],salesByDay:[{day:'2032-12-31',totalAmount:10,salesCount:1}]};
  let token:string, reports:jasmine.SpyObj<ReportsService>;
  beforeEach(async()=>{
    token='synthetic-report';reports=jasmine.createSpyObj('Reports',['sales']);reports.sales.and.returnValue(of(report));
    await TestBed.configureTestingModule({providers:[provideZoneChangeDetection(),{provide:AuthService,useValue:{getToken:()=>token,me:()=>of({roles:['ADMIN']})}},{provide:ReportsService,useValue:reports}]}).compileComponents();
  });
  it('renders a date-only day without a timezone shift and rejects impossible/inverted ranges',()=>{
    const f=TestBed.createComponent(SalesReportPageComponent);f.detectChanges();const p=f.componentInstance;
    expect(f.nativeElement.textContent).toContain('31/12/2032');
    reports.sales.calls.reset();p.filtersForm.setValue({from:'2032-02-30',to:''});p.applyFilters();expect(reports.sales).not.toHaveBeenCalled();expect(p.report).toBeNull();
    p.filtersForm.setValue({from:'2033-01-01',to:'2032-12-31'});p.applyFilters();expect(reports.sales).not.toHaveBeenCalled();
  });
  it('cancels late reads on reload, error and session change',()=>{
    const f=TestBed.createComponent(SalesReportPageComponent);f.detectChanges();const p=f.componentInstance;
    const late=new Subject<any>();reports.sales.and.returnValue(late);p.applyFilters();expect(p.loading).toBeTrue();expect(p.report).toBeNull();
    reports.sales.and.returnValue(throwError(()=>({status:403})));p.applyFilters();late.next(report);expect(p.report).toBeNull();expect(p.errorMessage).toBeTruthy();
    reports.sales.and.returnValue(late);p.applyFilters();token='other';p.checkSession();late.next(report);expect(p.report).toBeNull();expect(p.canView).toBeFalse();
  });
});
