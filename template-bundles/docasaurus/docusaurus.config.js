module.exports = {
    title: 'My Docusaurus Docs',
    tagline: 'Generated documentation from CALM',
    url: 'http://localhost',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.ico',
    organizationName: 'my-org',
    projectName: 'calm-docs',

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    routeBasePath: '/', // Ensures docs are served at `/` instead of `/docs/`
                }
            },
        ],
    ]
};
