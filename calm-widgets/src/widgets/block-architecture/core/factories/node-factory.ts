import { CalmNodeCanonicalModel } from '@finos/calm-models/canonical';
import { VMLeafNode, VMAttach } from '../../types';
import { VMNodeFactory } from './vm-factory-interfaces';
import { labelFor, ifaceId } from '../utils';

/**
 * Standard implementation of VMNodeFactory for creating leaf nodes with interface attachments
 */
export class StandardVMNodeFactory implements VMNodeFactory {
    createLeafNode(node: CalmNodeCanonicalModel, renderInterfaces: boolean): { node: VMLeafNode; attachments: VMAttach[] } {
        const attachments: VMAttach[] = [];
        const leaf: VMLeafNode = {
            id: node['unique-id'],
            label: labelFor(node, node['unique-id'])
        };

        if (renderInterfaces && Array.isArray(node.interfaces) && node.interfaces.length > 0) {
            leaf.interfaces = node.interfaces.map(itf => {
                const iid = ifaceId(node['unique-id'], itf['unique-id']);
                attachments.push({ from: node['unique-id'], to: iid });
                return { id: iid, label: `◻ ${itf.name || itf['unique-id']}` };
            });
        }

        return { node: leaf, attachments };
    }
}
