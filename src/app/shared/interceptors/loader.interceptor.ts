import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

export const SKIP_GLOBAL_LOADER = new HttpContextToken(() => false);

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.context.get(SKIP_GLOBAL_LOADER)) return next(req);

    const loaderService = inject(LoaderService);

    loaderService.show();

    return next(req).pipe(
        finalize(() => {
            loaderService.hide();
        }),
    );
};
