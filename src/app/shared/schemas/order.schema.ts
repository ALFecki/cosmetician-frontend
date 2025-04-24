import { FilterOptions } from '../base/schemas/base_schema';
import { OrderModel } from '../models/order.model';

export type CreateOrderSchema = Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderSchema = Partial<Omit<OrderModel, 'id' | 'createdAt' | 'updatedAt'>>;
export type FilterOrderSchema = UpdateOrderSchema & FilterOptions; // TODO: createdAt, updatedAt
