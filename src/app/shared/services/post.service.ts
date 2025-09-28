import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PostPlacement } from '../models/utils.interface';
import { environment } from '../../../environments/environment';
import { ListResponse } from '../base/schemas/base_schema';

@Injectable({
    providedIn: 'root',
})
export class PostService {
    constructor(private http: HttpClient) {}

    getPostPlacements(): Observable<ListResponse<PostPlacement>> {
        return this.http.get<ListResponse<PostPlacement>>(`${environment.server_url}/post_placements`);
    }
}
