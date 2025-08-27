import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { AdminOrderDetailsComponent } from './shared/components/admin-order-details/admin-order-details.component';
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthGuard } from './shared/guards/auth.guard';
import { MaintenanceGuard } from './shared/guards/maintenance.guard';

export const routes: Routes = [
    {
        path: 'maintenance',
        loadComponent: () => import('./shared/components/maintenance/maintenance.component').then(m => m.MaintenanceComponent),
    },
    {
        path: '',
        loadChildren: () => import('./features/home/home.module').then(m => m.HomeModule),
        component: HomeComponent,
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'category/:id',
        loadComponent: () => import('./features/category/category.component').then(m => m.CategoryComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'brand/:id',
        loadComponent: () => import('./features/brand/brand.component').then(m => m.BrandComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'product/:id',
        loadComponent: () => import('./shared/components/product-card/product-card.component').then(m => m.ProductCardComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'products',
        loadComponent: () => import('./features/product-list/product-list.component').then(m => m.ProductListComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'login',
        loadComponent: () => import('./shared/components/login/login.component').then(m => m.LoginComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'cart',
        loadComponent: () => import('./shared/components/cart/cart.component').then(m => m.CartComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AuthGuard, AdminGuard, MaintenanceGuard],
    },
    {
        path: 'profile',
        loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
    },
    {
        path: 'orders',
        loadComponent: () => import('./features/order-history/order-history.component').then(m => m.OrderHistoryComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
    },
    {
        path: 'order/:id',
        loadComponent: () => import('./features/order-details/order-details.component').then(m => m.OrderDetailsComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
    },
    {
        path: 'order-confirmation',
        loadComponent: () => import('./features/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
    },
    {
        path: 'delivery',
        loadComponent: () => import('./features/delivery-payment/delivery-payment.component').then(m => m.DeliveryPaymentComponent),
        canActivate: [MaintenanceGuard],
    },
    {
        path: 'admin/order/:id',
        component: AdminOrderDetailsComponent,
        canActivate: [AuthGuard, AdminGuard],
        title: 'Детали заказа - Админ'
    },
    { path: '**', redirectTo: '' },
];
