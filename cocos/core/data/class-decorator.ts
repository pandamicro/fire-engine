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
 * @category core/_decorator
 * @en Some TypeScript decorators for class and data definition
 * @zh 一些用来定义类和数据的 TypeScript 装饰器
 */

// const FIX_BABEL6 = true;

// tslint:disable:only-arrow-functions
// tslint:disable:prefer-for-of
// tslint:disable:no-shadowed-variable
// tslint:disable:max-line-length
// tslint:disable:no-empty-interface

// inspired by @toddlxt (https://github.com/toddlxt/Creator-TypeScript-Boilerplate)

import * as js from '../utils/js';
import './class';
import { IExposedAttributes } from './utils/attribute-defines';
import { doValidateMethodWithProps_DEV, getFullFormOfProperty } from './utils/preprocess-class';
import { CCString, CCInteger, CCFloat, CCBoolean, PrimitiveType } from './utils/attribute';
import { error, errorID, warnID } from '../platform/debug';
import { DEV } from 'internal:constants';
import { legacyCC } from '../global-exports';
import { Component } from '../components/component';

// caches for class construction
const CACHE_KEY = '__ccclassCache__';

function fNOP (ctor) {
    return ctor;
}

function getSubDict (obj, key) {
    return obj[key] || (obj[key] = {});
}

function checkCtorArgument (decorate) {
    return function (target) {
        if (typeof target === 'function') {
            // no parameter, target is ctor
            return decorate(target);
        }
        return function (ctor) {
            return decorate(ctor, target);
        };
    };
}

function _checkNormalArgument (validator_DEV, decorate, decoratorName) {
    return function (target) {
        if (DEV && validator_DEV(target, decoratorName) === false) {
            return function () {
                return fNOP;
            };
        }
        return function (ctor) {
            return decorate(ctor, target);
        };
    };
}

const checkCompArgument = _checkNormalArgument.bind(null, DEV && function (arg, decoratorName) {
    if (!legacyCC.Class._isCCClass(arg)) {
        error('The parameter for %s is missing.', decoratorName);
        return false;
    }
});

function _argumentChecker (type) {
    return _checkNormalArgument.bind(null, DEV && function (arg, decoratorName) {
        if (arg instanceof legacyCC.Component || arg === undefined) {
            error('The parameter for %s is missing.', decoratorName);
            return false;
        }
        else if (typeof arg !== type) {
            error('The parameter for %s must be type %s.', decoratorName, type);
            return false;
        }
    });
}
const checkStringArgument = _argumentChecker('string');
const checkNumberArgument = _argumentChecker('number');
// var checkBooleanArgument = _argumentChecker('boolean');

function getClassCache (ctor, decoratorName?) {
    if (DEV && legacyCC.Class._isCCClass(ctor)) {
        error('`@%s` should be used after @ccclass for class "%s"', decoratorName, js.getClassName(ctor));
        return null;
    }
    return getSubDict(ctor, CACHE_KEY);
}

function getDefaultFromInitializer (initializer) {
    let value;
    try {
        value = initializer();
    }
    catch (e) {
        // just lazy initialize by CCClass
        return initializer;
    }
    if (typeof value !== 'object' || value === null) {
        // string boolean number function undefined null
        return value;
    }
    else {
        // The default attribute will not be used in ES6 constructor actually,
        // so we dont need to simplify into `{}` or `[]` or vec2 completely.
        return initializer;
    }
}

function extractActualDefaultValues (ctor) {
    let dummyObj;
    try {
        dummyObj = new ctor();
    }
    catch (e) {
        if (DEV) {
            warnID(3652, js.getClassName(ctor), e);
        }
        return {};
    }
    return dummyObj;
}

