export class DocusaurusTransformer {
    getTransformedModel(calmJson) {
        const calmSchema = JSON.parse(calmJson);

        if (!calmSchema.nodes || !Array.isArray(calmSchema.nodes)) {
            throw new Error("Invalid CALM model: missing 'nodes' array.");
        }

        // Extract documentation sections from nodes
        const docs = calmSchema.nodes.map(node => ({
            id: node["unique-id"],
            title: node.name,
            slug: node["unique-id"], // Generate slug
            content: node.description || 'No description available.',
            type: node["node-type"] || 'unknown'
        }));
        const sidebar = docs.map(doc => doc.id);

        return {
            docs,
            sidebar : sidebar
        };

        return {
            docs,
            sidebar: sidebar
        };
    }

    registerTemplateHelpers() {
        return {};
    }
}

export default DocusaurusTransformer;
