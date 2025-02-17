export interface FilterOptions {
    page?: number;
    limit?: number;
}

export interface ListResponse<Model> {
    status: string;
    length: number;
    data: Array<Model>;
}

export interface SingleResponse<Model> {
    status: string;
    data: Model;
}

export interface ErrorResponse {
    status: string
}