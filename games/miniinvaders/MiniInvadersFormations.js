/**
 * Pure formation generation for Mini Invaders.
 */
(function () {
    function generateFormation(pattern, alienCount, config) {
        const formations = [];
        const centerX = config.canvas.width / 2;
        const startY = 60;

        switch (pattern) {
            case 'circle': {
                const radius = Math.min(150, 80 + alienCount * 0.5);
                for (let i = 0; i < alienCount; i++) {
                    const angle = (i / alienCount) * Math.PI * 2;
                    formations.push({
                        x: centerX + Math.cos(angle) * radius,
                        y: startY + Math.sin(angle) * radius * 0.5
                    });
                }
                break;
            }
            case 'diamond': {
                const rows = Math.ceil(Math.sqrt(alienCount * 1.5));
                for (let i = 0; i < alienCount; i++) {
                    const row = Math.floor(i / rows);
                    const col = i % rows;
                    const rowWidth = Math.max(1, rows - Math.abs(row - rows / 2) * 2);
                    const offsetX = (rows - rowWidth) * 20;
                    formations.push({
                        x: centerX - rowWidth * 18 + (col % rowWidth) * 36 + offsetX,
                        y: startY + row * 35
                    });
                }
                break;
            }
            case 'vShape': {
                const vRows = Math.ceil(alienCount / 4);
                const maxVWidth = 300;
                let vIndex = 0;
                for (let row = 0; row < vRows && vIndex < alienCount; row++) {
                    const rowAliens = Math.min(4, alienCount - vIndex);
                    const rowWidth = (row / vRows) * maxVWidth;
                    const spacing = rowAliens > 1 ? rowWidth / (rowAliens - 1) : 0;

                    for (let col = 0; col < rowAliens && vIndex < alienCount; col++) {
                        const offset = col - (rowAliens - 1) / 2;
                        formations.push({
                            x: centerX + offset * spacing,
                            y: startY + row * 35
                        });
                        vIndex++;
                    }
                }
                break;
            }
            case 'cross': {
                const crossSize = Math.ceil(alienCount / 2);
                for (let i = 0; i < alienCount; i++) {
                    if (i < crossSize) {
                        formations.push({
                            x: centerX - crossSize * 16 + i * 32,
                            y: startY + 60
                        });
                    } else {
                        const vIndex = i - crossSize;
                        formations.push({
                            x: centerX,
                            y: startY + vIndex * 32
                        });
                    }
                }
                break;
            }
            case 'spiral': {
                for (let i = 0; i < alienCount; i++) {
                    const angle = i * 0.4;
                    const spiralRadius = 25 + i * 1.8;
                    formations.push({
                        x: centerX + Math.cos(angle) * spiralRadius,
                        y: startY + Math.sin(angle) * spiralRadius * 0.5 + i * 2.5
                    });
                }
                break;
            }
            case 'heart': {
                for (let i = 0; i < alienCount; i++) {
                    const t = (i / alienCount) * Math.PI * 2;
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                    formations.push({
                        x: centerX + x * 3.5,
                        y: startY + 80 + y * 2.5
                    });
                }
                break;
            }
            case 'wings': {
                for (let i = 0; i < alienCount; i++) {
                    const side = i % 2;
                    const layer = Math.floor(i / 2);
                    const angle = layer * 0.3;
                    const radius = 80 + layer * 15;
                    formations.push({
                        x: centerX + (side === 0 ? -Math.cos(angle) * radius : Math.cos(angle) * radius),
                        y: startY + 40 + Math.sin(angle) * radius * 0.4
                    });
                }
                break;
            }
            case 'hexagon': {
                const hexRadius = 100;
                const sides = 6;
                const perSide = Math.floor(alienCount / sides);
                let index = 0;
                for (let s = 0; s < sides; s++) {
                    const angle1 = (s / sides) * Math.PI * 2;
                    const angle2 = ((s + 1) / sides) * Math.PI * 2;
                    const x1 = centerX + Math.cos(angle1) * hexRadius;
                    const y1 = startY + 100 + Math.sin(angle1) * hexRadius * 0.6;
                    const x2 = centerX + Math.cos(angle2) * hexRadius;
                    const y2 = startY + 100 + Math.sin(angle2) * hexRadius * 0.6;

                    for (let p = 0; p < perSide && index < alienCount; p++, index++) {
                        const t = p / perSide;
                        formations.push({
                            x: x1 + (x2 - x1) * t,
                            y: y1 + (y2 - y1) * t
                        });
                    }
                }
                break;
            }
            default: {
                const cols = Math.ceil(Math.sqrt(alienCount * 1.5));
                for (let i = 0; i < alienCount; i++) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    formations.push({
                        x: centerX - cols * 20 + col * 40,
                        y: startY + row * 38
                    });
                }
            }
        }

        const safeMargin = 50;
        const minX = safeMargin;
        const maxX = config.canvas.width - safeMargin - config.alien.width;
        const minY = startY;
        const maxY = config.canvas.height * 0.4;

        formations.forEach(pos => {
            pos.x = Math.max(minX, Math.min(maxX, pos.x));
            pos.y = Math.max(minY, Math.min(maxY, pos.y));
        });

        return formations;
    }

    if (typeof window !== 'undefined') {
        window.MiniInvadersFormations = {
            generateFormation
        };
    }
})();
