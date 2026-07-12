export interface BrandModel {
    id: string;
    title: string;
    description: string;
    image?: string;
    manufacturer?: string;
    importer?: string;
    createdAt: Date;
    updatedAt: Date;
}
