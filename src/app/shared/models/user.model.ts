export interface UserModel {
    id: string;
    email: string;
    firstName: string;
    secondName: string;
    surname: string | null;
    isAdmin: boolean;
    isModerator: boolean;
    createdAt?: string;
    updatedAt?: string;
}
