/**
 * Math3D.js - Small vector and matrix helpers for browser-script WebGL.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};

    function vec3(x = 0, y = 0, z = 0) {
        return { x, y, z };
    }

    function add(a, b) {
        return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    function sub(a, b) {
        return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    function scale(v, s) {
        return vec3(v.x * s, v.y * s, v.z * s);
    }

    function dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    function cross(a, b) {
        return vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    function length(v) {
        return Math.hypot(v.x, v.y, v.z);
    }

    function normalize(v) {
        const len = length(v);
        if (len < 0.000001) return vec3(0, 0, 0);
        return scale(v, 1 / len);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpVec(a, b, t) {
        return vec3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function smoothstep(edge0, edge1, value) {
        const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function headingVector(heading, pitch = 0) {
        const cp = Math.cos(pitch);
        return normalize(vec3(Math.sin(heading) * cp, Math.sin(pitch), -Math.cos(heading) * cp));
    }

    function rightVector(heading) {
        return normalize(vec3(Math.cos(heading), 0, Math.sin(heading)));
    }

    function perspective(fovRadians, aspect, near, far) {
        const f = 1 / Math.tan(fovRadians / 2);
        const nf = 1 / (near - far);
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];
    }

    function lookAt(eye, target, up) {
        const zAxis = normalize(sub(eye, target));
        const xAxis = normalize(cross(up, zAxis));
        const yAxis = cross(zAxis, xAxis);

        return [
            xAxis.x, yAxis.x, zAxis.x, 0,
            xAxis.y, yAxis.y, zAxis.y, 0,
            xAxis.z, yAxis.z, zAxis.z, 0,
            -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
        ];
    }

    function multiplyMat4(a, b) {
        const out = new Array(16);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                out[col * 4 + row] =
                    a[0 * 4 + row] * b[col * 4 + 0] +
                    a[1 * 4 + row] * b[col * 4 + 1] +
                    a[2 * 4 + row] * b[col * 4 + 2] +
                    a[3 * 4 + row] * b[col * 4 + 3];
            }
        }
        return out;
    }

    function createRandom(seed) {
        let state = seed >>> 0;
        return function random() {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    SkySquirrel.Math3D = {
        vec3,
        add,
        sub,
        scale,
        dot,
        cross,
        length,
        normalize,
        lerp,
        lerpVec,
        clamp,
        smoothstep,
        headingVector,
        rightVector,
        perspective,
        lookAt,
        multiplyMat4,
        createRandom
    };
}());
