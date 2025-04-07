import { Routes } from '@angular/router';
import { BrandComponent } from './modules/brand/brand.component';
import { CategoryComponent } from './modules/category/category.component';
import { HomeComponent } from './modules/home/home.component';
import { ProductListComponent } from './modules/product-list/product-list.component';
import { ProductCardComponent } from './shared/components/product-card/product-card.component';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule),
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
];
