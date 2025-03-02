debugger;
import {
    CalmContainerImageInterface, CalmCore,
    CalmInterface, CalmMetadata,
    CalmPortInterface,
    CalmTemplateTransformer,
    Pattern
} from "@finos/calm-shared";
import {CalmNode} from "@finos/calm-shared/dist/model/node";
import {CalmCoreSchema} from "@finos/calm-shared/dist/types/core-types";
import {CalmConnectsType, CalmDeployedInType, CalmRelationshipType} from "@finos/calm-shared/dist/model/relationship";


export class KubernetesTransformer implements CalmTemplateTransformer {
    getTransformedModel(calmJson: string) {
        const calmSchema: CalmCoreSchema = JSON.parse(calmJson);
        const pattern: Pattern = CalmCore.fromJson(calmSchema);

        const visitedModel: any = {
            deployment: [],
            database: [],
            service: [],
            "networkpolicy-allow-ingress": [],
            "networkpolicy-allow-egress-from-app-to-db": [],
            "networkpolicy-allow-ingress-to-db-from-app": [],
            namespace: [],
            kustomization: [],
        };

        // Iterate over nodes and categorize them
        pattern.nodes.forEach((node) => {
            const containers = this.extractContainers(node);

            if (node.nodeType === "system"){
                visitedModel.namespace.push({
                    id: node.uniqueId,
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                });
                visitedModel.kustomization.push({
                    id: node.uniqueId,
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                });
            }  else if (node.nodeType === "database") {
                visitedModel.database.push({
                    id: node.uniqueId,
                    type: node.nodeType,
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                    containers: containers.length > 0 ? containers : [{ name: node.name, image: "postgres:latest", ports: [] }],
                    metadata: this.extractMetadata(node.metadata),
                });
            } else if (node.nodeType === "service" || containers.length > 0) {
                visitedModel.deployment.push({
                    id: node.uniqueId,
                    type: node.nodeType,
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                    containers: containers.length > 0 ? containers : [{ name: node.name, image: "default-image:latest", ports: [] }],
                });
            }

            if (this.hasExposedPort(node.interfaces)) {
                visitedModel.service.push({
                    id: node.uniqueId,
                    type: node.nodeType,
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                    ports: this.getPorts(node.interfaces),
                });
            }
        });


        pattern.relationships.forEach((relationship) => {
            if (this.isConnectsRelationship(relationship.relationshipType)) {
                const sourceId = relationship.relationshipType.source.node;
                const targetId = relationship.relationshipType.destination.node;

                console.log(`🔗 Checking Connection: ${sourceId} → ${targetId}`);

                const targetNode = pattern.nodes.find((node) => node.uniqueId === targetId);
                if (!targetNode) {
                    console.warn(`⚠️ Skipping unknown target node: ${targetId}`);
                    return;
                }

                if (targetNode.nodeType === "database") {
                    console.log(`🛡️ Adding Database Egress Policy for ${targetId}`);
                    visitedModel["networkpolicy-allow-egress-from-app-to-db"].push({
                        id: `egress-${relationship.uniqueId}`,
                        appName: sourceId,
                        databaseName: targetId,
                    });

                    console.log(`🔄 Adding Ingress to Database Policy for ${targetId}`);
                    visitedModel["networkpolicy-allow-ingress-to-db-from-app"].push({
                        id: `ingress-db-${relationship.uniqueId}`,
                        appName: sourceId,
                        databaseName: targetId,
                    });
                }

                if (targetNode.nodeType === "service") {
                    console.log(`🌐 Adding General Ingress Policy for ${targetId}`);
                    visitedModel["networkpolicy-allow-ingress"].push({
                        id: `ingress-${relationship.uniqueId}`,
                        appName: targetId,
                    });
                }
            }
        });


        return {
            deployment: visitedModel.deployment.length > 0 ? visitedModel.deployment[0] : null,
            database: visitedModel.database.length > 0 ? visitedModel.database[0] : null,
            service: visitedModel.service,
            "networkpolicy-allow-ingress":
                visitedModel["networkpolicy-allow-ingress"].length > 0 ? visitedModel["networkpolicy-allow-ingress"][0] : null,
            "networkpolicy-allow-egress-from-app-to-db":
                visitedModel["networkpolicy-allow-egress-from-app-to-db"].length > 0 ? visitedModel["networkpolicy-allow-egress-from-app-to-db"][0] : null,
            "networkpolicy-allow-ingress-to-db-from-app":
                visitedModel["networkpolicy-allow-ingress-to-db-from-app"].length > 0 ? visitedModel["networkpolicy-allow-ingress-to-db-from-app"][0] : null,
            namespace: visitedModel.namespace.length > 0 ? visitedModel.namespace[0] : null,
            kustomization: visitedModel.kustomization.length > 0 ? visitedModel.kustomization[0] : null,
        };
    }


    private isConnectsRelationship(relationship: CalmRelationshipType): relationship is CalmConnectsType {
        return "source" in relationship && "destination" in relationship;
    }


    registerTemplateHelpers(): Record<string, (...args: any[]) => any> {
        return {};
    }

    private extractContainers(node: CalmNode) {
        const containers: any[] = [];

        node.interfaces?.forEach((iface: CalmInterface) => {
            if (this.isContainerImageInterface(iface)) {
                containers.push({
                    name: node.name.toLowerCase().replace(/\s+/g, "-"),
                    image: (iface as CalmContainerImageInterface).image,
                    ports: this.getPorts(node.interfaces),
                });
            }
        });

        return containers;
    }

    private isContainerImageInterface(iface: CalmInterface): iface is CalmContainerImageInterface {
        return (iface as CalmContainerImageInterface).image !== undefined;
    }


    private getPorts(interfaces: CalmInterface[]): number[] {
        return interfaces
            ?.filter((i): i is CalmPortInterface => this.isPortInterface(i)) // Ensure only Port Interfaces are processed
            .map((i) => i.port) || [];
    }

    private hasExposedPort(interfaces: CalmInterface[]): boolean {
        return interfaces?.some((i) => this.isPortInterface(i)) || false;
    }

    private isPortInterface(iface: CalmInterface): iface is CalmPortInterface {
        return (iface as CalmPortInterface).port !== undefined;
    }


    private extractMetadata(metadata?: CalmMetadata): Record<string, any> {
        if (!metadata) return {};
        return Object.entries(metadata.data).reduce((metaObj, [key, value]) => {
            metaObj[key.toUpperCase().replace(/-/g, "_")] = value;
            return metaObj;
        }, {} as Record<string, any>);
    }
}

export default KubernetesTransformer;
