import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, startWith, tap } from 'rxjs';
import { environment } from '../../../../environment';
import { MaintenanceResponse } from '../base/schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export class MaintenanceService {
    private readonly baseUrl = environment.server_url;
    private maintenanceStatus$ = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient) {
        this.checkMaintenanceStatus();
    }

    async checkMaintenanceStatus(): Promise<boolean> {
        return firstValueFrom(
            this.http.get<MaintenanceResponse>(`${this.baseUrl}/maintenance/status`).pipe(
                tap(response => {
                    this.maintenanceStatus$.next(response.enabled);
                }),
                map(response => response.enabled),
                catchError(error => {
                    console.error('Error checking maintenance status:', error);
                    this.maintenanceStatus$.next(false);
                    return of(false);
                }),
            ),
        );
    }

    getMaintenanceStatus(): Observable<boolean> {
        return this.maintenanceStatus$.asObservable().pipe(startWith(this.maintenanceStatus$.value));
    }

    isMaintenanceMode(): boolean {
        return this.maintenanceStatus$.value;
    }

    enableMaintenanceMode(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/maintenance/enable`, {}).pipe(
            tap(() => {
                this.maintenanceStatus$.next(true);
            }),
        );
    }

    disableMaintenanceMode(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/maintenance/disable`, {}).pipe(
            tap(() => {
                this.maintenanceStatus$.next(false);
            }),
        );
    }
}
