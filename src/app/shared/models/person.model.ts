import { CheckoutDetails } from './checkout.model';

export interface PersonModel {
    id: string;
    firstName: string;
    secondName: string;
    surname: string | null;
    email: string | null;
    contactEmail?: string | null;
    verifiedPhone?: string | null;
    phoneVerifiedAt?: string | null;
    checkoutDetails?: CheckoutDetails | null;
    phone: string;
    password?: string | null;
    is_admin: boolean;
    is_moderator: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
