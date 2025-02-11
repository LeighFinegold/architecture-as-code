// CalmControl.ts
import { Expose, Type } from 'class-transformer';

export class CalmControl {
    @Expose({ name: 'control-id' })
        controlId!: string;

    @Expose()
        description!: string;

    @Expose()
    @Type(() => CalmControlRequirement)
        requirements!: CalmControlRequirement[];
}

export class CalmControlRequirement {
    @Expose({ name: 'control-requirement-url' })
        controlRequirementUrl!: string;

    @Expose({ name: 'control-config-url' })
        controlConfigUrl!: string;
}