function genProperty (ctor, properties, propName, options, desc, cache) {
    let fullOptions;
    if (options) {
        fullOptions = DEV ? getFullFormOfProperty(options, propName, js.getClassName(ctor)) :
            getFullFormOfProperty(options);
        fullOptions = fullOptions || options;
    }
    const existsProperty = properties[propName];
    const prop = js.mixin(existsProperty || {}, fullOptions || {});

    const isGetset = desc && (desc.get || desc.set);
    if (isGetset) {
        // typescript or babel
        if (DEV && options && (options.get || options.set)) {
            const errorProps = getSubDict(cache, 'errorProps');
            if (!errorProps[propName]) {
                errorProps[propName] = true;
                warnID(3655, propName, js.getClassName(ctor), propName, propName);
            }
        }
        if (desc.get) {
            prop.get = desc.get;
        }
        if (desc.set) {
            prop.set = desc.set;
        }
    }
    else {
        if (DEV && (prop.get || prop.set)) {
            // @property({
            //     get () { ... },
            //     set (...) { ... },
            // })
            // value;
            errorID(3655, propName, js.getClassName(ctor), propName, propName);
            return;
        }
        // member variables
        let defaultValue;
        let isDefaultValueSpecified = false;
        if (desc) {
            // babel
            if (desc.initializer) {
                // @property(...)
                // value = null;
                defaultValue = getDefaultFromInitializer(desc.initializer);
                isDefaultValueSpecified = true;
            }
            else {
                // @property(...)
                // value;
            }
        }
        else {
            // typescript
            const actualDefaultValues = cache.default || (cache.default = extractActualDefaultValues(ctor));
            if (actualDefaultValues.hasOwnProperty(propName)) {
                // @property(...)
                // value = null;
                defaultValue = actualDefaultValues[propName];
                isDefaultValueSpecified = true;
            }
            else {
                // @property(...)
                // value;
            }
        }

        if (DEV) {
            if (options && options.hasOwnProperty('default')) {
                warnID(3653, propName, js.getClassName(ctor));
                // prop.default = options.default;
            }
            else if (!isDefaultValueSpecified) {
                warnID(3654, js.getClassName(ctor), propName);
                // prop.default = fullOptions.hasOwnProperty('default') ? fullOptions.default : undefined;
            }
        }
        prop.default = defaultValue;
    }

    properties[propName] = prop;
}

/**
 * @en Declare a standard ES6 or TS Class as a CCClass, please refer to the [document](https://docs.cocos.com/creator3d/manual/zh/scripting/ccclass.html)
 * @zh 将标准写法的 ES6 或者 TS Class 声明为 CCClass，具体用法请参阅[类型定义](https://docs.cocos.com/creator3d/manual/zh/scripting/ccclass.html)。
 * @param name - The class name used for serialization.
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass} = _decorator;
 *
 * // define a CCClass, omit the name
 *  @ccclass
 * class NewScript extends Component {
 *     // ...
 * }
 *
 * // define a CCClass with a name
 *  @ccclass('LoginData')
 * class LoginData {
 *     // ...
 * }
 * ```
 */
export const ccclass: any | ((name?: string) => Function) = checkCtorArgument(function (ctor, name) {
    // if (FIX_BABEL6) {
    //     eval('if(typeof _classCallCheck==="function"){_classCallCheck=function(){};}');
    // }
    let base = js.getSuper(ctor);
    if (base === Object) {
        base = null;
    }

    const proto = {
        name,
        extends: base,
        ctor,
        __ES6__: true,
    };
    const cache = ctor[CACHE_KEY];
    if (cache) {
        const decoratedProto = cache.proto;
        if (decoratedProto) {
            // decoratedProto.properties = createProperties(ctor, decoratedProto.properties);
            js.mixin(proto, decoratedProto);
        }
        ctor[CACHE_KEY] = undefined;
    }

    const res = legacyCC.Class(proto);

    // validate methods
    if (DEV) {
        const propNames = Object.getOwnPropertyNames(ctor.prototype);
        for (let i = 0; i < propNames.length; ++i) {
            const prop = propNames[i];
            if (prop !== 'constructor') {
                const desc = Object.getOwnPropertyDescriptor(ctor.prototype, prop);
                const func = desc && desc.value;
                if (typeof func === 'function') {
                    doValidateMethodWithProps_DEV(func, prop, js.getClassName(ctor), ctor, base);
                }
            }
        }
    }

    return res;
});

export type SimplePropertyType = Function | string | typeof CCString | typeof CCInteger | typeof CCFloat | typeof CCBoolean;

export type PropertyType = SimplePropertyType | SimplePropertyType[];

/**
 * @zh CCClass 属性选项。
 * @en CCClass property options
 */
export interface IPropertyOptions extends IExposedAttributes {
}

/**
 * @en Declare as a CCClass property with options
 * @zh 声明属性为 CCClass 属性。
 * @param options property options
 */
export function property (options?: IPropertyOptions): PropertyDecorator;

/**
 * @en Declare as a CCClass property with the property type
 * @zh 标注属性为 cc 属性。<br/>
 * 等价于`@property({type})`。
 * @param type A {{ccclass}} type or a {{ValueType}}
 */
