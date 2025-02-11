import { Expose, Type, Transform } from 'class-transformer';

export class CalmNodeInterface {
    @Expose()
        node!: string;
}

export class CalmInterface {
    @Expose({ name: 'unique-id' })
        uniqueId!: string;
    @Expose()
        type!: string;
}

export class CalmInteracts {
    @Expose()
        actor!: string;
    @Expose()
        nodes!: string[];
}

export class CalmConnects {
    @Expose()
    @Type(() => CalmNodeInterface)
        source!: CalmNodeInterface;
    @Expose()
    @Type(() => CalmNodeInterface)
        destination!: CalmNodeInterface;
}

export class CalmDeployedIn {
    @Expose()
        container!: string;
    @Expose()
        nodes!: string[];
}

export class CalmComposedOf {
    @Expose()
        container!: string;
    @Expose()
        nodes!: string[];
}

export type CalmRelationshipTypeUnion = CalmInteracts | CalmConnects | CalmDeployedIn | CalmComposedOf;

export class CalmRelationship {
    @Expose({ name: 'unique-id' })
        uniqueId!: string;
    @Expose()
        description!: string;
    @Expose({ name: 'relationship-type' })
    @Transform(({ value }) => {
        if (value == null || typeof value !== 'object') return value;
        if ('interacts' in value) {
            return Object.assign(new CalmInteracts(), value.interacts);
        }
        if ('connects' in value) {
            return Object.assign(new CalmConnects(), value.connects);
        }
        if ('deployed-in' in value) {
            return Object.assign(new CalmDeployedIn(), value['deployed-in']);
        }
        if ('composed-of' in value) {
            return Object.assign(new CalmComposedOf(), value['composed-of']);
        }
        return value;
    }, { toClassOnly: true })
        relationshipType!: CalmRelationshipTypeUnion;
    @Expose()
        protocol?: string;
    @Expose()
        authentication?: string;
    @Expose()
        metadata!: object[];
    @Expose()
        controls!: unknown;
}
