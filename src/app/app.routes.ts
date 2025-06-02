import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthGuard } from './shared/guards/auth.guard';

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
        loadComponent: () => import('./features/category/category.component').then(m => m.CategoryComponent),
    },
    {
        path: 'brand/:id',
        loadComponent: () => import('./features/brand/brand.component').then(m => m.BrandComponent),
    },
    {
        path: 'product/:id',
        loadComponent: () => import('./shared/components/product-card/product-card.component').then(m => m.ProductCardComponent),
    },
    {
        path: 'products',
        loadComponent: () => import('./features/product-list/product-list.component').then(m => m.ProductListComponent),
    },
    {
        path: 'login',
        loadComponent: () => import('./shared/components/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'cart',
        loadComponent: () => import('./shared/components/cart/cart.component').then(m => m.CartComponent),
        canActivate: [AuthGuard],
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AuthGuard, AdminGuard],
    },
    {
        path: 'profile',
        loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent),
        canActivate: [AuthGuard],
    },
    {
        path: 'orders',
        loadComponent: () => import('./features/order-history/order-history.component').then(m => m.OrderHistoryComponent),
        canActivate: [AuthGuard],
    },
    {
        path: 'order/:id',
        loadComponent: () => import('./features/order-details/order-details.component').then(m => m.OrderDetailsComponent),
        canActivate: [AuthGuard],
    },
    {
        path: 'order-confirmation',
        loadComponent: () => import('./features/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent),
        canActivate: [AuthGuard],
    },
    {
        path: 'delivery',
        loadComponent: () => import('./features/delivery-payment/delivery-payment.component').then(m => m.DeliveryPaymentComponent),
    },
    { path: '**', redirectTo: '' },
];