export function property (type: PropertyType): PropertyDecorator;

/**
 * @en Declare as a CCClass property
 * @zh 标注属性为 cc 属性。<br/>
 * 等价于`@property()`。
 */
export function property (target: Object, propertyKey: string | symbol): void;

export function property (ctorProtoOrOptions?, propName?, desc?) {
    let options = null;
    function normalized (ctorProto, propName, desc) {
        const cache = getClassCache(ctorProto.constructor);
        if (cache) {
            const ccclassProto = getSubDict(cache, 'proto');
            const properties = getSubDict(ccclassProto, 'properties');
            genProperty(ctorProto.constructor, properties, propName, options, desc, cache);
        }
    }
    if (ctorProtoOrOptions === undefined) {
        // @property(undefined)
        return property({
            type: undefined,
        });
    }
    if (typeof propName === 'undefined') {
        options = ctorProtoOrOptions;
        return normalized;
    }
    else {
        normalized(ctorProtoOrOptions, propName, desc);
    }
}

// Editor Decorators

/**
 * A class decorator which does nothing.
 */
const emptyClassDecorator: ClassDecorator | PropertyDecorator = () => {};

/**
 * Ignoring all arguments and return the `emptyClassDecorator`.
 */
const ignoringArgsClassDecorator = () => emptyClassDecorator;

const ignoringArgsPropertyDecorator = () => emptyClassDecorator as PropertyDecorator;

function createEditorDecorator (argCheckFunc, editorPropName, staticValue?) {
    return argCheckFunc(function (ctor, decoratedValue) {
        const cache = getClassCache(ctor, editorPropName);
        if (cache) {
            const value = (staticValue !== undefined) ? staticValue : decoratedValue;
            const proto = getSubDict(cache, 'proto');
            getSubDict(proto, 'editor')[editorPropName] = value;
        }
    }, editorPropName);
}

function createDummyDecorator (argCheckFunc) {
    return argCheckFunc(fNOP);
}

/**
 * @en Makes a CCClass that inherit from component execute in edit mode.<br/>
 * By default, all components are only executed in play mode,<br/>
 * which means they will not have their callback functions executed while the Editor is in edit mode.<br/>
 * @zh 允许继承自 Component 的 CCClass 在编辑器里执行。<br/>
 * 默认情况下，所有 Component 都只会在运行时才会执行，也就是说它们的生命周期回调不会在编辑器里触发。
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, executeInEditMode} = _decorator;
 *
 *  @ccclass
 *  @executeInEditMode
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const executeInEditMode = (DEV ? createEditorDecorator : createDummyDecorator)(checkCtorArgument, 'executeInEditMode', true);

/**
 * @en Declare that the current component relies on another type of component. 
 * If the required component doesn't exist, the engine will create a new empty instance of the required component and add to the node.
 * @zh 为声明为 CCClass 的组件添加依赖的其它组件。当组件添加到节点上时，如果依赖的组件不存在，引擎将会自动将依赖组件添加到同一个节点，防止脚本出错。该设置在运行时同样有效。
 * @param requiredComponent The required component type
 * @example
 * ```ts
 * import {_decorator, Sprite, Component} from cc;
 * import {ccclass, requireComponent} from _decorator;
 *
 * @ccclass
 * @requireComponent(Sprite)
 * class SpriteCtrl extends Component {
 *     // ...
 * }
 * ```
 */
export const requireComponent: (requiredComponent: Function) => Function = createEditorDecorator(checkCompArgument, 'requireComponent');

/**
 * @en Add the current component to the specific menu path in `Add Component` selector of the inspector panel
 * @zh 将当前组件添加到组件菜单中，方便用户查找。例如 "Rendering/CameraCtrl"。
 * @param path - The path is the menu represented like a pathname. For example the menu could be "Rendering/CameraCtrl".
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, menu} = _decorator;
 *
 * @ccclass
 * @menu("Rendering/CameraCtrl")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const menu: (path: string) => ClassDecorator = DEV ? createEditorDecorator(checkStringArgument, 'menu') : ignoringArgsClassDecorator;

/**
 * @en Set the component priority, it decides at which order the life cycle functions of components will be invoked. Smaller priority get invoked before larger priority.
 * This will affect `onLoad`, `onEnable`, `start`, `update` and `lateUpdate`, but `onDisable` and `onDestroy` won't be affected.
 * @zh 设置脚本生命周期方法调用的优先级。优先级小于 0 的组件将会优先执行，优先级大于 0 的组件将会延后执行。优先级仅会影响 onLoad, onEnable, start, update 和 lateUpdate，而 onDisable 和 onDestroy 不受影响。
 * @param priority - The execution order of life cycle methods for Component. Smaller priority get invoked before larger priority.
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, executionOrder} = _decorator;
 *
 * @ccclass
 * @executionOrder(1)
 * class CameraCtrl extends Component {
 *     // ...
 * }
 * ```
 */
