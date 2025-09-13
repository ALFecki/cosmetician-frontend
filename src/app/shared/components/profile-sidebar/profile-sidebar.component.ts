import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PersonModel } from '../../models/person.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { IconsModule } from '../../base/icons/icons.module';

@Component({
    selector: 'app-profile-sidebar',
    templateUrl: './profile-sidebar.component.html',
    styleUrl: './profile-sidebar.component.scss',
    imports: [CommonModule, RouterModule, IconsModule],
})
export class ProfileSidebarComponent implements OnInit {
    currentUser: Observable<PersonModel | null>;
    activePage = '';

    constructor(
        private authService: AuthService,
        private cartService: CartService,
        private router: Router,
    ) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit(): void {
        const url = this.router.url;
        if (url.includes('/profile')) {
            this.activePage = 'profile';
        } else if (url.includes('/orders')) {
            if (url.includes('/order/')) {
                this.activePage = 'orders';
            } else {
                this.activePage = 'orders';
            }
        } else if (url.includes('/favorites')) {
            this.activePage = 'favorites';
        }
    }

    async logout() {
        await this.cartService.syncOrder();
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
            window.location.reload();
        });
    }
}
