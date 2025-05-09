export interface PersonModel {
    id: string;
    firstName: string;
    secondName: string;
    surname: string | null;
    email: string;
    phone: string;
    password: string;
    is_admin: boolean;
    is_moderator: boolean;
    createdAt: Date;
    updatedAt: Date;
}
