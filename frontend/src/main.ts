import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { jwtInterceptor } from './app/core/interceptors/jwt.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor]))
  ]
}).catch((error) => console.error(error));

