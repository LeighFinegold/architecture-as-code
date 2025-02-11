import {Exclude, Expose, Type, Transform} from 'class-transformer';
import { CalmNode } from './node';
import { CalmRelationship } from './relationship';
import { CalmFlow } from './flow';
import { CalmControl } from './control';
import { CalmMetadata } from './metadata';

@Exclude()
export class CalmArchitecture {
    @Expose()
    @Type(() => CalmNode)
        nodes!: CalmNode[];

    @Expose()
    @Type(() => CalmRelationship)
        relationships!: CalmRelationship[];

    @Expose()
    @Type(() => CalmMetadata)
        metadata!: CalmMetadata[];

    @Expose()
    @Type(() => CalmControl)
        controls!: CalmControl[];

    @Expose()
    @Transform(({ value }) => {
        if (!Array.isArray(value)) return value;
        return value.map((item: unknown) => {
            // If it's a string, assume it's a reference and return as is.
            if (typeof item === 'string') {
                return item;
            }
            // Otherwise, assume it's an object and transform it into a CalmFlow.
            // (You could also use plainToInstance here if needed.)
            return Object.assign(new CalmFlow(), item);
        });
    }, { toClassOnly: true })
        flows!: (string | CalmFlow)[];
}
