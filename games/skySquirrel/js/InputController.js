/**
 * InputController.js - Keyboard and pointer input with clean teardown.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};

    class InputController {
        constructor(target = document) {
            this.target = target;
            this.keys = {};
            this.pointerLocked = false;
            this.mouseDelta = { x: 0, y: 0 };
            this.cleanup = [];
            this.onKeyDown = this.onKeyDown.bind(this);
            this.onKeyUp = this.onKeyUp.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onPointerLockChange = this.onPointerLockChange.bind(this);
        }

        init() {
            this.add(document, 'keydown', this.onKeyDown);
            this.add(document, 'keyup', this.onKeyUp);
            this.add(document, 'mousemove', this.onMouseMove);
            this.add(document, 'mousedown', this.onMouseDown);
            this.add(document, 'pointerlockchange', this.onPointerLockChange);
            this.add(document, 'contextmenu', event => event.preventDefault());
        }

        add(target, event, handler) {
            target.addEventListener(event, handler);
            this.cleanup.push(() => target.removeEventListener(event, handler));
        }

        onKeyDown(event) {
            this.keys[event.code] = true;
            if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR'].includes(event.code)) {
                event.preventDefault();
            }
        }

        onKeyUp(event) {
            this.keys[event.code] = false;
        }

        onMouseMove(event) {
            if (!this.pointerLocked) return;
            this.mouseDelta.x += event.movementX || 0;
            this.mouseDelta.y += event.movementY || 0;
        }

        onMouseDown() {
            const canvas = document.querySelector('#game-canvas');
            if (canvas && canvas.requestPointerLock && !this.pointerLocked) {
                canvas.requestPointerLock();
            }
        }

        onPointerLockChange() {
            this.pointerLocked = document.pointerLockElement === document.querySelector('#game-canvas');
        }

        read() {
            const input = {
                forward: !!this.keys.KeyW,
                backward: !!this.keys.KeyS,
                left: !!this.keys.KeyA,
                right: !!this.keys.KeyD,
                jump: !!this.keys.Space,
                yawLeft: !!this.keys.KeyQ,
                yawRight: !!this.keys.KeyE,
                restart: !!this.keys.KeyR,
                mouseX: this.mouseDelta.x,
                mouseY: this.mouseDelta.y,
                pointerLocked: this.pointerLocked
            };
            this.mouseDelta.x = 0;
            this.mouseDelta.y = 0;
            return input;
        }

        destroy() {
            this.cleanup.forEach(remove => remove());
            this.cleanup = [];
            if (document.exitPointerLock && this.pointerLocked) {
                document.exitPointerLock();
            }
        }
    }

    SkySquirrel.InputController = InputController;
}());
