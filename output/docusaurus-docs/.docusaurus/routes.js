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
    path: '/',
    component: ComponentCreator('/', 'a23'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '276'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '1f8'),
            routes: [
              {
                path: '/accounts-service',
                component: ComponentCreator('/accounts-service', 'e01'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/internal-bank-network',
                component: ComponentCreator('/internal-bank-network', 'c41'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/people-service',
                component: ComponentCreator('/people-service', '649'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/position-service',
                component: ComponentCreator('/position-service', '50c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reference-data-service',
                component: ComponentCreator('/reference-data-service', 'b5d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/trade-feed',
                component: ComponentCreator('/trade-feed', '0bb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/trade-processor',
                component: ComponentCreator('/trade-processor', '665'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/traderx-db',
                component: ComponentCreator('/traderx-db', '780'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/traderx-system',
                component: ComponentCreator('/traderx-system', 'c01'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/traderx-trader',
                component: ComponentCreator('/traderx-trader', '80b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/trading-services',
                component: ComponentCreator('/trading-services', '4c0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/user-directory',
                component: ComponentCreator('/user-directory', 'e44'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/web-client',
                component: ComponentCreator('/web-client', 'b2f'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/web-gui-process',
                component: ComponentCreator('/web-gui-process', '5ee'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', 'c48'),
                exact: true
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
