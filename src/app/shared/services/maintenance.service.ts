import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MaintenanceResponse } from '../base/schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export class MaintenanceService {
    private readonly apiUrl = `${environment.server_url}/maintenance`;
    private maintenanceStatusSubject = new BehaviorSubject<boolean>(true);
    private loadingSubject = new BehaviorSubject<boolean>(true);
    private initialized = false;
    private statusCache$?: Observable<boolean>;

    constructor(private http: HttpClient) {
        this.checkMaintenanceStatus();
    }

    async checkMaintenanceStatus(): Promise<boolean> {
        return firstValueFrom(
            this.http.get<MaintenanceResponse>(`${this.apiUrl}/status`).pipe(
                tap(response => {
                    this.maintenanceStatusSubject.next(response.enabled);
                    this.loadingSubject.next(false);
                    this.initialized = true;
                }),
                map(response => response.enabled),
                catchError(error => {
                    console.error('Error checking maintenance status:', error);
                    this.maintenanceStatusSubject.next(true);
                    this.loadingSubject.next(false);
                    this.initialized = true;
                    return of(true);
                }),
                shareReplay(1),
            ),
        );
    }

    getMaintenanceStatus(): Observable<boolean> {
        if (!this.statusCache$) {
            this.statusCache$ = this.http.get<MaintenanceResponse>(`${this.apiUrl}/status`).pipe(
                tap(response => {
                    this.maintenanceStatusSubject.next(response.enabled);
                    this.loadingSubject.next(false);
                    this.initialized = true;
                }),
                map(response => response.enabled),
                catchError(error => {
                    console.error('Error checking maintenance status:', error);
                    this.maintenanceStatusSubject.next(true);
                    this.loadingSubject.next(false);
                    this.initialized = true;
                    return of(true);
                }),
                shareReplay(1),
            );
        }
        return this.statusCache$;
    }

    isMaintenanceMode(): boolean {
        return this.maintenanceStatusSubject.value;
    }

    isMaintenanceModeEnabled(): Observable<boolean> {
        return this.maintenanceStatusSubject.asObservable();
    }

    isLoading(): Observable<boolean> {
        return this.loadingSubject.asObservable();
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    enableMaintenanceMode(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/enable`, {}).pipe(
            tap(() => {
                this.maintenanceStatusSubject.next(true);
                this.statusCache$ = undefined;
            }),
        );
    }

    disableMaintenanceMode(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/disable`, {}).pipe(
            tap(() => {
                this.maintenanceStatusSubject.next(false);
                this.statusCache$ = undefined;
            }),
        );
    }
}
