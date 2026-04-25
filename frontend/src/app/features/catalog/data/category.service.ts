import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { Category, CategoryCreateRequest } from "./catalog.models";

@Injectable({ providedIn: "root" })
export class CategoryService {
  private readonly endpoint = `${environment.apiUrl}/categories`;

  constructor(private readonly http: HttpClient) {}

  list(active?: boolean): Observable<Category[]> {
    let params = new HttpParams();
    if (active !== undefined) {
      params = params.set("active", String(active));
    }

    return this.http.get<Category[]>(this.endpoint, { params });
  }

  listActive(): Observable<Category[]> {
    return this.list(true);
  }

  create(payload: CategoryCreateRequest): Observable<Category> {
    return this.http.post<Category>(this.endpoint, payload);
  }
}
