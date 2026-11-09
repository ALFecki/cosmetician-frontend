export interface BannerModel {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type BannerInput = Omit<BannerModel, 'id' | 'createdAt' | 'updatedAt' | 'image'> & { image: string | File };
