export interface OrderModel {
    id: string;
    personId: string;
    status: string;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}
