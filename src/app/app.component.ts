import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HomeModule } from './features/home/home.module';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthInterceptor } from './shared/utils/auth.interceptor';
import { SnakeToCamelInterceptor } from './shared/utils/case.interceptor';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
    imports: [NgbModule, RouterOutlet, NavbarComponent, HomeModule, FooterComponent, ToastComponent],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: SnakeToCamelInterceptor,
            multi: true,
        },
    ],
})
export class AppComponent {
    title = 'proskin-frontend';
}
