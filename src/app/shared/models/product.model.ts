import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { CountryModel } from './country.model';

export interface ProductModel {
    id: string;
    title: string;
    fullTitle: string;
    description: string;
    image: string;
    price: number;
    volume: number;
    methodOfUse?: string;
    brandId: string;
    brand: BrandModel;

    productScope: string;
    productType: string;
    countries: CountryModel[];
    categoryId: string;
    categories: CategoryModel[];
    

    createdAt: Date;
    updatedAt: Date;
}
