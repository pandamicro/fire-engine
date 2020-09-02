/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category ui
 */

import { RenderableComponent } from '../../core/3d/framework/renderable-component';
import { UIComponent } from '../../core/components/ui-base/ui-component';
import { ccclass, help, executionOrder, menu } from '../../core/data/class-decorator';
import { director } from '../../core/director';
import { RenderPriority } from '../../core/pipeline/define';
import { UI } from '../../core/renderer/ui/ui';
import { scene } from '../../core/renderer';
import { legacyCC } from '../../core/global-exports';

/**
 * @en
 * The component of model.
 * When you place particles or models in the UI, you must add this component to render.
 * The component must be placed on a node with the [[Model]] or the [[Particle]].
 *
 * @zh
 * UI 模型基础组件。
 * 当你在 UI 中放置模型或者粒子的时候，必须添加该组件才能渲染。该组件必须放置在带有 [[Model]] 或者 [[Particle]] 组件的节点上。
 */
@ccclass('cc.UIModel')
@help('i18n:cc.UIModel')
@executionOrder(110)
@menu('UI/Model')
export class UIModel extends UIComponent {

    private _models: scene.Model[] | null = null;

    public get modelComponent () {
        return this._modelComponent;
    }

    private _modelComponent: RenderableComponent | null = null;

    public onLoad () {
        if(!this.node._uiProps.uiTransformComp){
            this.node.addComponent('cc.UITransform');
        }

        this._modelComponent = this.getComponent('cc.RenderableComponent') as RenderableComponent;
        if (!this._modelComponent) {
            console.warn(`node '${this.node && this.node.name}' doesn't have any renderable component`);
            return;
        }

        this._modelComponent._sceneGetter = director.root!.ui.getRenderSceneGetter();
        this._models = this._modelComponent._collectModels();
    }

    public onEnable () {
        super.onEnable();
        if (this._modelComponent) {
            (this._modelComponent as any)._attachToScene();
        }
    }

    public onDisable () {
        super.onDisable();
        if (this._modelComponent) {
            (this._modelComponent as any)._detachFromScene();
        }
    }

    public onDestroy () {
        super.onDestroy();
        this._modelComponent = this.getComponent('cc.RenderableComponent') as RenderableComponent;
        if (!this._modelComponent) {
            return;
        }

        this._modelComponent._sceneGetter = null;
        if (legacyCC.isValid(this._modelComponent, true)) {
            (this._modelComponent as any)._attachToScene();
        }
        this._models = null;
    }

    public updateAssembler (render: UI) {
        if (this._models) {
            for(const m of this._models){
                render.commitModel.call(render, this, m, this._modelComponent!.material);
            }
            return true;
        }

        return false;
    }

    public update () {
        this._fitUIRenderQueue();
    }

    private _fitUIRenderQueue () {
        if (!this._modelComponent) {
            return;
        }
        const matNum = this._modelComponent.sharedMaterials.length;
        for (let i = 0; i < matNum; i++) {
            const material = this._modelComponent.getMaterialInstance(i);
            if (material == null) {
                continue;
            }
            const passes = material.passes;
            const passNum = passes.length;
            for (let j = 0; j < passNum; j++) {
                const pass = passes[j];
                // @ts-ignore
                pass._priority = RenderPriority.MAX - 11;
                if (!pass.blendState.targets[0].blend) {
                    material.overridePipelineStates({ blendState: { targets: [ { blend: true } ] } }, j);
                }
            }
        }
    }
}

legacyCC.UIModel = UIModel;

export { UIModel as UIModelComponent };
