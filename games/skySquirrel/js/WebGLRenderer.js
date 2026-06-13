/**
 * WebGLRenderer.js - Minimal native WebGL renderer for terrain, water, trees, and player.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};
    const M = SkySquirrel.Math3D;

    class WebGLRenderer {
        constructor(canvas, config = SkySquirrel.WorldConfig) {
            this.canvas = canvas;
            this.config = config;
            this.gl = null;
            this.program = null;
            this.meshCache = new WeakMap();
            this.locations = null;
            this.playerMesh = null;
        }

        init() {
            const gl = this.canvas.getContext('webgl', { antialias: true, alpha: false });
            if (!gl) throw new Error('WebGL is not available in this browser.');
            this.gl = gl;
            this.program = this.createProgram();
            this.locations = this.getLocations();
            gl.useProgram(this.program);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.clearColor(
                this.config.render.skyColor[0],
                this.config.render.skyColor[1],
                this.config.render.skyColor[2],
                1
            );
            this.playerMesh = this.buildPlayerMesh();
            this.resize();
        }

        createProgram() {
            const vertexSource = [
                'attribute vec3 aPosition;',
                'attribute vec3 aNormal;',
                'attribute vec3 aColor;',
                'uniform mat4 uViewProjection;',
                'uniform vec3 uSunDirection;',
                'varying vec3 vColor;',
                'varying float vFogDepth;',
                'void main() {',
                '  vec4 world = vec4(aPosition, 1.0);',
                '  gl_Position = uViewProjection * world;',
                '  float light = clamp(dot(normalize(aNormal), normalize(uSunDirection)) * 0.55 + 0.55, 0.18, 1.0);',
                '  vColor = aColor * light;',
                '  vFogDepth = length(world.xyz);',
                '}'
            ].join('\n');

            const fragmentSource = [
                'precision mediump float;',
                'uniform vec3 uFogColor;',
                'uniform float uFogNear;',
                'uniform float uFogFar;',
                'uniform float uAlpha;',
                'varying vec3 vColor;',
                'varying float vFogDepth;',
                'void main() {',
                '  float fog = smoothstep(uFogNear, uFogFar, vFogDepth);',
                '  gl_FragColor = vec4(mix(vColor, uFogColor, fog), uAlpha);',
                '}'
            ].join('\n');

            const gl = this.gl;
            const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program));
            }
            return program;
        }

        compileShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader));
            }
            return shader;
        }

        getLocations() {
            const gl = this.gl;
            return {
                position: gl.getAttribLocation(this.program, 'aPosition'),
                normal: gl.getAttribLocation(this.program, 'aNormal'),
                color: gl.getAttribLocation(this.program, 'aColor'),
                viewProjection: gl.getUniformLocation(this.program, 'uViewProjection'),
                sunDirection: gl.getUniformLocation(this.program, 'uSunDirection'),
                fogColor: gl.getUniformLocation(this.program, 'uFogColor'),
                fogNear: gl.getUniformLocation(this.program, 'uFogNear'),
                fogFar: gl.getUniformLocation(this.program, 'uFogFar'),
                alpha: gl.getUniformLocation(this.program, 'uAlpha')
            };
        }

        resize() {
            const displayWidth = Math.max(1, Math.floor(this.canvas.clientWidth * window.devicePixelRatio));
            const displayHeight = Math.max(1, Math.floor(this.canvas.clientHeight * window.devicePixelRatio));
            if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
            }
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }

        render(scene) {
            const gl = this.gl;
            this.resize();
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.program);

            const aspect = this.canvas.width / this.canvas.height;
            const projection = M.perspective(68 * Math.PI / 180, aspect, 0.4, 8200);
            const viewProjection = M.multiplyMat4(projection, scene.camera.getViewMatrix());
            const render = this.config.render;

            gl.uniformMatrix4fv(this.locations.viewProjection, false, new Float32Array(viewProjection));
            gl.uniform3fv(this.locations.sunDirection, new Float32Array(render.sunDirection));
            gl.uniform3fv(this.locations.fogColor, new Float32Array(render.fogColor));
            gl.uniform1f(this.locations.fogNear, render.fogNear);
            gl.uniform1f(this.locations.fogFar, render.fogFar);

            this.drawMesh(scene.environment.waterMesh, 0.78, false);
            this.drawMesh(scene.terrain.mesh, 1, true);
            this.drawMesh(scene.environment.landmarkMesh, 0.92, true);
            this.drawMesh(scene.environment.treeMesh, 1, true);
            this.drawMesh(this.transformPlayerMesh(scene.player), 1, true);
        }

        drawMesh(mesh, alpha, depthWrite) {
            if (!mesh || mesh.count <= 0) return;
            const gl = this.gl;
            if (alpha < 1) {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.disable(gl.BLEND);
            }
            gl.depthMask(depthWrite);
            const buffers = this.getBuffers(mesh);
            if (mesh.dynamic) {
                this.updateDynamicBuffers(mesh, buffers);
            }
            this.bindAttribute(this.locations.position, buffers.position, 3);
            this.bindAttribute(this.locations.normal, buffers.normal, 3);
            this.bindAttribute(this.locations.color, buffers.color, 3);
            gl.uniform1f(this.locations.alpha, alpha);
            gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
            gl.depthMask(true);
        }

        bindAttribute(location, buffer, size) {
            const gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        }

        getBuffers(mesh) {
            const cached = this.meshCache.get(mesh);
            if (cached) return cached;
            const gl = this.gl;
            const buffers = {
                position: this.createBuffer(mesh.vertices),
                normal: this.createBuffer(mesh.normals),
                color: this.createBuffer(mesh.colors)
            };
            this.meshCache.set(mesh, buffers);
            return buffers;
        }

        createBuffer(data) {
            const gl = this.gl;
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return buffer;
        }

        updateDynamicBuffers(mesh, buffers) {
            const gl = this.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
            gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW);
        }

        buildPlayerMesh() {
            const body = this.config.render.suitColor;
            const wing = this.config.render.playerColor;
            const vertices = [
                0, 2, -8, -5, 0, 4, 5, 0, 4,
                0, 2, -8, 5, 0, 4, 0, -2, 6,
                0, 2, -8, 0, -2, 6, -5, 0, 4,
                -18, 0, 1, -5, 0, 4, 0, -1, 0,
                18, 0, 1, 0, -1, 0, 5, 0, 4,
                -5, 0, 4, 5, 0, 4, 0, -1, 0
            ];
            const normals = [];
            const colors = [];
            for (let i = 0; i < vertices.length; i += 9) {
                const a = M.vec3(vertices[i], vertices[i + 1], vertices[i + 2]);
                const b = M.vec3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
                const c = M.vec3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);
                const normal = M.normalize(M.cross(M.sub(b, a), M.sub(c, a)));
                const color = i >= 27 ? wing : body;
                for (let j = 0; j < 3; j++) {
                    normals.push(normal.x, normal.y, normal.z);
                    colors.push(color[0], color[1], color[2]);
                }
            }
            return { vertices: new Float32Array(vertices), normals: new Float32Array(normals), colors: new Float32Array(colors), count: vertices.length / 3 };
        }

        transformPlayerMesh(playerState) {
            const source = this.playerMesh;
            if (!this.playerDrawMesh) {
                this.playerDrawMesh = {
                    vertices: new Float32Array(source.vertices.length),
                    normals: new Float32Array(source.normals.length),
                    colors: source.colors,
                    count: source.count,
                    dynamic: true
                };
            }
            const transformed = this.playerDrawMesh;
            const cosH = Math.cos(playerState.heading);
            const sinH = Math.sin(playerState.heading);
            const cosP = Math.cos(playerState.pitch || 0);
            const sinP = Math.sin(playerState.pitch || 0);
            const cosR = Math.cos(playerState.roll || 0);
            const sinR = Math.sin(playerState.roll || 0);

            for (let i = 0; i < source.vertices.length; i += 3) {
                let x = source.vertices[i];
                let y = source.vertices[i + 1];
                let z = source.vertices[i + 2];

                const rx = x * cosR - y * sinR;
                const ry = x * sinR + y * cosR;
                x = rx;
                y = ry;

                const py = y * cosP - z * sinP;
                const pz = y * sinP + z * cosP;
                y = py;
                z = pz;

                const hx = x * cosH + z * sinH;
                const hz = -x * sinH + z * cosH;

                transformed.vertices[i] = hx + playerState.position.x;
                transformed.vertices[i + 1] = y + playerState.position.y;
                transformed.vertices[i + 2] = hz + playerState.position.z;
                transformed.normals[i] = hx - playerState.position.x;
                transformed.normals[i + 1] = y;
                transformed.normals[i + 2] = hz - playerState.position.z;
            }
            return transformed;
        }

        destroy() {
            this.meshCache = new WeakMap();
        }
    }

    SkySquirrel.WebGLRenderer = WebGLRenderer;
}());
