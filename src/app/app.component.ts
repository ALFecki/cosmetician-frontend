import { Component } from '@angular/core';
import { HomeModule } from './modules/home/home.module';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [
    NgbModule,
    RouterOutlet, NavbarComponent, HomeModule]
})
export class AppComponent {
  title = 'proskin-frontend';
}
