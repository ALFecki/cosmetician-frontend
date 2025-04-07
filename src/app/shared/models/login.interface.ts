export interface LoginData {
    email: string;
    password: string;
}

export interface LoginResponse {
    csrf_token: string;
}

export interface Claims {
    email: string;
    expires: number;
    is_moderator: boolean;
    is_admin: boolean;
    csrf_token: string;
}
