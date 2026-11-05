import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { createBoundAuthContext } from '../../../core/auth/bound-auth-context';
import { jwtInterceptor } from '../../../core/interceptors/jwt.interceptor';
import { ReportsService } from './reports.service';
describe('Commercial report bound reads',()=>{
  beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([jwtInterceptor])),provideHttpClientTesting(),{provide:AuthService,useValue:{getToken:()=> 'synthetic-report-context'}}]}));
  afterEach(()=>TestBed.inject(HttpTestingController).verify());
  for(const kind of ['sales','top-products']) it('preserves '+kind+' endpoint, date parameters and credential',()=>{
    const context=createBoundAuthContext('synthetic-report-context'),service=TestBed.inject(ReportsService);
    if(kind==='sales')service.sales({from:'2032-12-31',to:'2032-12-31'},context).subscribe();
    else service.topProducts({limit:5},context).subscribe();
    const req=TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/reports/'+kind));
    expect(req.request.method).toBe('GET');expect(req.request.context).toBe(context);expect(req.request.headers.get('Authorization')).toBe('Bearer synthetic-report-context');
    expect(req.request.params.get('from')).toBe(kind==='sales'?'2032-12-31':null);req.flush(kind==='sales'?{}:[]);
  });
});
