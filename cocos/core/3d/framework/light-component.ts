/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category component/light
 */

import { Component } from '../../components/component';
import { ccclass, property, tooltip, range, slide, type } from '../../data/class-decorator';
import { Color } from '../../math';
import { Enum } from '../../value-types';

import { scene } from '../../renderer';
import { Root } from '../../root';
import { legacyCC } from '../../global-exports';

export const PhotometricTerm = Enum({
    LUMINOUS_POWER: 0,
    LUMINANCE: 1,
});

/**
 * @en static light settings.
 * @zh 静态灯光设置
 */
@ccclass('cc.StaticLightSettings')
class StaticLightSettings {
    @property
    protected _editorOnly: boolean = false;
    @property
    protected _bakeable: boolean = false;
    @property
    protected _castShadow: boolean = false;

    /**
     * @en editor only.
     * @zh 是否只在编辑器里生效。
     */
    @property
    get editorOnly () {
        return this._editorOnly;
    }
    set editorOnly (val) {
       this._editorOnly = val;
    }

    /**
     * @en bakeable.
     * @zh 是否可烘培。
     */
    @property
    get bakeable () {
        return this._bakeable;
    }

    set bakeable (val) {
        this._bakeable = val;
    }

    /**
     * @en cast shadow.
     * @zh 是否投射阴影。
     */
    @property
    get castShadow () {
        return this._castShadow;
    }

    set castShadow (val) {
        this._castShadow = val;
    }
}

// tslint:disable: no-shadowed-variable
export declare namespace Light {
    export type Type = EnumAlias<typeof scene.LightType>;
    export type PhotometricTerm = EnumAlias<typeof PhotometricTerm>;
}
// tslint:enable: no-shadowed-variable

@ccclass('cc.Light')
export class Light extends Component {
    public static Type = scene.LightType;
    public static PhotometricTerm = PhotometricTerm;

    @property
    protected _color = Color.WHITE.clone();
    @property
    protected _useColorTemperature = false;
    @property
    protected _colorTemperature = 6550;
    @property
    protected _staticSettings: StaticLightSettings = new StaticLightSettings();

    protected _type = scene.LightType.UNKNOWN;
    protected _lightType: typeof scene.Light;
    protected _light: scene.Light | null = null;

    /**
     * @en
     * Color of the light.
     * @zh
     * 光源颜色。
     */
    @tooltip('i18n:lights.color')
    // @constget
    get color (): Readonly<Color> {
        return this._color;
    }
    set color (val) {
        this._color = val;
        if (this._light) {
            this._light.color.x = val.r / 255.0;
            this._light.color.y = val.g / 255.0;
            this._light.color.z = val.b / 255.0;
        }
    }

    /**
     * @en
     * Whether to enable light color temperature.
     * @zh
     * 是否启用光源色温。
     */
    @tooltip('i18n:lights.use_color_temperature')
    get useColorTemperature () {
        return this._useColorTemperature;
    }
    set useColorTemperature (enable) {
        this._useColorTemperature = enable;
        if (this._light) { this._light.useColorTemperature = enable; }
    }

    /**
     * @en
     * The light color temperature.
     * @zh
     * 光源色温。
     */
    @slide(true)
    @range([1000, 15000, 1])
    @tooltip('i18n:lights.color_temperature')
    get colorTemperature () {
        return this._colorTemperature;
    }

    set colorTemperature (val) {
        this._colorTemperature = val;
        if (this._light) { this._light.colorTemperature = val; }
    }

    /**
     * @en
     * static light settings.
     * @zh
     * 静态灯光设置。
     */
    @type(StaticLightSettings)
    get staticSettings () {
        return this._staticSettings;
    }

    set staticSettings (val) {
        this._staticSettings = val;
    }

    /**
     * @en
     * The light type.
     * @zh
     * 光源类型。
     */
    get type () {
        return this._type;
    }

    constructor () {
        super();
        this._lightType = scene.Light;
    }

    public onLoad (){
        this._createLight();
    }

    public onEnable () {
        this._attachToScene();
    }

    public onDisable () {
        this._detachFromScene();
    }

    public onDestroy () {
        this._destroyLight();
    }

    protected _createLight () {
        if (!this._light) {
            this._light = (legacyCC.director.root as Root).createLight(this._lightType);
        }
        this.color = this._color;
        this.useColorTemperature = this._useColorTemperature;
        this.colorTemperature = this._colorTemperature;
        this._light.node = this.node;
    }

    protected _destroyLight () {
        if (this._light) {
            legacyCC.director.root.destroyLight(this);
            this._light = null;
        }
    }

    protected _attachToScene () {
        this._detachFromScene();
        if (this._light && !this._light.scene && this.node.scene) {
            const renderScene = this._getRenderScene();
            switch (this._type) {
                case scene.LightType.DIRECTIONAL:
                    renderScene.addDirectionalLight(this._light as scene.DirectionalLight);
                    renderScene.setMainLight(this._light as scene.DirectionalLight);
                    break;
                case scene.LightType.SPHERE:
                    renderScene.addSphereLight(this._light as scene.SphereLight);
                    break;
                case scene.LightType.SPOT:
                    renderScene.addSpotLight(this._light as scene.SpotLight);
                    break;
            }
        }
    }

    protected _detachFromScene () {
        if (this._light && this._light.scene) {
            const renderScene = this._light.scene;
            switch (this._type) {
                case scene.LightType.DIRECTIONAL:
                    renderScene.removeDirectionalLight(this._light as scene.DirectionalLight);
                    renderScene.unsetMainLight(this._light as scene.DirectionalLight);
                    break;
                case scene.LightType.SPHERE:
                    renderScene.removeSphereLight(this._light as scene.SphereLight);
                    break;
                case scene.LightType.SPOT:
                    renderScene.removeSpotLight(this._light as scene.SpotLight);
                    break;
            }
        }
    }
}

export { Light as LightComponent };
