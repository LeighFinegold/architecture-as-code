import {CalmException} from "./exception";
export type Try<T, E extends CalmException> = { type: 'success'; value: T } | { type: 'failure'; error: E };
export function Success<T>(value: T): Try<T, never> {
    return { type: 'success', value };
}
export function Failure<E extends CalmException>(error: E): Try<never, E> {
    return { type: 'failure', error };
}

export function isSuccess<T, E extends CalmException>(result: Try<T, E>): result is { type: 'success'; value: T } {
    return result.type === 'success';
}

export function isFailure<T, E extends CalmException>(result: Try<T, E>): result is { type: 'failure'; error: E } {
    return result.type === 'failure';
}