/**
 * Pure combat helpers for Mini Invaders.
 */
(function () {
    function checkCollision(rect1, rect2) {
        return rect1.left < rect2.right &&
            rect1.right > rect2.left &&
            rect1.top < rect2.bottom &&
            rect1.bottom > rect2.top;
    }

    if (typeof window !== 'undefined') {
        window.MiniInvadersCombat = {
            checkCollision
        };
    }
})();
