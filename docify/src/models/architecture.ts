import {
    Relationship,
    RelationshipType,
    ComposedOfType,
    InteractsType,
    DeployedInType,
    NodeInterface,
    ConnectsType
} from "./relationship";
import {Node} from "./node"
import {Flow} from "./flow";

export class Architecture {
    name: string;
    description: string;
    nodes: Node[];
    relationships: Relationship[];
    flows: string[];

    constructor(data: any) {
        this.name = data.name;
        this.description = data.description;
        this.nodes = data.nodes.map((node: any) => ({
            'unique-id': node['unique-id'],
            'node-type': node['node-type'],
            name: node.name,
            description: node.description,
            'data-classification': node['data-classification'],
            'run-as': node['run-as'],
            instance: node.instance,
        }));

        this.relationships = data.relationships.map((relationship: any) => ({
            'unique-id': relationship['unique-id'],
            description: relationship.description,
            'relationship-type': this.parseRelationshipType(relationship['relationship-type']),
            protocol: relationship.protocol,
        }));

        this.flows = data.flows
    }

    private parseRelationshipType(type: any): RelationshipType {
        if (type.interacts) {
            return {interacts: this.parseInteractRelationship(type.interacts)};
        } else if (type.connects) {
            return {connects: this.parseConnectRelationship(type.connects)};
        } else if (type['deployed-in']) {
            return {'deployed-in': this.parseDeployedInRelationship(type['deployed-in'])};
        } else if (type['composed-of']) {
            return {'composed-of': this.parseComposedOfRelationship(type['composed-of'])};
        }
        throw new Error("Unsupported RelationshipType")
    }

    private parseInteractRelationship(interacts: any): InteractsType {
        return {actor: interacts.actor, nodes: interacts.nodes};
    }

    private parseConnectRelationship(connects: any): ConnectsType {
        return {
            source: {node: connects.source.node},
            destination: {node: connects.destination.node},
        };
    }

    private parseDeployedInRelationship(deployedIn: any): DeployedInType {
        return {container: deployedIn.container, nodes: deployedIn.nodes};
    }

    private parseComposedOfRelationship(composedOf: any): ComposedOfType {
        return {container: composedOf.container, nodes: composedOf.nodes};
    }

}
