import { initLogger } from '../../../logger.js';
import { SchemaDirectory } from '../../../schema-directory.js';
import { appendPath } from '../../../util.js';
import { instantiateGenericObject } from './instantiate.js';

export function instantiateMetadataObject(definition: object, schemaDirectory: SchemaDirectory, path: string[], debug: boolean = false, instantiateAll: boolean = false): object {
    const metadata = instantiateGenericObject(definition, schemaDirectory, 'metadata', path, debug, instantiateAll);
    if (typeof metadata !== 'object') {
        const message = 'Expected an object during instantiation, got a string. Could there be a top-level $ref to an enum or string type?';
        initLogger(debug).error(message);
        throw Error(message);
    }
    return metadata;
}



export function instantiateAllMetadata(pattern: object, schemaDirectory: SchemaDirectory, debug: boolean = false, instantiateAll: boolean = false): object[] {
    const logger = initLogger(debug, instantiateAllMetadata.name);
    const metadataObjects = pattern['properties']?.metadata?.prefixItems;
    if (!metadataObjects) {
        logger.debug('Warning: pattern has no metadata fields defined, skipping instantiation.');
        if (pattern['properties']?.metadata?.items) {
            logger.warn('Note: properties.metadata.items is deprecated: please use prefixItems instead.');
        }
        return [];
    }
    const outputMetadata = [];

    for (const [index, metadataObj] of metadataObjects.entries()) {
        const path = appendPath<string>(['metadata'], index);
        outputMetadata.push(instantiateMetadataObject(metadataObj, schemaDirectory, path, debug, instantiateAll));
    }
    return outputMetadata;
}

export function instantiateControl(definition: object, schemaDirectory: SchemaDirectory, path: string[], debug: boolean = false, instantiateAll: boolean = false): object {
    const metadata = instantiateGenericObject(definition, schemaDirectory, 'control', path, debug, instantiateAll);
    if (typeof metadata !== 'object') {
        const message = 'Expected an object during instantiation, got a string. Could there be a top-level $ref to an enum or string type?';
        initLogger(debug).error(message);
        throw Error(message);
    }
    return metadata;
}

export function instantiateControls(pattern: object, schemaDirectory: SchemaDirectory, debug: boolean = false, instantiateAll: boolean = false): object[] {
    const logger = initLogger(debug, instantiateControls.name);
    const controls = pattern['properties']?.controls;
    if (!controls) {
        logger.debug('Warning: pattern has no metadata fields defined, skipping instantiation.');
        if (pattern['properties']?.controls?.items) {
            logger.warn('Note: properties.metadata.items is deprecated: please use prefixItems instead.');
        }
        return [];
    }
    const outputMetadata = [];

    for (const [index, metadataObj] of controls.entries()) {
        const path = appendPath<string>(['controls'], index);
        outputMetadata.push(instantiateControl(metadataObj, schemaDirectory, path, debug, instantiateAll));
    }
    return outputMetadata;
}