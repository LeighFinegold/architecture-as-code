/**
 * Collection of helpers used by widget templates.
 */
export function registerTemplateHelpers(): Record<string, (...args: unknown[]) => unknown> {
    return {
        eq: (a, b) => a === b,
        lookup: (obj, key: any) => obj?.[key],
        json: (obj) => JSON.stringify(obj, null, 2),
        instanceOf: (value, className: string) => value?.constructor?.name === className,
        kebabToTitleCase: (str: string) =>
            str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        kebabCase: (str: string) =>
            str.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        isObject: (value: unknown) => {
            return typeof value === 'object' && value !== undefined && value !== null && !Array.isArray(value);
        },
        isArray: (value: unknown) => Array.isArray(value),
        notEmpty: (value: unknown): boolean => {
            if (value == null) return false;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'object') {
                if (value instanceof Map || value instanceof Set) return value.size > 0;
                return Object.keys(value).length > 0;
            }
            if (typeof value === 'string') return value.trim().length > 0;
            return Boolean(value);
        },
        or: (...args: unknown[]) => args.slice(0, -1).some(Boolean),
        eachInMap: (map: Record<string, any>, options: any) => {
            let result = '';
            for (const key in map) {
                if (Object.prototype.hasOwnProperty.call(map, key)) {
                    const context = { ...map[key], key };
                    result += options.fn(context);
                }
            }
            return result;
        }
    };
}
