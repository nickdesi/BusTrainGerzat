import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://gerzatlive.desimone.fr';

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/carte`,
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
    ];
}
