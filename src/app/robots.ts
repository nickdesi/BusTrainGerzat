import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://gerzatlive.desimone.fr';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
            },
            {
                userAgent: 'GPTBot',
                disallow: '/',
            },
            {
                userAgent: 'ClaudeBot',
                disallow: '/',
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
