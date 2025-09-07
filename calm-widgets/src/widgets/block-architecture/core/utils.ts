import { CalmNodeCanonicalModel } from '@finos/calm-models/canonical';

// Type definition for node interface structure
interface NodeInterface {
    interface?: string;
    interfaces?: string[];
    node?: string;
}

export const prettyLabel = (id: string) =>
    (id || '')
        .replace(new RegExp(String.raw`[_\-]+`, 'g'), ' ')
        .replace(new RegExp(String.raw`\s+`, 'g'), ' ')
        .trim()
        .replace(new RegExp(String.raw`\b\w`, 'g'), c => c.toUpperCase());

export const labelFor = (n: CalmNodeCanonicalModel | undefined, id?: string) =>
    (n?.name || (n as CalmNodeCanonicalModel & { label?: string })?.label || n?.['unique-id'] || (id ? prettyLabel(id) : ''));

export const sanitizeId = (s: string) => s.replace(new RegExp(String.raw`[^\w\-:.]`, 'g'), '_');
export const ifaceId = (nodeId: string, ifaceKey: string) => `${nodeId}__iface__${sanitizeId(ifaceKey)}`;

export const pickIface = (ni: NodeInterface): string | undefined =>
    ni?.interface ?? (Array.isArray(ni?.interfaces) ? ni.interfaces[0] : undefined);
