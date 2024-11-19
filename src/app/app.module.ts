import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { NavbarComponent } from "./shared/navbar/navbar.component";
import { BrowserModule } from "@angular/platform-browser";
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { CoreModule } from './core/core.module';
import { MainPageModule } from "./features/main-page/main-page.module";
import { AppRoutingModule } from "./app.routes";

@NgModule({
    declarations: [
      AppComponent,
      NavbarComponent
    ],
    imports: [
      BrowserModule,
      NgbModule,
      FormsModule,
      RouterModule,
      CoreModule,
      MainPageModule,
      AppRoutingModule
    ],
    providers: [],
    bootstrap: [AppComponent]
  })
  export class AppModule { }