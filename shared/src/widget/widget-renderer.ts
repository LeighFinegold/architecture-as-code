// widgets/widget-renderer.ts

import { getWidget } from './widget-registry'; // updated name
import Handlebars from 'handlebars';

export class WidgetRenderer {
    constructor(private handlebars: typeof Handlebars) {}

    render(widgetId: string, context: unknown, options?: Record<string, unknown>): string {
        const widget = getWidget(widgetId);
        if (!widget) throw new Error(`Widget '${widgetId}' not found.`);
        if (!widget.validateContext(context)) {
            throw new Error(`Invalid context for widget '${widgetId}'`);
        }

        const transformed = widget.transformToViewModel
            ? widget.transformToViewModel(context, options)
            : context;

        const template = this.handlebars.compile(`{{> ${widget.id} }}`);
        return template(transformed);
    }
}
