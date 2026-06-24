(function (ns) {
    const SHAPES = {
        dart:[[0,-18],[8,12],[0,8],[-8,12]], block:[[0,-18],[15,-8],[16,14],[0,10],[-16,14],[-15,-8]], fork:[[0,-17],[12,-11],[7,14],[0,8],[-7,14],[-12,-11]], blade:[[0,-19],[14,8],[4,14],[0,7],[-4,14],[-14,8]], shield:[[0,-18],[14,-6],[11,14],[0,10],[-11,14],[-14,-6]], hook:[[0,-19],[15,-4],[7,4],[14,15],[0,9],[-14,15],[-7,4],[-15,-4]],
        bomber:[[0,-19],[17,-8],[14,16],[4,11],[0,16],[-4,11],[-14,16],[-17,-8]], lancer:[[0,-25],[8,-9],[17,13],[0,8],[-17,13],[-8,-9]], layer:[[0,-15],[18,-2],[10,16],[0,9],[-10,16],[-18,-2]], tender:[[0,-16],[18,-10],[20,14],[0,18],[-20,14],[-18,-10]], jammer:[[0,-16],[10,-7],[18,0],[10,7],[0,16],[-10,7],[-18,0],[-10,-7]],
        carrier:[[0,-48],[29,-28],[45,-8],[39,35],[15,48],[0,35],[-15,48],[-39,35],[-45,-8],[-29,-28]], aegis:[[0,-50],[24,-35],[43,0],[33,38],[0,47],[-33,38],[-43,0],[-24,-35]], reaver:[[0,-50],[35,-25],[19,-3],[41,35],[8,28],[0,44],[-8,28],[-41,35],[-19,-3],[-35,-25]], foundry:[[0,-55],[38,-44],[62,-12],[58,48],[25,61],[0,45],[-25,61],[-58,48],[-62,-12],[-38,-44]], solar:[[0,-60],[34,-40],[55,0],[34,48],[0,62],[-34,48],[-55,0],[-34,-40]], eclipse:[[0,-58],[48,-27],[30,-5],[58,40],[15,31],[0,56],[-15,31],[-58,40],[-30,-5],[-48,-27]], cutter:[[0,-16],[13,13],[0,8],[-13,13]]
    };
    function definition(enemy) { return enemy?.bossType ? ns.Data.BOSSES[enemy.bossType] : ns.Data.ENEMY_TYPES[enemy?.archetype]; }
    function shape(enemy) { return SHAPES[definition(enemy)?.shape] || SHAPES.cutter; }
    function scale(enemy) { return (enemy.radius || 14) / (enemy.bossType ? 60 : 15); }
    function rotatePoint(x, y, angle) { return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) }; }
    function polygon(enemy) { const angle = (enemy.angle || 0) + Math.PI / 2, factor = scale(enemy); return shape(enemy).map(([x, y]) => { const p = rotatePoint(x * factor, y * factor, angle); return { x: enemy.x + p.x, y: enemy.y + p.y }; }); }
    function componentPoint(enemy, component) { const p = rotatePoint(component.x * scale(enemy), component.y * scale(enemy), (enemy.angle || 0) + Math.PI / 2); return { x: enemy.x + p.x, y: enemy.y + p.y, radius: 18 * scale(enemy) }; }
    function pointInPolygon(point, points) { let inside = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j], crossing = ((a.y > point.y) !== (b.y > point.y)) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1e-9) + a.x; if (crossing) inside = !inside; } return inside; }
    function segmentIntersection(a, b, c, d) { const rx = b.x-a.x, ry = b.y-a.y, sx = d.x-c.x, sy = d.y-c.y, den = rx*sy-ry*sx; if (Math.abs(den) < 1e-9) return null; const qx=c.x-a.x, qy=c.y-a.y, t=(qx*sy-qy*sx)/den, u=(qx*ry-qy*rx)/den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null; }
    function distanceToSegment(point, a, b) { const dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy, t=length ? Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)) : 0; return { distance: Math.hypot(point.x-(a.x+dx*t), point.y-(a.y+dy*t)), t }; }
    function segmentPolygonHit(from, to, enemy, radius) {
        const points = polygon(enemy); if (pointInPolygon(from, points)) return 0; let best = null;
        for (let i=0;i<points.length;i++) { const a=points[i], b=points[(i+1)%points.length], hit=segmentIntersection(from,to,a,b); if (hit !== null && (best === null || hit < best)) best=hit; if (radius > 0) { const nearA=distanceToSegment(a,from,to); if (nearA.distance <= radius && (best===null || nearA.t<best)) best=nearA.t; const nearB=distanceToSegment(b,from,to); if (nearB.distance <= radius && (best===null || nearB.t<best)) best=nearB.t; const fromEdge=distanceToSegment(from,a,b), toEdge=distanceToSegment(to,a,b); if (fromEdge.distance<=radius) best=best===null?0:Math.min(best,0); if (toEdge.distance<=radius) best=best===null?1:Math.min(best,1); } }
        return best;
    }
    function fragments(enemy) { const points = shape(enemy), count = enemy.bossType ? Math.min(points.length, 12) : Math.min(points.length, enemy.radius >= 18 ? 6 : 4), step = Math.max(1, Math.floor(points.length / count)); return Array.from({length:count},(_,i) => [[0,0], points[(i*step)%points.length], points[((i+1)*step)%points.length]]); }
    ns.Geometry = { SHAPES, definition, shape, scale, polygon, componentPoint, pointInPolygon, segmentPolygonHit, fragments };
})(window.FrontierWayfarer);
