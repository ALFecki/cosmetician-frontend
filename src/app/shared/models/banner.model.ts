export const homeBannerId = '00000000-0000-4000-8000-000000000000';

export interface BannerModel {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export type BannerInput = Omit<BannerModel, 'id' | 'createdAt' | 'updatedAt' | 'image'> & { image: string | File };
