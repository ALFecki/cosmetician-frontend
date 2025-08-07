import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SingleResponse } from '../base/schemas/base_schema';

export interface StatisticsFilterSchema {
    brandId?: string[];
    categoryId?: string[];
    startDate?: string;
    endDate?: string;
    significanceCoefficient?: number;
}

export interface BrandProfitabilityResponse {
    brandId: string;
    brandName: string;
    profitabilityPercentage: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    unitsSold: number;
}

export interface WeightedROIResponse {
    brandId: string;
    brandName: string;
    weightedROI: number;
    totalProfit: number;
    totalInvestment: number;
    significanceCoefficient: number;
}

export interface InventoryTurnoverResponse {
    brandId: string;
    brandName: string;
    turnoverRatio: number;
    costOfGoodsSold: number;
    averageInventoryValue: number;
    totalUnitsSold: number;
    averageInventoryUnits: number;
}

export interface StatisticsSummaryResponse {
    brandProfitability: BrandProfitabilityResponse[];
    weightedROI: WeightedROIResponse[];
    inventoryTurnover: InventoryTurnoverResponse[];
}

@Injectable({
    providedIn: 'root',
})
export class StatisticsService {
    private readonly apiUrl = `${environment.server_url}/statistics`;

    constructor(private http: HttpClient) {}

    getStatisticsSummary(filter?: StatisticsFilterSchema): Observable<SingleResponse<StatisticsSummaryResponse>> {
        let params = new HttpParams();

        if (filter) {
            if (filter.brandId && filter.brandId.length > 0) {
                params = params.append('brandId[]', filter.brandId.join(','));
            }
            if (filter.categoryId && filter.categoryId.length > 0) {
                params = params.append('categoryId[]', filter.categoryId.join(','));
            }
            if (filter.startDate) {
                params = params.append('startDate', filter.startDate);
            }
            if (filter.endDate) {
                params = params.append('endDate', filter.endDate);
            }
            if (filter.significanceCoefficient !== undefined) {
                params = params.append('significanceCoefficient', filter.significanceCoefficient.toString());
            }
        }

        return this.http.get<SingleResponse<StatisticsSummaryResponse>>(`${this.apiUrl}/summary`, {
            params,
            withCredentials: true,
        });
    }

    getBrandProfitability(filter?: StatisticsFilterSchema): Observable<BrandProfitabilityResponse[]> {
        let params = new HttpParams();

        if (filter) {
            if (filter.brandId && filter.brandId.length > 0) {
                params = params.append('brandId', filter.brandId.join(','));
            }
            if (filter.categoryId && filter.categoryId.length > 0) {
                params = params.append('categoryId', filter.categoryId.join(','));
            }
            if (filter.startDate) {
                params = params.append('startDate', filter.startDate);
            }
            if (filter.endDate) {
                params = params.append('endDate', filter.endDate);
            }
            if (filter.significanceCoefficient !== undefined) {
                params = params.append('significanceCoefficient', filter.significanceCoefficient.toString());
            }
        }

        return this.http.get<BrandProfitabilityResponse[]>(`${this.apiUrl}/brand-profitability`, {
            params,
            withCredentials: true,
        });
    }

    getWeightedROI(filter?: StatisticsFilterSchema): Observable<WeightedROIResponse[]> {
        let params = new HttpParams();

        if (filter) {
            if (filter.brandId && filter.brandId.length > 0) {
                params = params.append('brandId', filter.brandId.join(','));
            }
            if (filter.categoryId && filter.categoryId.length > 0) {
                params = params.append('categoryId', filter.categoryId.join(','));
            }
            if (filter.startDate) {
                params = params.append('startDate', filter.startDate);
            }
            if (filter.endDate) {
                params = params.append('endDate', filter.endDate);
            }
            if (filter.significanceCoefficient !== undefined) {
                params = params.append('significanceCoefficient', filter.significanceCoefficient.toString());
            }
        }

        return this.http.get<WeightedROIResponse[]>(`${this.apiUrl}/weighted-roi`, {
            params,
            withCredentials: true,
        });
    }

    getInventoryTurnover(filter?: StatisticsFilterSchema): Observable<InventoryTurnoverResponse[]> {
        let params = new HttpParams();

        if (filter) {
            if (filter.brandId && filter.brandId.length > 0) {
                params = params.append('brandId', filter.brandId.join(','));
            }
            if (filter.categoryId && filter.categoryId.length > 0) {
                params = params.append('categoryId', filter.categoryId.join(','));
            }
            if (filter.startDate) {
                params = params.append('startDate', filter.startDate);
            }
            if (filter.endDate) {
                params = params.append('endDate', filter.endDate);
            }
            if (filter.significanceCoefficient !== undefined) {
                params = params.append('significanceCoefficient', filter.significanceCoefficient.toString());
            }
        }

        return this.http.get<InventoryTurnoverResponse[]>(`${this.apiUrl}/inventory-turnover`, {
            params,
            withCredentials: true,
        });
    }
}
