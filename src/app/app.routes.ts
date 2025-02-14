import { Routes } from '@angular/router';
import { HomeComponent } from './modules/home/home.component';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule),
        component: HomeComponent
    },
    {
        path: 'category',
        loadChildren: () => import('./modules/category/category.module').then(m => m.CategoryModule)
        
    }
];
