import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { SingleResponse } from '../base/schemas/base_schema';

export function uploadImage(http: HttpClient, apiUrl: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return http.post<SingleResponse<{ path: string }>>(`${apiUrl}/upload/image`, formData).pipe(map(response => response.data.path));
}
