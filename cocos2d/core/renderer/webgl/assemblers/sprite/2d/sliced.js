/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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

const dynamicAtlasManager = require('../../../../utils/dynamic-atlas/manager');

module.exports = {
    useModel: false,

    createData (sprite) {
        let renderData = sprite.requestRenderData();
        // 0-4 for local verts
        // 5-20 for world verts
        renderData.dataLength = 20;

        renderData.vertexCount = 16;
        renderData.indiceCount = 54;
        return renderData;
    },

    updateRenderData (sprite, batchData) {
        let frame = sprite.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        if (frame) {
            if (!frame._original && dynamicAtlasManager) {
                dynamicAtlasManager.insertSpriteFrame(frame);
            }
            if (sprite._material._texture !== frame._texture) {
                sprite._activateMaterial();
            }
        }

        let renderData = sprite._renderData;
        if (renderData && frame && sprite._vertsDirty) {
            this.updateVerts(sprite);
            this.updateWorldVerts(sprite);
            sprite._vertsDirty = false;
        }
    },

    updateVerts (sprite) {
        let renderData = sprite._renderData,
            verts = renderData.vertices,
            node = sprite.node,
            width = node.width, height = node.height,
            appx = node.anchorX * width, appy = node.anchorY * height;

        let frame = sprite.spriteFrame;
        let leftWidth = frame.insetLeft;
        let rightWidth = frame.insetRight;
        let topHeight = frame.insetTop;
        let bottomHeight = frame.insetBottom;

        let sizableWidth = width - leftWidth - rightWidth;
        let sizableHeight = height - topHeight - bottomHeight;
        let xScale = width / (leftWidth + rightWidth);
        let yScale = height / (topHeight + bottomHeight);
        xScale = (isNaN(xScale) || xScale > 1) ? 1 : xScale;
        yScale = (isNaN(yScale) || yScale > 1) ? 1 : yScale;
        sizableWidth = sizableWidth < 0 ? 0 : sizableWidth;
        sizableHeight = sizableHeight < 0 ? 0 : sizableHeight;
        
        verts[0].x = -appx;
        verts[0].y = -appy;
        verts[1].x = leftWidth * xScale - appx;
        verts[1].y = bottomHeight * yScale - appy;
        verts[2].x = verts[1].x + sizableWidth;
        verts[2].y = verts[1].y + sizableHeight;
        verts[3].x = width - appx;
        verts[3].y = height - appy;
    },

    fillBuffers (sprite, renderer) {
        if (renderer.worldMatDirty) {
            this.updateWorldVerts(sprite);
        }

        let renderData = sprite._renderData,
            node = sprite.node,
            color = node._color._val,
            verts = renderData.vertices;

        let buffer = renderer._meshBuffer,
            vertexCount = renderData.vertexCount;

        let uvSliced = sprite.spriteFrame.uvSliced;
        let offsetInfo = buffer.request(vertexCount, renderData.indiceCount);

        // buffer data may be realloc, need get reference after request.
        let indiceOffset = offsetInfo.indiceOffset,
            vertexOffset = offsetInfo.byteOffset >> 2,
            vertexId = offsetInfo.vertexOffset,
            vbuf = buffer._vData,
            uintbuf = buffer._uintVData,
            ibuf = buffer._iData;

        for (let i = 4; i < 20; ++i) {
            let vert = verts[i];
            let uvs = uvSliced[i - 4];

            vbuf[vertexOffset++] = vert.x;
            vbuf[vertexOffset++] = vert.y;
            vbuf[vertexOffset++] = uvs.u;
            vbuf[vertexOffset++] = uvs.v;
            uintbuf[vertexOffset++] = color;
        }

        for (let r = 0; r < 3; ++r) {
            for (let c = 0; c < 3; ++c) {
                let start = vertexId + r * 4 + c;
                ibuf[indiceOffset++] = start;
                ibuf[indiceOffset++] = start + 1;
                ibuf[indiceOffset++] = start + 4;
                ibuf[indiceOffset++] = start + 1;
                ibuf[indiceOffset++] = start + 5;
                ibuf[indiceOffset++] = start + 4;
            }
        }
    },

    updateWorldVerts (sprite) {
        let node = sprite.node,
            verts = sprite._renderData.vertices;
        
        let matrix = node._worldMatrix,
            a = matrix.m00, b = matrix.m01, c = matrix.m04, d = matrix.m05,
            tx = matrix.m12, ty = matrix.m13;
        for (let row = 0; row < 4; ++row) {
            let rowD = verts[row];
            for (let col = 0; col < 4; ++col) {
                let colD = verts[col];
                let world = verts[4 + row * 4 + col];
                world.x = colD.x * a + rowD.y * c + tx;
                world.y = colD.x * b + rowD.y * d + ty;
            }
        }
    },
};
