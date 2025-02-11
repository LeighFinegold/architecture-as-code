import { Expose, Type } from 'class-transformer';

export class CalmFlow {
    @Expose({ name: 'unique-id' })
        uniqueId!: string;

    @Expose()
        name!: string;

    @Expose()
        description!: string;

    @Expose()
    @Type(() => CalmFlowTransition)
        transitions!: CalmFlowTransition[];
}

export class CalmFlowTransition {
    @Expose({ name: 'relationship-unique-id' })
        relationshipUniqueId!: string;

    @Expose({ name: 'sequence-number' })
        sequenceNumber!: number;

    @Expose()
        summary!: string;

    @Expose()
        direction!: 'source-to-destination' | 'destination-to-source';
}