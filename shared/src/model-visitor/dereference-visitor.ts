import { CalmReferenceResolver } from '../resolver/calm-reference-resolver';
import { CalmModelVisitor } from './calm-model-visitor';
import { ModelWalker } from './model-walker.js';
import { initLogger, Logger } from '../logger.js';

/**
 * Dereferences every unresolved `Resolvable`/`ResolvableAndAdaptable` in the model.
 *
 * The traversal (including cycle safety and error collection) is owned by the shared
 * {@link ModelWalker}; this visitor only supplies the per-node behaviour of resolving
 * the reference via the injected {@link CalmReferenceResolver}.
 */
export class DereferencingVisitor implements CalmModelVisitor {
    private static _logger: Logger | undefined;
    private readonly resolver: CalmReferenceResolver;

    constructor(resolver: CalmReferenceResolver) {
        this.resolver = resolver;
    }

    private static get logger(): Logger {
        if (!this._logger) {
            this._logger = initLogger(process.env.DEBUG === 'true', DereferencingVisitor.name);
        }
        return this._logger;
    }

    async visit(obj: unknown): Promise<void> {
        const walker = new ModelWalker({
            onResolvable: async (node) => {
                if (!node.isResolved && node.reference) {
                    await node.dereference(this.resolver.resolve.bind(this.resolver));
                }
            }
        });

        await walker.walk(obj);

        for (const error of walker.errors) {
            DereferencingVisitor.logger.warn(
                `Failed to dereference Resolvable: ${error.reference} ${error.message}`
            );
        }
    }
}