export const executionOrder: (priority: number) => ClassDecorator = createEditorDecorator(checkNumberArgument, 'executionOrder');

/**
 * @en Forbid add multiple instances of the component to the same node.
 * @zh 防止多个相同类型（或子类型）的组件被添加到同一个节点。
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, disallowMultiple} = _decorator;
 *
 * @ccclass
 * @disallowMultiple
 * class CameraCtrl extends Component {
 *     // ...
 * }
 * ```
 */
export const disallowMultiple = (DEV ? createEditorDecorator : createDummyDecorator)(checkCtorArgument, 'disallowMultiple');

/**
 * @en When {{executeInEditMode}} is set, this decorator will decide when a node with the component is on focus whether the editor should running in high FPS mode.
 * @zh 当指定了 "executeInEditMode" 以后，playOnFocus 可以在选中当前组件所在的节点时，提高编辑器的场景刷新频率到 60 FPS，否则场景就只会在必要的时候进行重绘。
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, playOnFocus, executeInEditMode} = _decorator;
 *
 * @ccclass
 * @executeInEditMode
 * @playOnFocus
 * class CameraCtrl extends Component {
 *     // ...
 * }
 * ```
 */
export const playOnFocus = (DEV ? createEditorDecorator : createDummyDecorator)(checkCtorArgument, 'playOnFocus');

/**
 * @en Use a customized inspector page in the **inspector**
 * @zh 自定义当前组件在 **属性检查器** 中渲染时所用的 UI 页面描述。
 * @param url The url of the page definition in js
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, inspector} = _decorator;
 *
 * @ccclass
 * @inspector("packages://inspector/inspectors/comps/camera-ctrl.js")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const inspector: (url: string) => ClassDecorator = DEV ? createEditorDecorator(checkStringArgument, 'inspector') : ignoringArgsClassDecorator;

/**
 * @en Define the icon of the component.
 * @zh 自定义当前组件在编辑器中显示的图标 url。
 * @param url
 * @private
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, icon} = _decorator;
 *
 *  @ccclass
 *  @icon("xxxx.png")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const icon: (url: string) => ClassDecorator = DEV ? createEditorDecorator(checkStringArgument, 'icon') : ignoringArgsClassDecorator;

/**
 * @en Define the help documentation url, if given, the component section in the **inspector** will have a help documentation icon reference to the web page given. 
 * @zh 指定当前组件的帮助文档的 url，设置过后，在 **属性检查器** 中就会出现一个帮助图标，用户点击将打开指定的网页。
 * @param url The url of the help documentation
 * @example
 * ```ts
 * import { _decorator, Component } from 'cc';
 * const {ccclass, help} = _decorator;
 *
 * @ccclass
 * @help("app://docs/html/components/spine.html")
 * class NewScript extends Component {
 *     // ...
 * }
 * ```
 */
export const help: (url: string) => ClassDecorator = DEV ? createEditorDecorator(checkStringArgument, 'help') : ignoringArgsClassDecorator;

// Other Decorators

/**
 * @en Declare the property as integer
 * @zh 将该属性标记为整数。
 */
export const integer = type(CCInteger);

/**
 * @en Declare the property as float
 * @zh 将该属性标记为浮点数。
 */
export const float = type(CCFloat);

/**
 * @en Declare the property as boolean
 * @zh 将该属性标记为布尔值。
 */
export const boolean = type(CCBoolean);

/**
 * @en Declare the property as string
 * @zh 将该属性标记为字符串。
 */
export const string = type(CCString);

/**
 * @en Declare the property as the given type
 * @zh 标记该属性的类型。
 * @param type
 */
export function type (type: Function | any): PropertyDecorator;

export function type (type: [Function]): PropertyDecorator;

export function type<T> (type: PrimitiveType<T>): PropertyDecorator;

export function type<T> (type: [PrimitiveType<T>]): PropertyDecorator;

