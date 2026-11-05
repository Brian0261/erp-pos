import { of, Subject, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard server-authoritative day', () => {
  let page:DashboardComponent, token:string, sales:jasmine.SpyObj<any>, visible:DocumentVisibilityState;
  let elapsed:jasmine.Spy;
  const sale={id:81,saleNumber:'S-SYN',soldAt:'2032-12-31T23:00:00Z',status:'COMPLETED',totalAmount:10};
  const body=(day='2032-12-31',reference='2032-12-31T12:00:00Z',next='2033-01-01T05:00:00Z')=>({businessDate:day,
    referenceInstant:reference,nextDayStartsAt:next,timeZone:'America/Lima',sales:[{...sale,soldAt:day+'T12:00:00Z'},{...sale,soldAt:day+'T12:00:00Z',id:82,status:'VOIDED',totalAmount:90}]});
  const kpi=()=>page.kpis.find(k=>k.id==='salesToday')!;
  beforeEach(()=>{
    jasmine.clock().install();jasmine.clock().mockDate(new Date('1999-01-01T00:00:00Z'));
    visible='visible';spyOnProperty(document,'visibilityState','get').and.callFake(()=>visible);
    elapsed=spyOn(performance,'now').and.returnValue(0);
    token='synthetic-dashboard';sales=jasmine.createSpyObj('Sales',['list','today']);
    sales.list.and.returnValue(of([{...sale,id:80,soldAt:'2000-01-01T00:00:00Z',saleNumber:'S-HISTORY'}]));
    sales.today.and.returnValue(of(body()));
    page=new DashboardComponent({getToken:()=>token} as any,sales,{} as any,{} as any,{} as any,{} as any,{} as any,{} as any);
    (page as any).salesCredential=token;kpi().visible=true;
  });
  afterEach(()=>{page.ngOnDestroy();jasmine.clock().uninstall();});
  it('ignores client clock changes and preserves unbounded recent activity',()=>{
    (page as any).loadSalesKpi();expect(sales.list).toHaveBeenCalledOnceWith(undefined,jasmine.anything());
    expect(sales.today).toHaveBeenCalledTimes(1);expect(kpi().subtitle).toContain('31/12/2032');expect(kpi().value).toContain('10.00');
    jasmine.clock().mockDate(new Date('2045-01-01T00:00:00Z'));page.refreshTodaySales();
    expect(kpi().subtitle).toContain('31/12/2032');expect(page.recentActivity[0].title).toContain('S-HISTORY');expect(sales.list).toHaveBeenCalledTimes(1);
  });
  it('refreshes at the server boundary and withdraws the previous value while loading',()=>{
    const next=new Subject<any>();sales.today.and.returnValues(of(body('2032-12-31','2033-01-01T04:59:58Z')),next);
    page.refreshTodaySales();jasmine.clock().tick(2000);expect(sales.today).toHaveBeenCalledTimes(2);
    expect(kpi().loading).toBeTrue();expect(kpi().value).toBe('--');
    next.next(body('2033-01-01','2033-01-01T12:00:00Z','2033-01-02T05:00:00Z'));
    expect(kpi().subtitle).toContain('01/01/2033');expect(page.todayStatus).toBe('ready');
  });
  it('revalidates a suspended tab, deduplicates focus events and rejects old responses',()=>{
    const old=new Subject<any>(),latest=new Subject<any>();sales.today.and.returnValues(old,latest);
    (page as any).loadSalesKpi();visible='hidden';page.revalidateTodayOnResume();expect(kpi().value).toBe('--');
    visible='visible';page.revalidateTodayOnResume();page.revalidateTodayOnResume();expect(sales.today).toHaveBeenCalledTimes(2);
    latest.next(body('2033-01-01','2033-01-01T12:00:00Z','2033-01-02T05:00:00Z'));old.next(body());
    expect(kpi().subtitle).toContain('01/01/2033');expect(page.recentActivity[0].title).toContain('S-HISTORY');
  });
  it('distinguishes network failure from a verified empty day and supports retry',()=>{
    sales.today.and.returnValue(throwError(()=>({status:503})));(page as any).loadSalesKpi();
    expect(page.todayStatus).toBe('error');expect(kpi().empty).toBeFalse();expect(kpi().value).toBe('--');
    sales.today.and.returnValue(of({...body(),sales:[]}));page.refreshTodaySales();
    expect(page.todayStatus).toBe('ready');expect(kpi().empty).toBeTrue();expect(kpi().value).toContain('0.00');
    expect(page.recentActivity[0].title).toContain('S-HISTORY');expect(sales.list).toHaveBeenCalledTimes(1);
  });
  for(const status of [401,403]) it('withdraws protected data on HTTP '+status+' without automatic retry',()=>{
    sales.today.and.returnValue(throwError(()=>({status})));page.refreshTodaySales();
    expect(page.todayStatus).toBe('blocked');expect(kpi().value).toBe('--');page.retryTodayWhenOnline();page.revalidateTodayOnResume();
    visible='hidden';page.revalidateTodayOnResume();visible='visible';page.revalidateTodayOnResume();
    expect(sales.today).toHaveBeenCalledTimes(1);
  });
  it('clears data and discards a response after credential change',()=>{
    const pending=new Subject<any>();sales.today.and.returnValue(pending);(page as any).loadSalesKpi();
    token='other';page.checkSalesSession();pending.next(body());jasmine.clock().tick(86400000);
    expect(page.recentActivity).toEqual([]);expect(kpi().value).toBe('No disponible');expect(sales.today).toHaveBeenCalledTimes(1);
  });
  it('cleans timers and reads on destruction',()=>{
    page.refreshTodaySales();page.ngOnDestroy();jasmine.clock().tick(86400000);expect(sales.today).toHaveBeenCalledTimes(1);
  });
  it('retries once when latency crosses midnight, without accepting the expired day',async()=>{
    const pending=new Subject<any>();sales.today.and.returnValues(pending,of(body('2033-01-01','2033-01-01T12:00:00Z','2033-01-02T05:00:00Z')));
    page.refreshTodaySales();elapsed.and.returnValue(3000);pending.next(body('2032-12-31','2033-01-01T04:59:58Z'));
    expect(kpi().value).toBe('--');await Promise.resolve();expect(sales.today).toHaveBeenCalledTimes(2);expect(kpi().subtitle).toContain('01/01/2033');
  });
  it('does not spin when consecutive references expire in transit',async()=>{
    const pending=new Subject<any>(),second=new Subject<any>();sales.today.and.returnValues(pending,second);
    page.refreshTodaySales();elapsed.and.returnValue(3000);pending.next(body('2032-12-31','2033-01-01T04:59:58Z'));await Promise.resolve();
    elapsed.and.returnValue(6000);second.next(body('2032-12-31','2033-01-01T04:59:58Z'));await Promise.resolve();
    expect(sales.today).toHaveBeenCalledTimes(2);expect(page.todayStatus).toBe('error');expect(kpi().value).toBe('--');
  });
  it('rejects inconsistent metadata rather than presenting a false zero',()=>{
    sales.today.and.returnValue(of({...body(),timeZone:'UTC',sales:[]}));page.refreshTodaySales();
    expect(page.todayStatus).toBe('error');expect(kpi().empty).toBeFalse();expect(kpi().value).toBe('--');
  });
  it('exposes a retry after a stalled request without inventing a zero',()=>{
    sales.today.and.returnValue(new Subject<any>());page.refreshTodaySales();jasmine.clock().tick(15000);
    expect(page.todayStatus).toBe('error');expect(kpi().loading).toBeFalse();expect(kpi().empty).toBeFalse();expect(kpi().value).toBe('--');
  });
});
