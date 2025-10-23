export interface FilterOptions {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    sort?: string;
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

export interface MaintenanceStatus {
    enabled: boolean;
    ttl: number | undefined;
}

export interface MaintenanceResponse extends MaintenanceStatus {
    status: string;
}

export interface ErrorResponse {
    status: string;
}

export interface ForgotPasswordResponse {
    status: string;
    link: string;
}
