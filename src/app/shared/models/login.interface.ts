import { PersonModel } from './person.model';

export interface LoginData {
    email: string;
    password: string;
}

export interface RegistrationData {
    firstName: string;
    secondName: string;
    surname: string | null;
    email: string;
    password: string;
}

export interface LoginResponse {
    claims: Claims;
    user: PersonModel;
}

export interface Claims {
    phone_auth?: boolean;
    email: string;
    expires: number;
    is_moderator: boolean;
    is_admin: boolean;
    csrf_token: string;
}
