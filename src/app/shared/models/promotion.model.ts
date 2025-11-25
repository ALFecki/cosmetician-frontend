export enum TargetType {
    PRODUCT = 'product',
    BRAND = 'brand',
    CATEGORY = 'category',
    ALL = 'all'
}

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed'
}

export interface PromotionModel {
    id: string;
    title: string;
    description: string | null;
    targetType: TargetType;
    productIds: string[] | null;
    discountType: DiscountType;
    discountValue: number;
    minQuantity: number | null;
    buyQuantity: number | null;
    getQuantity: number | null;
    priority: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}