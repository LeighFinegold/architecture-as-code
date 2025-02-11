import { Expose, Type } from 'class-transformer';

export class CalmInterface {
    @Expose({ name: 'unique-id' })
        uniqueId!: string;

    @Expose()
        type!: string;

    @Expose()
        details?: unknown;
}

export class CalmNodeInterface {
    @Expose()
        node!: string;

    @Expose()
    @Type(() => CalmInterface)
        interfaces!: CalmInterface[];
}