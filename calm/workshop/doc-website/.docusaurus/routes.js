import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '044'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', 'a1b'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '52c'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '76b'),
            routes: [
              {
                path: '/nodes/advertising',
                component: ComponentCreator('/nodes/advertising', 'c93'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/nodes/attendees-service',
                component: ComponentCreator('/nodes/attendees-service', 'b31'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/nodes/attendees-store',
                component: ComponentCreator('/nodes/attendees-store', '748'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/nodes/conference-website',
                component: ComponentCreator('/nodes/conference-website', '33b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/nodes/load-balancer',
                component: ComponentCreator('/nodes/load-balancer', 'd06'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'bea'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
