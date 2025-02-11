import { Expose, Type } from 'class-transformer';
import { CalmInterface } from './interface';
import { CalmControl } from './control';
import { CalmMetadata } from './metadata';

export class CalmNode {
    @Expose({ name: 'unique-id' })
        uniqueId!: string;

    @Expose({ name: 'node-type' })
        nodeType!: string;

    @Expose()
        name!: string;

    @Expose()
        description!: string;

    @Expose()
        details?: unknown;

    @Expose({ name: 'data-classification' })
        dataClassification?: string;

    @Expose({ name: 'run-as' })
        runAs?: string;

    @Expose()
        instance?: string;

    @Expose()
    @Type(() => CalmInterface)
        interfaces!: CalmInterface[];

    @Expose()
    @Type(() => CalmControl)
        controls!: CalmControl[];

    @Expose()
    @Type(() => CalmMetadata)
        metadata!: CalmMetadata[];
}
