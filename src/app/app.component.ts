import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HomeModule } from './modules/home/home.module';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    standalone: true,
    imports: [NgbModule, RouterOutlet, NavbarComponent, HomeModule],
})
export class AppComponent {
    title = 'proskin-frontend';
}
