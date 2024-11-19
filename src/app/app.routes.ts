import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './features/main-page/main-page.component';
import { NgModule } from '@angular/core';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
];


@NgModule({
    imports: [
      RouterModule.forRoot(routes,{
        useHash: true
      })
    ],
    exports: [
    ],
  })
  export class AppRoutingModule { }