import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';

export interface ProductModel {
    id: string;
    alias: string;
    title: string;
    description: string;
    image: string;
    price: number;
    volume: number;
    methodOfUse?: string;
    brandId: string;
    brand: BrandModel;

    productScope: string;
    productType: string;
    country: string;
    categoryId: string;
    category: CategoryModel;

    createdAt: Date;
    updatedAt: Date;
}
