import React from 'react';

/**
 * High-precision Schema.org JSON-LD structured data graph for Gerzat Live.
 * Validated for Google Search Console and Google Rich Results.
 */
export default function StructuredData() {
  const schemaGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://gerzatlive.desimone.fr/#website',
        url: 'https://gerzatlive.desimone.fr/',
        name: 'Gerzat Live',
        alternateName: ['GerzatLive', 'Bus Train Gerzat', 'Horaires Gerzat T2C TER'],
        description: 'Horaires en direct des bus T2C (ligne E1) et trains TER SNCF à Gerzat.',
        inLanguage: 'fr-FR',
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://gerzatlive.desimone.fr/#webapp',
        name: 'Gerzat Live - Transports en direct',
        url: 'https://gerzatlive.desimone.fr/app',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        description:
          'Application web progressive (PWA) de suivi en temps réel des bus T2C Ligne E1 et des trains TER en gare de Gerzat.',
        featureList: [
          'Horaires bus T2C en direct (Ligne Express E1)',
          'Horaires TER SNCF en gare de Gerzat',
          'Carte interactive des véhicules en circulation',
          'Tableau des départs et arrivées façon aéroport',
          'Fonctionnement hors-ligne et notifications',
        ],
        screenshot: 'https://gerzatlive.desimone.fr/icon-512.png',
        author: {
          '@type': 'Person',
          name: 'Nicolas De Simone',
          url: 'https://github.com/nickdesi',
        },
      },
      {
        '@type': 'TrainStation',
        '@id': 'https://gerzatlive.desimone.fr/#station-gerzat',
        name: 'Gare de Gerzat',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Gerzat',
          postalCode: '63360',
          addressRegion: 'Auvergne-Rhône-Alpes',
          addressCountry: 'FR',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 45.8236,
          longitude: 3.1444,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://gerzatlive.desimone.fr/#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: 'https://gerzatlive.desimone.fr/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Tableau des Départs',
            item: 'https://gerzatlive.desimone.fr/app',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Arrivées',
            item: 'https://gerzatlive.desimone.fr/app/arrivees',
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'Carte Interactive',
            item: 'https://gerzatlive.desimone.fr/app/carte',
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
    />
  );
}
