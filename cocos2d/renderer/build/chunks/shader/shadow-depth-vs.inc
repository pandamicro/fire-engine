// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

attribute vec3 a_position;

uniform mat4 cc_matWorld;
uniform mat4 cc_lightViewProjMatrix;
uniform float cc_minDepth;
uniform float cc_maxDepth;
uniform float cc_bias;
varying float vDepth;

#include <skinning>

vec4 vert() {
  vec4 position = vec4(a_position, 1);

  SKIN_VERTEX(position);

  // compute vDepth according to active camera's minDepth and maxDepth.
  vDepth = ((gl_Position.z + cc_minDepth) / (cc_minDepth + cc_maxDepth)) + cc_bias;
  return cc_lightViewProjMatrix * cc_matWorld * position;
}
