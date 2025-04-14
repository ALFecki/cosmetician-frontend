import { Routes } from '@angular/router';
import { BrandComponent } from './features/brand/brand.component';
import { CategoryComponent } from './features/category/category.component';
import { HomeComponent } from './features/home/home.component';
import { ProductListComponent } from './features/product-list/product-list.component';
import { ProductCardComponent } from './shared/components/product-card/product-card.component';
import { LoginComponent } from './shared/components/login/login.component';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
        component: HomeComponent,
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
        component: CategoryComponent,
    },
    {
        path: 'brand/:id',
        component: BrandComponent,
    },
    {
        path: 'product/:id',
        component: ProductCardComponent,
    },
    {
        path: 'products',
        component: ProductListComponent,
    },
    {
        path: 'login',
        component: LoginComponent,
    },
];
