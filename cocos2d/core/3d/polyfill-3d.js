/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
 ****************************************************************************/


const Node = require('../CCNode');
const EventType = Node.EventType;
const DirtyFlag = Node._LocalDirtyFlag;
const math = require('../renderer/render-engine').math;
const RenderFlow = require('../renderer/render-flow');

// ====== Node transform polyfills ======
const ONE_DEGREE = Math.PI / 180;

const POSITION_ON = 1 << 0;
const SCALE_ON = 1 << 1;
const ROTATION_ON = 1 << 2;

let _quat = cc.quat();

function _updateLocalMatrix3d () {
    if (this._localMatDirty) {
        // Update transform
        let t = this._matrix;
        math.mat4.fromTRSArray(t, this._trs);

        // skew
        if (this._skewX || this._skewY) {
            let a = t.m00, b = t.m01, c = t.m04, d = t.m05;
            let skx = Math.tan(this._skewX * ONE_DEGREE);
            let sky = Math.tan(this._skewY * ONE_DEGREE);
            if (skx === Infinity)
                skx = 99999999;
            if (sky === Infinity)
                sky = 99999999;
            t.m00 = a + c * sky;
            t.m01 = b + d * sky;
            t.m04 = c + a * skx;
            t.m05 = d + b * skx;
        }
        this._localMatDirty = 0;
        // Register dirty status of world matrix so that it can be recalculated
        this._worldMatDirty = true;
    }
}

function _calculWorldMatrix3d () {
    // Avoid as much function call as possible
    if (this._localMatDirty) {
        this._updateLocalMatrix();
    }

    if (this._parent) {
        let parentMat = this._parent._worldMatrix;
        math.mat4.mul(this._worldMatrix, parentMat, this._matrix);
    }
    else {
        math.mat4.copy(this._worldMatrix, this._matrix);
    }
    this._worldMatDirty = false;
}


function setPosition (newPosOrX, y, z) {
    let x;
    if (y === undefined) {
        x = newPosOrX.x;
        y = newPosOrX.y;
        z = newPosOrX.z || 0;
    }
    else {
        x = newPosOrX;
        z = z || 0
    }

    let trs = this._trs;
    if (trs[1] === x && trs[2] === y && trs[3] === z) {
        return;
    }

    if (CC_EDITOR) {
        var oldPosition = new cc.Vec3(trs[1], trs[2], trs[3]);
    }

    trs[1] = x;
    trs[2] = y;
    trs[3] = z;
    this.setLocalDirty(DirtyFlag.POSITION);
    this._renderFlag |= RenderFlow.FLAG_WORLD_TRANSFORM;

    // fast check event
    if (this._eventMask & POSITION_ON) {
        if (CC_EDITOR) {
            this.emit(EventType.POSITION_CHANGED, oldPosition);
        }
        else {
            this.emit(EventType.POSITION_CHANGED);
        }
    }
}

function setScale (x, y, z) {
    if (x && typeof x !== 'number') {
        y = x.y;
        z = x.z || 1;
        x = x.x;
    }
    else if (x !== undefined && y === undefined) {
        y = x;
        z = x;
    }
    else if (z === undefined) {
        z = 1;
    }
    let trs = this._trs;
    if (trs[8] !== x || trs[9] !== y || trs[10] !== z) {
        trs[8] = x;
        trs[9] = y;
        trs[10] = z;
        this.setLocalDirty(DirtyFlag.SCALE);
        this._renderFlag |= RenderFlow.FLAG_TRANSFORM;

        if (this._eventMask & SCALE_ON) {
            this.emit(EventType.SCALE_CHANGED);
        }
    }
}

function _update3DFunction () {
    if (this._is3DNode) {
        this._updateLocalMatrix = _updateLocalMatrix3d;
        this._calculWorldMatrix = _calculWorldMatrix3d;
        this._mulMat = cc.vmath.mat4.mul;
    }
    else {
        this._updateLocalMatrix = _updateLocalMatrix2d;
        this._calculWorldMatrix = _calculWorldMatrix2d;
        this._mulMat = _mulMat2d;
    }
    this._renderFlag |= RenderFlow.FLAG_TRANSFORM;
}

function _upgrade_1x_to_2x () {
    if (this._is3DNode) {
        this._update3DFunction();
    }

    _upgrade_1x_to_2x_2d.call(this);
}


let proto = cc.Node.prototype;
const _updateLocalMatrix2d = proto._updateLocalMatrix;
const _calculWorldMatrix2d = proto._calculWorldMatrix;
const _upgrade_1x_to_2x_2d = proto._upgrade_1x_to_2x;
const _mulMat2d = proto._mulMat;
const _onBatchCreated2d = proto._onBatchCreated;

proto.setPosition = setPosition;
proto.setScale = setScale;

proto._upgrade_1x_to_2x = _upgrade_1x_to_2x;
proto._update3DFunction = _update3DFunction;

cc.js.getset(proto, 'position', proto.getPosition, setPosition, false, true);

cc.js.getset(proto, 'is3DNode', function () {
    return this._is3DNode;
}, function (v) {
    if (this._is3DNode === v) return;
    this._is3DNode = v;
    this._update3DFunction();
});

cc.js.getset(proto, 'scaleZ', function () {
    return this._trs[10];
}, function (v) {
    if (this._trs[10] !== value) {
        this._trs[10] = value;
        this.setLocalDirty(DirtyFlag.SCALE);
        this._renderFlag |= RenderFlow.FLAG_TRANSFORM;

        if (this._eventMask & SCALE_ON) {
            this.emit(EventType.SCALE_CHANGED);
        }
    }
});

cc.js.getset(proto, 'z', function () {
    return this._trs[3];
}, function (value) {
    let trs = this._trs;
    if (value !== trs[3]) {
        if (!CC_EDITOR || isFinite(value)) {
            trs[3] = value;
            this.setLocalDirty(DirtyFlag.POSITION);
            this._renderFlag |= RenderFlow.FLAG_WORLD_TRANSFORM;
            // fast check event
            if (this._eventMask & POSITION_ON) {
                this.emit(EventType.POSITION_CHANGED);
            }
        }
        else {
            cc.error(ERR_INVALID_NUMBER, 'new z');
        }
    }
});

cc.js.getset(proto, 'eulerAngles', function () {
    if (CC_EDITOR) {
        return this._eulerAngles;
    }
    else {
        _quat.fromRotation(this._trs);
        return _quat.toEuler(cc.v3());
    }
}, function (v) {
    if (CC_EDITOR) {
        this._eulerAngles.set(v);
    }

    math.quat.fromEuler(_quat, v.x, v.y, v.z);
    _quat.toRotation(this._trs);
    this.setLocalDirty(DirtyFlag.ROTATION);
    this._renderFlag |= RenderFlow.FLAG_TRANSFORM;
});

// This property is used for Mesh Skeleton Animation
// Should be rememoved when node.rotation upgrade to quaternion value
cc.js.getset(proto, 'quat', function () {
    let trs = this._trs;
    return cc.quat(trs[4], trs[5], trs[6], trs[7]);
}, proto.setRotation);
