import Handlebars from 'handlebars';
import { registerTemplateHelpers } from './widget-helpers';
import { registerWidget } from './widget-registry';
import { CalmWidget } from './types';
import {WidgetRenderer} from './widget-renderer';

/**
 * Registers all helpers and widgets for the templating engine.
 * Call this once in app/test setup.
 */
export function setupWidgetEngine(widgets: { widget: CalmWidget<unknown>, folder: string }[]) {
    const helpers = registerTemplateHelpers();

    for (const [name, fn] of Object.entries(helpers)) {
        Handlebars.registerHelper(name, fn);
    }

    for (const { widget, folder } of widgets) {
        registerWidget(widget, folder);
        registerWidgetHelper(widget.id); // 👈 add this line here
    }
}


export function registerWidgetHelper(widgetId: string) {
    Handlebars.registerHelper(`w:${widgetId}`, function(context: unknown, options: any) {
        const renderer = new WidgetRenderer(Handlebars);
        return new Handlebars.SafeString(renderer.render(widgetId, context, options));
    });
}