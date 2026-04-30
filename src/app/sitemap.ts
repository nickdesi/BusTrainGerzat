import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://gerzatlive.desimone.fr';
    const lastModified = new Date('2026-04-30');

    return [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/app`,
            lastModified,
            changeFrequency: 'always',
            priority: 0.95,
        },
        {
            url: `${baseUrl}/app/carte`,
            lastModified,
            changeFrequency: 'always',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/app/arrivees`,
            lastModified,
            changeFrequency: 'always',
            priority: 0.75,
        },
    ];
}
