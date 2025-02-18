export interface CategoryModel {
    id: string;
    alias: string;
    title: string;
    description: string;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
}
