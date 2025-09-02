export interface ProductVariantModel {
    id: string;
    volume: number;
    price: number;
    costPrice: number;
    productId: string;
    isDeleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
