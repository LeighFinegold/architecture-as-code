import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { CalmWidget } from './types';
const registry: Record<string, CalmWidget<unknown>> = {};

/**
 * Registers a widget and its associated Handlebars partial(s).
 * - Main template is registered under `widget.id`
 * - Supporting partials (if any) are registered under their filenames
 *
 * @param widget - the CalmWidget definition
 * @param widgetFolder - the directory where the widget and its templates live (usually __dirname)
 */
export function registerWidget<TContext>(
    widget: CalmWidget<TContext>,
    widgetFolder: string
): void {

    const mainPath = path.join(widgetFolder, widget.templatePartial);
    const mainSource = fs.readFileSync(mainPath, 'utf-8');
    Handlebars.registerPartial(widget.templatePartial, mainSource); // for internal use
    Handlebars.registerPartial(widget.id, mainSource); // for internal use
    widget.partials?.forEach((partialFile) => {
        const partialPath = path.join(widgetFolder, partialFile);
        const partialSource = fs.readFileSync(partialPath, 'utf-8');
        Handlebars.registerPartial(partialFile, partialSource);
    });

    if (typeof widget.registerHelpers === 'function') {
        const helpers = widget.registerHelpers();
        for (const [name, fn] of Object.entries(helpers)) {
            Handlebars.registerHelper(name, fn);
        }
    }


    registry[widget.id] = widget as CalmWidget<unknown>;
}


/**
 * Retrieve a registered widget by ID.
 */
export function getWidget(id: string): CalmWidget<unknown> | undefined {
    return registry[id];
}

/**
 * Clear all registered widgets — useful for tests.
 */
export function clearWidgets(): void {
    Object.keys(registry).forEach((key) => delete registry[key]);
}
