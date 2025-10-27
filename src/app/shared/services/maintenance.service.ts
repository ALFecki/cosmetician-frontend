import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MaintenanceResponse, MaintenanceStatus } from '../base/schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export class MaintenanceService {
    private readonly apiUrl = `${environment.server_url}/maintenance`;
    private maintenanceStatusSubject = new BehaviorSubject<MaintenanceStatus>({ enabled: false, ttl: undefined });
    private loadingSubject = new BehaviorSubject<boolean>(true);
    private initialized = false;
    private statusCache$?: Observable<MaintenanceStatus>;

    private statusTimeoutMs = 5000;

    constructor(private http: HttpClient) {}

    setStatusTimeout(seconds: number): void {
        this.statusTimeoutMs = Math.max(0, Math.floor(seconds)) * 1000;
    }    

    async checkMaintenanceStatus(): Promise<boolean> {
        if (this.maintenanceStatusSubject.value.enabled) {
            this.loadingSubject.next(false);
            return this.isMaintenanceMode();
        }
        return firstValueFrom(
            this.http.get<MaintenanceResponse>(`${this.apiUrl}/status`).pipe(
                timeout(this.statusTimeoutMs),
                tap(response => {
                    this.maintenanceStatusSubject.next({ enabled: response.enabled, ttl: response.ttl });
                    this.loadingSubject.next(false);
                    this.initialized = true;
                }),
                map(response => response.enabled),
                catchError(error => {
                    let status = false;
                    if (error.status !== 0) {
                        status = true;
                    }
                    this.maintenanceStatusSubject.next({ enabled: status, ttl: undefined });
                    this.loadingSubject.next(false);
                    this.initialized = true;
                    return of(status);
                }

                ),
                shareReplay(1),
            ),
        );
    }

    getMaintenanceStatus(): Observable<MaintenanceStatus> {
        if (!this.statusCache$) {
            this.statusCache$ = this.http.get<MaintenanceResponse>(`${this.apiUrl}/status`).pipe(
                timeout(this.statusTimeoutMs),
                tap(response => {
                    this.maintenanceStatusSubject.next({ enabled: response.enabled, ttl: response.ttl });
                    this.loadingSubject.next(false);
                    this.initialized = true;
                }),
                map(response => response),
                catchError(error => {
                    console.debug('Maintenance status fetch failed', error);
                    this.maintenanceStatusSubject.next({ enabled: true, ttl: undefined });
                    this.loadingSubject.next(false);
                    this.initialized = true;
                    return of({ enabled: true, ttl: undefined });
                }),
                shareReplay(1),
            );
        }
        return this.statusCache$;
    }

    isMaintenanceMode(): boolean {
        return this.maintenanceStatusSubject.value.enabled;
    }

    isMaintenanceModeEnabled(): Observable<boolean> {
        return this.maintenanceStatusSubject.asObservable().pipe(map(status => status.enabled));
    }

    isLoading(): Observable<boolean> {
        return this.loadingSubject.asObservable();
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    enableMaintenanceMode(ttl: number | undefined): Observable<void> {
        const params = ttl ? { params: new HttpParams().set('ttl', ttl) } : {};
        return this.http.get<void>(`${this.apiUrl}/enable`, params).pipe(
            tap(() => {
                this.maintenanceStatusSubject.next({ enabled: true, ttl });
                this.statusCache$ = undefined;
            }),
        );
    }

    disableMaintenanceMode(): Observable<void> {
        return this.http.get<void>(`${this.apiUrl}/disable`, {}).pipe(
            tap(() => {
                this.maintenanceStatusSubject.next({ enabled: false, ttl: undefined });
                this.statusCache$ = undefined;
            }),
        );
    }
}