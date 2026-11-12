import { firstValueFrom, of } from 'rxjs';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth.guard';

describe('Checkout guest route', () => {
    for (const [flag, allowedRoute, expected] of [
        [true, true, true],
        [false, true, false],
        [true, false, false],
    ]) {
        it(`allows only enabled guest checkout: ${flag}/${allowedRoute}`, async () => {
            const router = jasmine.createSpyObj<Router>('router', ['navigate']);
            const guard = new AuthGuard(
                { ready: Promise.resolve(), phoneCheckoutEnabled: flag, checkAuth: () => of(null) } as unknown as AuthService,
                router,
            );
            const result = await firstValueFrom(
                guard.canActivate(
                    { data: { allowGuestCheckout: allowedRoute } } as unknown as ActivatedRouteSnapshot,
                    { url: '/order-confirmation' } as RouterStateSnapshot,
                ),
            );
            expect(result).toBe(expected);
            expect(router.navigate).toHaveBeenCalledTimes(expected ? 0 : 1);
        });
    }
});
