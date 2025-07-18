import {
    CalmNodeInterfaceSchema
} from '../types/interface-types.js';
import { CalmInterfaceDefinitionSchema } from '../types/interface-types.js';
import { CalmInterfaceSchema }           from '../types/core-types.js';


export class CalmInterface {
    constructor(public uniqueId: string) {}

    static fromJson(data: CalmInterfaceSchema): CalmInterface {
        return CalmInterfaceDefinition.fromJson(data as CalmInterfaceDefinitionSchema);
    }
}

export class CalmInterfaceDefinition extends CalmInterface {
    constructor(
        public uniqueId: string,
        public interfaceDefinitionUrl: string,
        public configuration: Record<string, unknown>
    ) {
        super(uniqueId);
    }

    static fromJson(data: CalmInterfaceDefinitionSchema): CalmInterfaceDefinition {
        return new CalmInterfaceDefinition(
            data['unique-id'],
            data['definition-url'],
            data.config
        );
    }
}

export class CalmNodeInterface {
    constructor(public node: string, public interfaces: string[]) {}

    static fromJson(data: CalmNodeInterfaceSchema): CalmNodeInterface {
        return new CalmNodeInterface(data.node, data.interfaces);
    }
}
