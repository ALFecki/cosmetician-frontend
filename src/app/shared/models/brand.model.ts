export interface BrandModel {
    id: string;
    alias: string;
    title: string;
    description: string;
    image?: string;
    created_at: Date;
    updated_at: Date;
}