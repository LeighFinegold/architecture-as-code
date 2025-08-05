export interface CalmWidget<
    TContext = unknown,
    TOptions = object,
    TViewModel = unknown
> {
    id: string;
    templatePartial: string;
    partials?: string[];

    registerHelpers?: () => Record<string, (...args: any[]) => unknown>;

    transformToViewModel?: (
        context: TContext,
        options?: { hash?: TOptions }
    ) => TViewModel;

    validateContext: (context: unknown) => context is TContext;
}
