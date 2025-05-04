export interface FilterOptions {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
}

export interface ListResponse<Model> {
    status: string;
    length: number;
    data: Model[];
}

export interface SingleResponse<Model> {
    status: string;
    data: Model;
}

export interface ErrorResponse {
    status: string;
}
