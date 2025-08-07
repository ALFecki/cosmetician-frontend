import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
    name: 'imageUrl',
    standalone: true,
})
export class ImageUrlPipe implements PipeTransform {
    transform(imagePath: string | null | undefined): string {
        if (!imagePath) {
            return 'assets/images/products/no-image.png';
        }

        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }

        if (imagePath.startsWith('assets/')) {
            return imagePath;
        }

        return `${environment.server_url}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    }
}
