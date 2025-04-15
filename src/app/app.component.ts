import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HomeModule } from './features/home/home.module';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthService } from './shared/services/auth.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
    imports: [NgbModule, RouterOutlet, NavbarComponent, HomeModule],
})
export class AppComponent {
    title = 'proskin-frontend';

    constructor(authService: AuthService) {
        authService.checkAuth().subscribe(response => {
            console.log('Auth check successful:', response);
        });
    }
}
