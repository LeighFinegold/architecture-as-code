import { Resolvable, ResolvableAndAdaptable, AnyResolvable } from '@finos/calm-models/model';
import { getErrorMessage } from '../error-utils.js';

/**
 * An error encountered while walking the model. Rather than swallowing failures
 * (the original sample visitor logged them with `console.warn`), the walk collects
 * them so callers can surface them however they need to.
 */
export interface ModelWalkError {
    path: string[];
    reference: string;
    message: string;
}

/**
 * Per-consumer behaviour for the shared model walk. Implementations decide what to
 * do at each resolvable (dereference, validate, index, ...) — the walk itself owns
 * traversal, cycle detection and error collection.
 */
export interface ResolvableHook {
    /**
     * Called once per resolvable reference encountered on the current traversal path.
     * The walk guarantees a reference cannot appear twice on the same path (a cycle),
     * so hooks do not need their own cycle guard.
     */
    onResolvable(node: AnyResolvable, path: string[]): Promise<void>;
}

function isResolvable(obj: unknown): obj is AnyResolvable {
    return obj instanceof Resolvable || obj instanceof ResolvableAndAdaptable;
}

/**
 * A single, cycle-safe traversal of the CALM model.
 *
 * This promotes the original {@link import('./dereference-visitor').DereferencingVisitor}
 * (which began life as a sample of how to visit the model) into shared infrastructure:
 *  - it tracks the references on the *current* traversal path, so a reference that is
 *    reachable from itself (a cycle) terminates instead of recursing unbounded, while
 *    legitimate duplicate references in sibling branches are each still visited;
 *  - it collects resolution failures rather than logging and discarding them;
 *  - consumers only implement {@link ResolvableHook}, so dereferencing, validation and
 *    indexing all share exactly one walk.
 *
 * The active-path set is threaded down the recursion immutably (a fresh set is created when
 * descending through a resolvable) so that concurrently-walked array branches never observe
 * one another's in-progress references.
 */
export class ModelWalker {
    readonly errors: ModelWalkError[] = [];

    constructor(private readonly hook: ResolvableHook) {}

    async walk(obj: unknown, path: string[] = [], activeRefs: ReadonlySet<string> = new Set()): Promise<void> {
        if (!obj || typeof obj !== 'object') {
            return;
        }

        if (isResolvable(obj)) {
            const ref = obj.reference;
            if (ref && activeRefs.has(ref)) {
                return;
            }
            const nextActive = ref ? new Set(activeRefs).add(ref) : activeRefs;
            try {
                await this.hook.onResolvable(obj, path);
            } catch (err) {
                this.errors.push({
                    path,
                    reference: ref,
                    message: getErrorMessage(err)
                });
            }
            if (obj.isResolved) {
                await this.walk(obj.value, path, nextActive);
            }
            return;
        }

        if (Array.isArray(obj)) {
            await Promise.all(obj.map((item, i) => this.walk(item, [...path, `[${i}]`], activeRefs)));
            return;
        }

        for (const [key, value] of Object.entries(obj)) {
            await this.walk(value, [...path, key], activeRefs);
        }
    }
}
