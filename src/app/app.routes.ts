import { Routes } from '@angular/router';
import { HomeComponent } from './modules/home/home.component';
import { CategoryComponent } from './modules/category/category.component';
import { BrandComponent } from './modules/brand/brand.component';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule),
        component: HomeComponent
    },
    // {
    //     path: 'category',
    //     loadChildren: () => import('./modules/category/category.module').then(m => m.CategoryModule)
        
    // },
    // {
    //     path: 'category/:id',
    //     loadChildren: () => import('./modules/category/category.module').then(m => m.CategoryModule)
    // }

    {
        path: 'category/:id',
        component: CategoryComponent
    },
    {
        path: 'brand/:id',
        component: BrandComponent
    }
];
