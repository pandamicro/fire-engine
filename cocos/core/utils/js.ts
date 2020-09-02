/*
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011-2012 cocos2d-x.org
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

import * as jsarray from './array';
import IDGenerator from './id-generator';
import {
    _getClassById,
    _getClassId,
    _setClassId,
    setClassAlias,
    addon,
    clear,
    createMap,
    extend,
    formatStr,
    get,
    getClassByName,
    getClassName,
    getPropertyDescriptor,
    getset,
    getSuper,
    isChildClassOf,
    isNumber,
    isString,
    mixin,
    obsolete,
    obsoletes,
    set,
    setClassName,
    shiftArguments,
    unregisterClass,
    value,
} from './js-typed';
import Pool from './pool';

import {
    _idToClass,
    _nameToClass,
} from './js-typed';
import { EDITOR } from 'internal:constants';
import { legacyCC } from '../global-exports';

export * from './js-typed';
export {default as IDGenerator} from './id-generator';
export {default as Pool} from './pool';
export const array = jsarray;

export const js = {    
    IDGenerator,
    Pool,
    array: jsarray,
    isNumber,
    isString,
    getPropertyDescriptor,
    addon,
    mixin,
    extend,
    getSuper,
    isChildClassOf,
    clear,
    value,
    getset,
    get,
    set,
    unregisterClass,
    getClassName,
    setClassName,
    getClassByName,
    setClassAlias,
    _getClassId,
    _setClassId,
    _getClassById,
    obsolete,
    obsoletes,
    formatStr,
    shiftArguments,
    createMap,
};

/**
 * This module provides some JavaScript utilities.
 * All members can be accessed with "cc.js".
 */
legacyCC.js = js;

if (EDITOR) {
    legacyCC.js.getset(legacyCC.js, '_registeredClassIds', () => {
            const dump = {};
            for (const id in _idToClass) {
                if (!(id in _idToClass)) {
                    continue;
                }
                dump[id] = _idToClass[id];
            }
            return dump;
        },
        (item) => {
            clear(_idToClass);
            for (const id in item) {
                if (!(id in item)) {
                    continue;
                }
                _idToClass[id] = item[id];
            }
        },
    );
    legacyCC.js.getset(legacyCC.js, '_registeredClassNames',
        () => {
            const dump = {};
            for (const id in _nameToClass) {
                if (!(id in _nameToClass)) {
                    continue;
                }
                dump[id] = _nameToClass[id];
            }
            return dump;
        },
        (item) => {
            clear(_nameToClass);
            for (const id in item) {
                if (!(id in item)) {
                    continue;
                }
                _nameToClass[id] = item[id];
            }
        },
    );
}
