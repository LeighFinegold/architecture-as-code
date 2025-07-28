import { JSONPath } from 'jsonpath-plus';
import _ from 'lodash';
import { initLogger } from '../logger.js';

export interface PathExtractionOptions {
    filter?: Record<string, JsonFragment>;
    sort?: string | string[];
    limit?: number;
}

export type JsonFragment = string | number | boolean | null | JsonFragment[] | { [key: string]: JsonFragment };

/**
 * Utility class to extract data from CALM architecture models using path-like expressions.
 * It translates custom dotted path syntax into JSONPath internally.
 */
export class TemplatePathExtractor {
    private static logger = initLogger(process.env.DEBUG === 'true', TemplatePathExtractor.name);

    static extract(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        architecture: any, //This will be a new flattened CalmCoreModel and won't need to be any
        path: string,
        options: PathExtractionOptions = {}
    ): JsonFragment[] {
        const logger = TemplatePathExtractor.logger;

        try {
            const jsonPath = this.toJsonPath(path);
            let result = JSONPath({
                path: jsonPath,
                json: architecture,
                flatten: true
            });

            result = Array.isArray(result) ? result : [result];

            // Apply filtering - do I need this or can JSON path syntax surfice?
            if (options.filter) {
                result = result.filter(item => this.matchesFilter(item, options.filter!));
            }

            // Apply sorting
            if (options.sort) {
                const sortKeys = Array.isArray(options.sort) ? options.sort : [options.sort];
                result = _.orderBy(result, sortKeys);
            }

            // Apply limiting
            if (options.limit && options.limit > 0) {
                result = result.slice(0, options.limit);
            }

            logger.info(`PATH: ${path}`);
            logger.info(`Resolved JSONPath: ${jsonPath}`);

            return result;
        } catch (err) {
            logger.warn(`Failed to extract path "${path}": ${err.message}`);
            return [];
        }
    }

    /**
     * Converts a custom dotted path with bracket filters into JSONPath syntax
     */
    private static toJsonPath(input: string): string {
        let path = input.trim();

        if (!path.startsWith('$')) {
            path = '$.' + path;
        }

        // Convert [key=='value'] filters -- this is an addition or alternative to the filter= option
        path = path.replace(
            /\[(\w[\w-]*)==['"]([^'"]+)['"]\]/g,
            (_match, key, value) => `[?(@['${key}']=='${value}')]`
        );

        // Treat everything as filterable except controls and metadata
        const nonFilterable = ['controls', 'metadata'];

        path = path.replace(
            /(\b\w+)\['([^']+)'\]/g,
            (_match, parent, id) =>
                nonFilterable.includes(parent)
                    ? `${parent}['${id}']`
                    : `${parent}[?(@['unique-id']=='${id}')]`
        );

        return path;
    }

    private static matchesFilter(item: JsonFragment, filter: Record<string, JsonFragment>): boolean {
        for (const [key, expected] of Object.entries(filter)) {
            const actual = _.get(item, key);
            if (actual !== expected) {
                return false;
            }
        }
        return true;
    }
}
