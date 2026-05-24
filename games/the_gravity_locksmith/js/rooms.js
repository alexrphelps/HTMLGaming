window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function frame() {
    return [
      { x: 0, y: 1008, w: 1920, h: 72 },
      { x: 0, y: 0, w: 1920, h: 36 }
    ];
  }

  function route(seed) {
    const wobble = (seed % 4) * 18;
    return frame().concat([
      { x: 145, y: 890 - wobble, w: 210, h: 26 },
      { x: 430, y: 770 + wobble, w: 190, h: 26 },
      { x: 720, y: 638 - wobble, w: 200, h: 26 },
      { x: 1010, y: 512 + wobble, w: 200, h: 26 },
      { x: 1300, y: 658 - wobble, w: 200, h: 26 },
      { x: 1575, y: 850 + wobble / 2, w: 220, h: 26 },
      { x: 430, y: 200 + wobble / 2, w: 210, h: 26 },
      { x: 790, y: 300 - wobble / 2, w: 210, h: 26 },
      { x: 1160, y: 190 + wobble, w: 210, h: 26 },
      { x: 1510, y: 250 - wobble / 2, w: 210, h: 26 }
    ]);
  }

  function room(index, name, options) {
    const settings = options || {};
    const topExit = settings.topExit == null ? index % 3 === 0 : settings.topExit;
    return {
      id: index + "-" + slug(name),
      name: name,
      parTime: settings.parTime || Math.round(16 + index * 1.35),
      parFlips: settings.parFlips || Math.min(9, 2 + Math.ceil(index / 6)),
      parDeaths: 0,
      spawn: settings.spawn || { x: 104, y: 900 },
      exit: settings.exit || (topExit ? { x: 1760, y: 86, w: 84, h: 140 } : { x: 1760, y: 824, w: 84, h: 140 }),
      chase: settings.chase || false,
      platforms: settings.platforms || route(index),
      shards: settings.shards || [
        { x: 820, y: index % 2 === 0 ? 594 : 256 },
        { x: 1290, y: index % 3 === 0 ? 146 : 614 }
      ],
      spikes: settings.spikes || [
        { x: 360, y: 988, w: 280 + (index % 4) * 80, h: 20, dir: -1 },
        { x: 870, y: 36, w: 260 + (index % 3) * 90, h: 20, dir: 1 },
        { x: 1320, y: 988, w: 220 + (index % 2) * 110, h: 20, dir: -1 }
      ],
      enemies: settings.enemies || [],
      movers: settings.movers || [],
      flipBatteries: settings.flipBatteries || [],
      jumpBatteries: settings.jumpBatteries || [],
      locks: settings.locks || [],
      gates: settings.gates || [],
      hazards: settings.hazards || [],
      tip: settings.tip || "Read the lock, route the shard order, and save a flip for the ugly part."
    };
  }

  const patrol = function(x, y, vx) {
    return { type: "patrol", x: x, y: y, w: 42, h: 42, vx: vx || 86 };
  };
  const hunter = function(x, y, speed) {
    return { type: "hunter", axis: "x", x: x, y: y, w: 46, h: 46, speed: speed || 88 };
  };
  const battery = function(x, y, amount) {
    return { x: x, y: y, amount: amount || 45 };
  };
  const jumpBattery = function(x, y, amount) {
    return { x: x, y: y, amount: amount || 100 };
  };
  const gate = function(id, x, y, w, h, shards, lockId) {
    return { id: id, x: x, y: y, w: w, h: h, shards: shards || 0, lockId: lockId || null };
  };
  const sentry = function(x, y, axis, length, phase, dir) {
    return { type: "sentry", x: x, y: y, w: 42, h: 42, axis: axis || "x", length: length || 420, thickness: 18, period: 2.3, activeTime: 1.05, phase: phase || 0, dir: dir || 1 };
  };
  const chase = function(baseSpeed, rampPerSecond, startX, killOffset) {
    return { baseSpeed: baseSpeed, rampPerSecond: rampPerSecond, startX: startX == null ? -180 : startX, killOffset: killOffset || 78 };
  };

  ns.ROOM_DEFINITIONS = [
    room(1, "The First Tooth", {
      parTime: 14,
      parFlips: 1,
      spawn: { x: 110, y: 900 },
      shards: [{ x: 1030, y: 468 }],
      spikes: [],
      tip: "A short warmup. Take the shard, then leave before the vault learns your name."
    }),
    room(2, "Ceiling Receipt", {
      parTime: 18,
      parFlips: 2,
      topExit: true,
      shards: [{ x: 890, y: 256 }],
      spikes: [{ x: 540, y: 988, w: 520, h: 20, dir: -1 }],
      tip: "The ceiling is a second floor. Flip once with intent, not panic."
    }),
    room(3, "Battery Primer", {
      parTime: 19,
      parFlips: 3,
      flipBatteries: [battery(690, 540)],
      jumpBatteries: [jumpBattery(550, 704)],
      shards: [{ x: 1180, y: 146 }],
      spikes: [{ x: 440, y: 988, w: 680, h: 20, dir: -1 }, { x: 1000, y: 36, w: 340, h: 20, dir: 1 }],
      tip: "Batteries refill gravity charge once. Spend, refill, then commit."
    }),
    room(4, "Green Door Lesson", {
      parTime: 22,
      parFlips: 3,
      shards: [{ x: 730, y: 594 }],
      gates: [gate("lesson-gate", 1180, 720, 48, 288, 1)],
      flipBatteries: [battery(1034, 438)],
      jumpBatteries: [jumpBattery(575, 704)],
      tip: "Gates open from shard counts. The exit is easy; reaching it is the bill."
    }),
    room(5, "Crossbite Audit", {
      enemies: [patrol(1010, 470, 92)],
      flipBatteries: [battery(545, 704)],
      jumpBatteries: [jumpBattery(1372, 574)],
      gates: [gate("bite", 1210, 600, 44, 250, 1)],
      tip: "The guard and gate want different routes. Pick the order before you jump."
    }),
    room(6, "Sentry Wake", {
      hazards: [sentry(910, 478, "x", 480, 0.4, 1)],
      flipBatteries: [battery(1390, 570)],
      jumpBatteries: [jumpBattery(500, 704)],
      shards: [{ x: 760, y: 594 }, { x: 1380, y: 146 }],
      tip: "Red beams blink. Move during the breath, not during the scream."
    }),
    room(7, "Hunter Ledger", {
      enemies: [hunter(1180, 612, 82)],
      gates: [gate("hunter-gate", 1450, 724, 46, 260, 2)],
      flipBatteries: [battery(845, 232)],
      jumpBatteries: [jumpBattery(646, 704)],
      tip: "Hunters drift toward you. Let gravity and spikes do some of the work."
    }),
    room(8, "Two-Flip Lie", {
      shards: [{ x: 530, y: 724 }, { x: 1190, y: 146 }, { x: 1510, y: 806 }],
      flipBatteries: [battery(1048, 430)],
      jumpBatteries: [jumpBattery(785, 552)],
      spikes: [{ x: 350, y: 988, w: 850, h: 20, dir: -1 }, { x: 780, y: 36, w: 650, h: 20, dir: 1 }],
      tip: "You can spend two flips quickly. The third one must be earned."
    }),
    room(9, "Shard Before Safety", {
      locks: [{ id: "mid", shards: 2 }],
      gates: [gate("mid-gate", 1060, 520, 44, 300, 0, "mid")],
      hazards: [sentry(610, 742, "x", 420, 0.9, 1)],
      flipBatteries: [battery(1414, 574)],
      jumpBatteries: [jumpBattery(900, 232)],
      tip: "The safe platform is locked behind the wrong shard order."
    }),
    room(10, "Pendulum Battery", {
      movers: [{ x: 620, y: 720, w: 210, h: 28, axis: "y", range: 190, speed: 84 }, { x: 1120, y: 340, w: 210, h: 28, axis: "y", range: 190, speed: 92 }],
      flipBatteries: [battery(976, 454)],
      jumpBatteries: [jumpBattery(1362, 296)],
      spikes: [{ x: 370, y: 988, w: 1100, h: 20, dir: -1 }, { x: 430, y: 36, w: 1020, h: 20, dir: 1 }],
      tip: "The refill sits between bad cycles. Board early or wait and suffer."
    }),
    room(11, "Serrated Choice", {
      enemies: [patrol(720, 596, 90)],
      hazards: [sentry(1280, 178, "y", 520, 0.2, 1)],
      flipBatteries: [battery(505, 132)],
      jumpBatteries: [jumpBattery(1048, 430)],
      tip: "Patrol first or beam first. Both answers hurt if you hesitate."
    }),
    room(12, "Gate Tax", {
      locks: [{ id: "upper", shards: 1 }],
      gates: [gate("upper-gate", 840, 150, 46, 260, 0, "upper"), gate("exit-gate", 1510, 780, 46, 230, 2)],
      flipBatteries: [battery(1220, 574)],
      jumpBatteries: [jumpBattery(590, 704)],
      enemies: [hunter(1320, 812, 86)],
      tip: "One shard opens the ceiling. Two shards open the way out. Mind the hunter."
    }),
    room(13, "Needle Contract", {
      spikes: [{ x: 300, y: 988, w: 1250, h: 20, dir: -1 }, { x: 560, y: 36, w: 920, h: 20, dir: 1 }],
      flipBatteries: [battery(810, 552), battery(1348, 110, 35)],
      jumpBatteries: [jumpBattery(1072, 430)],
      hazards: [sentry(1060, 474, "x", 360, 1.1, -1)],
      tip: "There are refills. They are not gifts; they are bait."
    }),
    room(14, "First Red Debt", {
      chase: chase(82, 8, -210, 82),
      enemies: [patrol(930, 470, 98)],
      flipBatteries: [battery(1280, 574)],
      jumpBatteries: [jumpBattery(742, 232)],
      gates: [gate("rush-gate", 1440, 694, 46, 284, 2)],
      tip: "First red-line test. The detour is required, and the wall does not care."
    }),
    room(15, "Lockstep Orchard", {
      locks: [{ id: "orchard", shards: 2 }],
      gates: [gate("orchard-gate", 1180, 420, 50, 360, 0, "orchard")],
      enemies: [patrol(730, 596, 92), patrol(1290, 616, -88)],
      flipBatteries: [battery(962, 232)],
      tip: "Clear the patrols or route around them. Both cost time."
    }),
    room(16, "Dead Battery Saint", {
      flipBatteries: [battery(560, 704, 35), battery(1488, 770, 35)],
      hazards: [sentry(870, 610, "x", 470, 0.1, 1), sentry(1240, 178, "y", 500, 1.2, 1)],
      shards: [{ x: 760, y: 594 }, { x: 1180, y: 146 }, { x: 1510, y: 806 }],
      tip: "Small refills mean no waste. A sloppy flip becomes a lock."
    }),
    room(17, "The False Floor", {
      gates: [gate("false-floor", 940, 720, 46, 288, 1), gate("final-lock", 1510, 120, 46, 260, 3)],
      flipBatteries: [battery(710, 232), battery(1364, 574)],
      enemies: [hunter(1080, 470, 88)],
      tip: "The obvious landing opens nothing. The ugly shard opens everything."
    }),
    room(18, "Sentry Chapel", {
      hazards: [sentry(600, 742, "x", 500, 0, 1), sentry(1340, 214, "x", 500, 1.15, -1)],
      flipBatteries: [battery(970, 430)],
      spikes: [{ x: 360, y: 988, w: 450, h: 20, dir: -1 }, { x: 1080, y: 988, w: 450, h: 20, dir: -1 }, { x: 760, y: 36, w: 520, h: 20, dir: 1 }],
      tip: "Two beams, one rhythm. Break rhythm only to recharge."
    }),
    room(19, "Hunter Switchback", {
      enemies: [hunter(620, 724, 90), hunter(1320, 612, 92)],
      gates: [gate("switchback", 1020, 520, 46, 330, 2)],
      flipBatteries: [battery(920, 232)],
      tip: "Hunters make the slow route unsafe. Make the fast route clean."
    }),
    room(20, "Red Line Ledger", {
      chase: chase(92, 10, -190, 88),
      locks: [{ id: "rush", shards: 2 }],
      gates: [gate("rush", 1330, 650, 46, 330, 0, "rush")],
      hazards: [sentry(880, 480, "x", 390, 0.6, 1)],
      flipBatteries: [battery(1192, 110)],
      tip: "The red line turns waiting into a mistake. Solve while moving."
    }),
    room(21, "Three-Key Feeling", {
      shards: [{ x: 520, y: 724 }, { x: 960, y: 256 }, { x: 1370, y: 614 }],
      locks: [{ id: "deep", shards: 3 }],
      gates: [gate("deep-gate", 1510, 166, 46, 260, 0, "deep")],
      flipBatteries: [battery(770, 552), battery(1210, 110)],
      tip: "No keys, just consequences. Three shards before the clean exit lane."
    }),
    room(22, "Beam Court", {
      hazards: [sentry(500, 204, "y", 520, 0.3, 1), sentry(960, 602, "x", 430, 1, 1), sentry(1450, 812, "y", 460, 1.6, -1)],
      flipBatteries: [battery(1235, 574)],
      enemies: [patrol(720, 596, 94)],
      tip: "Every safe square expires. Move like you meant to be there."
    }),
    room(23, "Gravity Usury", {
      flipBatteries: [battery(500, 132, 35), battery(1064, 430, 35), battery(1490, 770, 35)],
      gates: [gate("usury", 1260, 612, 46, 300, 2)],
      enemies: [hunter(920, 596, 92)],
      tip: "The room lends charge in pieces and charges interest in panic."
    }),
    room(24, "Red Thread Needle", {
      chase: chase(98, 11, -170, 92),
      hazards: [sentry(730, 610, "x", 420, 0.5, 1), sentry(1230, 204, "y", 520, 1.2, 1)],
      flipBatteries: [battery(966, 232), battery(1458, 574)],
      tip: "A chase with beams is a puzzle at sprint speed. Read two moves ahead."
    }),
    room(25, "Black Ferry", {
      movers: [{ x: 520, y: 720, w: 190, h: 28, axis: "x", range: 180, speed: 96 }, { x: 920, y: 520, w: 210, h: 28, axis: "y", range: 210, speed: 102 }, { x: 1320, y: 300, w: 190, h: 28, axis: "x", range: 180, speed: 96 }],
      hazards: [sentry(1030, 478, "x", 360, 0.2, -1)],
      flipBatteries: [battery(1212, 110)],
      tip: "The ferry does not wait. Neither does the laser."
    }),
    room(26, "Predator Lattice", {
      enemies: [hunter(520, 724, 92), hunter(1020, 468, 96), patrol(1430, 806, -90)],
      gates: [gate("lattice", 1260, 120, 46, 300, 2)],
      flipBatteries: [battery(804, 232)],
      tip: "Two hunters make hesitation louder than movement."
    }),
    room(27, "Locked Pendulum", {
      movers: [{ x: 650, y: 730, w: 210, h: 28, axis: "y", range: 210, speed: 96 }, { x: 1110, y: 330, w: 210, h: 28, axis: "y", range: 210, speed: 108 }],
      gates: [gate("pendulum-lock", 1450, 700, 46, 300, 2)],
      flipBatteries: [battery(956, 454)],
      hazards: [sentry(1280, 178, "x", 420, 1.4, -1)],
      tip: "Open the lock before the good platform cycle leaves you behind."
    }),
    room(28, "Red Line Backpay", {
      chase: chase(104, 12, -155, 96),
      shards: [{ x: 430, y: 724 }, { x: 1160, y: 146 }, { x: 1510, y: 806 }],
      flipBatteries: [battery(872, 552), battery(1352, 232)],
      enemies: [hunter(1000, 470, 94)],
      tip: "The first shard is behind schedule. Make the backtrack surgical."
    }),
    room(29, "Sentry Mill", {
      hazards: [sentry(520, 742, "x", 380, 0, 1), sentry(920, 250, "y", 500, 0.8, 1), sentry(1320, 646, "x", 380, 1.6, -1)],
      flipBatteries: [battery(790, 552), battery(1216, 110)],
      gates: [gate("mill", 1510, 650, 46, 340, 3)],
      tip: "Three shards, three beams, one bad habit to unlearn."
    }),
    room(30, "Hunter Tithe", {
      enemies: [hunter(560, 724, 96), hunter(940, 596, 98), hunter(1320, 146, 94)],
      flipBatteries: [battery(1138, 430)],
      spikes: [{ x: 330, y: 988, w: 1160, h: 20, dir: -1 }, { x: 680, y: 36, w: 840, h: 20, dir: 1 }],
      tip: "Every hunter can become a problem or a solution. Use the spikes."
    }),
    room(31, "The Door That Chases", {
      chase: chase(108, 13, -150, 100),
      locks: [{ id: "door", shards: 2 }],
      gates: [gate("door", 1320, 640, 46, 340, 0, "door")],
      hazards: [sentry(850, 478, "x", 440, 0.8, 1)],
      flipBatteries: [battery(1198, 110)],
      tip: "The door opens late. The red line arrives early. Reconcile that."
    }),
    room(32, "No Spare Landing", {
      flipBatteries: [battery(552, 704, 35), battery(1492, 120, 35)],
      hazards: [sentry(760, 610, "x", 360, 0.4, 1), sentry(1180, 214, "x", 360, 1.4, -1)],
      enemies: [patrol(1000, 470, 100)],
      tip: "There is no neutral landing. Every stop must pay for the next mistake."
    }),
    room(33, "Red Line Contract I", {
      chase: chase(112, 13, -140, 100),
      flipBatteries: [battery(772, 552), battery(1298, 232)],
      gates: [gate("contract-one", 1450, 700, 46, 300, 2)],
      enemies: [hunter(1040, 470, 96)],
      tip: "Late contracts start here. The route is a fuse."
    }),
    room(34, "Red Line Contract II", {
      chase: chase(116, 14, -130, 104),
      hazards: [sentry(620, 742, "x", 460, 0.2, 1), sentry(1270, 190, "y", 520, 1.1, 1)],
      flipBatteries: [battery(998, 430)],
      shards: [{ x: 520, y: 724 }, { x: 1220, y: 146 }, { x: 1510, y: 806 }],
      tip: "Three shards under chase pressure. The slow route is a decorative lie."
    }),
    room(35, "Red Line Contract III", {
      chase: chase(120, 15, -120, 106),
      enemies: [hunter(620, 724, 100), hunter(1180, 146, 98)],
      gates: [gate("contract-three", 1020, 520, 46, 330, 1), gate("contract-three-final", 1510, 650, 46, 330, 3)],
      flipBatteries: [battery(888, 232), battery(1378, 570)],
      tip: "Open the middle gate early or die with a perfect plan in your pocket."
    }),
    room(36, "Red Line Contract IV", {
      chase: chase(124, 15, -110, 108),
      movers: [{ x: 600, y: 720, w: 190, h: 28, axis: "y", range: 190, speed: 112 }, { x: 1120, y: 330, w: 190, h: 28, axis: "y", range: 190, speed: 120 }],
      hazards: [sentry(930, 506, "x", 430, 0.6, 1)],
      flipBatteries: [battery(1436, 770)],
      tip: "The mover is not transportation. It is a timed confession."
    }),
    room(37, "Crownless Red Vault", {
      chase: chase(128, 16, -100, 110),
      locks: [{ id: "crownless", shards: 3 }],
      gates: [gate("crownless", 1450, 130, 46, 300, 0, "crownless")],
      hazards: [sentry(720, 610, "x", 380, 0.2, 1), sentry(1160, 214, "x", 380, 1.2, -1)],
      enemies: [hunter(1010, 470, 100)],
      flipBatteries: [battery(570, 704), battery(1382, 574)],
      tip: "The crown gate wants every shard. The red line wants your spine."
    }),
    room(38, "The Bad Shortcut", {
      chase: chase(132, 16, -95, 112),
      shards: [{ x: 440, y: 724 }, { x: 900, y: 256 }, { x: 1510, y: 806 }],
      enemies: [patrol(720, 596, 102), hunter(1260, 614, 102)],
      flipBatteries: [battery(1190, 110)],
      gates: [gate("shortcut", 1020, 720, 46, 288, 2)],
      tip: "The shortcut is faster only if you are already good enough."
    }),
    room(39, "Impossible Receipt", {
      chase: chase(138, 17, -90, 116),
      hazards: [sentry(520, 742, "x", 450, 0, 1), sentry(960, 250, "y", 520, 0.8, 1), sentry(1380, 646, "x", 450, 1.6, -1)],
      enemies: [hunter(760, 596, 104), hunter(1280, 146, 100)],
      flipBatteries: [battery(1082, 430), battery(1548, 770)],
      tip: "Nothing here is optional except dying slowly."
    }),
    room(40, "The Crown Tumbler", {
      parTime: 54,
      parFlips: 9,
      chase: chase(146, 18, -80, 120),
      shards: [{ x: 470, y: 724 }, { x: 960, y: 256 }, { x: 1340, y: 614 }, { x: 1540, y: 146 }],
      locks: [{ id: "crown", shards: 4 }],
      gates: [gate("crown", 1660, 650, 46, 330, 0, "crown")],
      hazards: [sentry(700, 610, "x", 400, 0.2, 1), sentry(1160, 214, "y", 520, 1.1, 1), sentry(1420, 806, "x", 360, 1.7, -1)],
      enemies: [hunter(820, 596, 106), hunter(1260, 146, 104), patrol(1510, 806, -104)],
      movers: [{ x: 980, y: 520, w: 210, h: 28, axis: "y", range: 210, speed: 122 }],
      flipBatteries: [battery(640, 704), battery(1128, 430), battery(1450, 232)],
      tip: "Final contract. Spend nothing casually. The red line has the master key."
    })
  ];
})(window.GravityLocksmith);
