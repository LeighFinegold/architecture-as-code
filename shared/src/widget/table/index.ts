import {CalmWidget} from '../types';


export const tableWidget: CalmWidget<
    Array<Record<string, unknown>>,              // TContext
    { key?: string; headers?: boolean },         // TOptions
    { headers?: boolean; rows: Array<{ id: string; data: Record<string, unknown> }> }
> = {
    id: 'table',
    templatePartial: 'table-template.html',
    partials: ['row-template.html'],

    transformToViewModel: (context, options) => {
        const hash = options?.hash ?? {};
        const key = typeof hash.key === 'string' ? hash.key : 'id';

        const rows = context
            .filter((item): item is Record<string, unknown> => {
                const id = item?.[key];
                return typeof id === 'string' && id.trim() !== '';
            })
            .map((item) => {
                const cleaned = Object.fromEntries(
                    Object.entries(item).filter(([_, value]) => value !== undefined)
                ) as Record<string, unknown>;

                const id = cleaned[key];
                if (typeof id !== 'string') {
                    throw new Error(`Invalid key '${key}'`);
                }

                return {
                    id,
                    data: cleaned
                };
            });

        return {
            headers: hash.headers !== false,
            rows
        };
    },

    validateContext: (context): context is Array<Record<string, unknown>> => {
        return Array.isArray(context) &&
        context.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                !Array.isArray(item)
        );
    },
    registerHelpers: () => ({
        objectEntries: (obj: unknown) => {
            if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [];
            return Object.entries(obj).map(([id, data]) => ({ id, data }));
        }
    })

};
