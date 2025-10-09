import { Routes } from '@angular/router';
import { AdminOrderDetailsComponent } from './shared/components/admin-order-details/admin-order-details.component';
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthGuard } from './shared/guards/auth.guard';
import { MaintenanceGuard } from './shared/guards/maintenance.guard';

export const routes: Routes = [
    {
        path: 'maintenance',
        loadComponent: () => import('./shared/components/maintenance/maintenance.component').then(m => m.MaintenanceComponent),
        title: 'Сайт на техническом обслуживании',
    },
    {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
        canActivate: [MaintenanceGuard],
        title: 'SkViDerm - Косметика и уход за кожей',
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
        title: 'Все товары - SkViDerm',
    },
    {
        path: 'login',
        loadComponent: () => import('./shared/components/login/login.component').then(m => m.LoginComponent),
        canActivate: [MaintenanceGuard],
        title: 'Вход - SkViDerm',
    },
    {
        path: 'cart',
        loadComponent: () => import('./shared/components/cart/cart.component').then(m => m.CartComponent),
        canActivate: [MaintenanceGuard],
        title: 'Корзина - SkViDerm',
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AuthGuard, AdminGuard, MaintenanceGuard],
        title: 'Админ - SkViDerm',
    },
    {
        path: 'profile',
        loadComponent: () => import('./features/user-profile/user-profile.component').then(m => m.UserProfileComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
        title: 'Профиль - SkViDerm',
    },
    {
        path: 'orders',
        loadComponent: () => import('./features/order-history/order-history.component').then(m => m.OrderHistoryComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
        title: 'История заказов - SkViDerm',
    },
    {
        path: 'order/:id',
        loadComponent: () => import('./features/order-details/order-details.component').then(m => m.OrderDetailsComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
        title: 'Детали заказа - SkViDerm',
    },
    {
        path: 'order-confirmation',
        loadComponent: () => import('./features/order-confirmation/order-confirmation.component').then(m => m.OrderConfirmationComponent),
        canActivate: [AuthGuard, MaintenanceGuard],
        title: 'Подтверждение заказа - SkViDerm',
    },
    {
        path: 'delivery',
        loadComponent: () => import('./features/delivery-payment/delivery-payment.component').then(m => m.DeliveryPaymentComponent),
        canActivate: [MaintenanceGuard],
        title: 'Доставка и оплата - SkViDerm',
    },
    {
        path: 'contacts',
        loadComponent: () => import('./features/contacts/contacts.component').then(m => m.ContactsComponent),
        canActivate: [MaintenanceGuard],
        title: 'Контакты - SkViDerm',
    },
    {
        path: 'admin/order/:id',
        component: AdminOrderDetailsComponent,
        canActivate: [AuthGuard, AdminGuard],
        title: 'Детали заказа - Админ',
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./features/password-reset/password-reset.component').then(m => m.PasswordResetComponent),
        title: 'Восстановление пароля - SkViDerm',
    },
    {
        path: 'personal-data',
        loadComponent: () => import('./features/personal-data/personal-data.component').then(m => m.PersonalDataRedirectComponent),
        canActivate: [MaintenanceGuard],
        title: 'Политика обработки персональных данных - SkViDerm',
    },
    { path: '**', redirectTo: '' },
];
