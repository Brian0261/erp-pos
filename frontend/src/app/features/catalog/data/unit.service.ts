import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { Unit, UnitCreateRequest } from "./catalog.models";

@Injectable({ providedIn: "root" })
export class UnitService {
  private readonly endpoint = `${environment.apiUrl}/units`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Unit[]> {
    return this.http.get<Unit[]>(this.endpoint);
  }

  listActive(): Observable<Unit[]> {
    return this.list().pipe(
      map((units) => units.filter((unit) => unit.active)),
    );
  }

  create(payload: UnitCreateRequest): Observable<Unit> {
    return this.http.post<Unit>(this.endpoint, payload);
  }
}
