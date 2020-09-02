import { UIRenderable } from '../core/components/ui-base/ui-render-component';
import { warnID } from '../core';

export class RenderComponent extends UIRenderable {
    constructor () {
        super();
        warnID(5400, 'RenderComponent', 'UIRenderable');
    }
}
