import { Routes } from '@angular/router';
import { BrandComponent } from './features/brand/brand.component';
import { CategoryComponent } from './features/category/category.component';
import { HomeComponent } from './features/home/home.component';
import { ProductListComponent } from './features/product-list/product-list.component';
import { CartComponent } from './shared/components/cart/cart.component';
import { LoginComponent } from './shared/components/login/login.component';
import { ProductCardComponent } from './shared/components/product-card/product-card.component';
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthGuard } from './shared/utils/auth.guard';

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
    {
        path: 'cart',
        component: CartComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AuthGuard, AdminGuard],
    },
];
