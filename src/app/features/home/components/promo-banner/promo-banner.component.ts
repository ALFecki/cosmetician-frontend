import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-promo-banner',
    templateUrl: './promo-banner.component.html',
    styleUrl: './promo-banner.component.scss',
})
export class PromoBannerComponent {
    constructor(private router: Router) { }

    navigateToPromotions(): void {
        this.router.navigate(['/products'], { queryParams: { promo: 'true' } });
    }
}
