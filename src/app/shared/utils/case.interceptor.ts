import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable()
export class SnakeToCamelInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        console.log('Request URL:', req.url);
        return next.handle(req).pipe(
            map((event: HttpEvent<unknown>) => {
                if (event instanceof HttpResponse) {
                    const modifiedBody = this.snakeToCamel(event.body);
                    return event.clone({ body: modifiedBody });
                }
                return event;
            }),
        );
    }

    private snakeToCamel(data: unknown): unknown {
        if (Array.isArray(data)) {
            return data.map(item => this.snakeToCamel(item));
        }

        if (data !== null && typeof data === 'object') {
            return Object.keys(data).reduce(
                (result: Record<string, unknown>, key) => {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = this.snakeToCamel((data as Record<string, unknown>)[key]);
                    return result;
                },
                {} as Record<string, unknown>,
            );
        }

        return data;
    }
}