export function type<T> (type: PrimitiveType<T> | Function | [PrimitiveType<T>] | [Function]): PropertyDecorator {
    return property({
        type,
    });
}

export function serializable (value: boolean): PropertyDecorator {
    return property({
        serializable: value,
    });
}

export function formerlySerializedAs (name: string): PropertyDecorator {
    return property({
        formerlySerializedAs: name,
    });
}

export function override (value: boolean): PropertyDecorator {
    return property({
        override: value,
    });
}

export function readOnly (value: boolean): PropertyDecorator {
    return property({
        readonly: value,
    });
}

/**
 * 
 * @param value 
 */
export function animatable (value: boolean): PropertyDecorator {
    return property({
        animatable: value,
    });
}

/**
 * @en
 * Sets whether the property is editor only.
 * @zh
 * 设置该属性是否仅在编辑器中生效。
 * @param yes 是否仅在编辑器中生效。
 */
export function editorOnly (yes: boolean): PropertyDecorator {
    return property({
        editorOnly: yes,
    });
}

/**
 * @en
 * Sets whether the property is visible in editor.
 * @zh
 * 设置是否在编辑器中展示该属性。
 * @param text 工具提示。
 */
export const visible: (yes: boolean | (() => boolean)) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (yes) => {
        return property({
            visible: yes,
        });
    };

/**
 * @en
 * Sets the display name of the property in editor.
 * @zh
 * 设置该属性在编辑器中的显示名称。
 * @param text 显示名称。
 */
export const displayName: (text: string) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (text) => {
        return property({
            displayName: text,
        });
    };

/**
 * @en
 * Sets the tooltip content of the property in editor.
 * @zh
 * 设置该属性在编辑器中的工具提示内容。
 * @param text 工具提示。
 */
export const tooltip: (text: string) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (text) => {
        return property({
            tooltip: text,
        });
    };

/**
 * @en
 * Sets the allowed range of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许设置的范围。
 * @param values 范围。
 */
export const range: (values: [number, number, number] | [number, number]) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (values) => {
        return property({
            range: values,
        });
    };

/**
 * @en
 * Sets the allowed min value of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许的最小值。
 * @param value 最小值。
 */
export const rangeMin: (value: number) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (value) => {
        return property({
            min: value,
        });
    };

/**
 * @en
 * Sets the allowed max value of the property in editor.
 * @zh
 * 设置该属性在编辑器中允许的最大值。
 * @param value 最大值。
 */
export const rangeMax: (value: number) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (value) => {
        return property({
            max: value,
        });
    };

/**
 * @en
 * Sets the step of the property in editor.
 * @zh
 * 设置该属性在编辑器中的步进值。
 * @param value 步进值。
 */
export const rangeStep: (value: number) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (value) => {
        return property({
            step: value,
        });
    };

/**
 * @en
 * Sets whether a slider should be given to coordinate the property in editor.
 * @zh
 * 设置是否在编辑器中提供滑动条来调节值
 * @param enabled 是否允许。
 */
export const slide: (enabled: boolean) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (enabled) => {
        return property({
            slide: enabled,
        });
    };

/**
 * @en
 * Sets the display order of the property in editor.
 * @zh
 * 设置该属性在编辑器中的显示顺序。
 * @param order 显示顺序。
 */
export const displayOrder: (order: number) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (order) => {
        return property({
            displayOrder: order,
        });
    };

/**
 * @en
 * Sets the unit of the property in editor.
 * @zh
 * 设置该属性在编辑器中的计量单位。
 * @param name 计量单位的名称。
 */
export const unit: (name:
| 'lm'
| 'lx'
| 'cd/m²'
) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (name) => {
        return property({
            unit: name,
        });
    };

/**
 * @en
 * Sets whether to convert the value into radian before feed it to the property in editor.
 * @zh
 * 设置是否在赋值该属性前将值先转换为弧度制。
 * @param enabled 是否进行转换。
 */
export const radian: (enabled: boolean) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (enabled) => {
        return property({
            radian: enabled,
        });
    };

/**
 * @en
 * Sets whether to enable multi-line display of the property in editor.
 * @zh
 * 设置是否允许在编辑器中对该属性进行多行显示。
 * @param enabled 是否允许多行显示。
 */
export const multiline: (enabled: boolean) => PropertyDecorator = !DEV ? ignoringArgsPropertyDecorator:
    (enabled) => {
        return property({
            multiline: enabled,
        });
    };
