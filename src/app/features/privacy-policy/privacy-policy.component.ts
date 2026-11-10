import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';

@Component({
    selector: 'app-privacy-policy',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './privacy-policy.component.html',
    styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent implements OnInit {
    private readonly platformId = inject(PLATFORM_ID);

    ngOnInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            window.scrollTo(0, 0);
        }
    }
}
