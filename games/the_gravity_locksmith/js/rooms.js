window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.ROOM_DEFINITIONS = [
    {
      "id": "1-the-first-tooth",
      "name": "The First Tooth",
      "parTime": 14,
      "parFlips": 1,
      "parDeaths": 0,
      "spawn": {
        "x": 48,
        "y": 888
      },
      "exit": {
        "x": 1800,
        "y": 120,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 168,
          "y": 912,
          "w": 210,
          "h": 26
        },
        {
          "x": 528,
          "y": 792,
          "w": 190,
          "h": 26
        },
        {
          "x": 864,
          "y": 648,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 312,
          "y": 192,
          "w": 210,
          "h": 26
        },
        {
          "x": 1224,
          "y": 264,
          "w": 210,
          "h": 26
        },
        {
          "x": 1560,
          "y": 192,
          "w": 210,
          "h": 26
        },
        {
          "x": 624,
          "y": 312,
          "w": 220,
          "h": 28
        }
      ],
      "shards": [
        {
          "x": 1536,
          "y": 336
        },
        {
          "x": 720,
          "y": 600
        }
      ],
      "spikes": [],
      "enemies": [],
      "movers": [],
      "flipBatteries": [],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "A short warmup. Take the shard, then leave before the vault learns your name."
    },
    {
      "id": "2-ceiling-receipt",
      "name": "Ceiling Receipt",
      "parTime": 18,
      "parFlips": 2,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 840,
          "y": 336
        },
        {
          "x": 1320,
          "y": 288
        }
      ],
      "spikes": [
        {
          "x": 288,
          "y": 984,
          "w": 528,
          "h": 24,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "The ceiling is a second floor. Flip once with intent, not panic."
    },
    {
      "id": "3-battery-primer",
      "name": "Battery Primer",
      "parTime": 19,
      "parFlips": 3,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 1180,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 440,
          "y": 988,
          "w": 680,
          "h": 20,
          "dir": -1
        },
        {
          "x": 1000,
          "y": 36,
          "w": 340,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 690,
          "y": 540,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 550,
          "y": 704,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "Batteries refill gravity charge once. Spend, refill, then commit."
    },
    {
      "id": "4-green-door-lesson",
      "name": "Green Door Lesson",
      "parTime": 22,
      "parFlips": 3,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 730,
          "y": 594
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1034,
          "y": 438,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 575,
          "y": 704,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [
        {
          "id": "lesson-gate",
          "x": 1180,
          "y": 720,
          "w": 48,
          "h": 288,
          "shards": 1,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Gates open from shard counts. The exit is easy; reaching it is the bill."
    },
    {
      "id": "5-crossbite-audit",
      "name": "Crossbite Audit",
      "parTime": 23,
      "parFlips": 3,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 1010,
          "y": 470,
          "w": 42,
          "h": 42,
          "vx": 92
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 545,
          "y": 704,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 1372,
          "y": 574,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [
        {
          "id": "bite",
          "x": 1210,
          "y": 600,
          "w": 44,
          "h": 250,
          "shards": 1,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "The guard and gate want different routes. Pick the order before you jump."
    },
    {
      "id": "6-sentry-wake",
      "name": "Sentry Wake",
      "parTime": 24,
      "parFlips": 3,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 760,
          "y": 594
        },
        {
          "x": 1380,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1390,
          "y": 570,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 500,
          "y": 704,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 910,
          "y": 478,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 480,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.4,
          "dir": 1
        }
      ],
      "tip": "Red beams blink. Move during the breath, not during the scream."
    },
    {
      "id": "7-hunter-ledger",
      "name": "Hunter Ledger",
      "parTime": 25,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1180,
          "y": 612,
          "w": 46,
          "h": 46,
          "speed": 82
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 845,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 646,
          "y": 704,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [
        {
          "id": "hunter-gate",
          "x": 1450,
          "y": 724,
          "w": 46,
          "h": 260,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Hunters drift toward you. Let gravity and spikes do some of the work."
    },
    {
      "id": "8-two-flip-lie",
      "name": "Two-Flip Lie",
      "parTime": 27,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 530,
          "y": 724
        },
        {
          "x": 1190,
          "y": 146
        },
        {
          "x": 1510,
          "y": 806
        }
      ],
      "spikes": [
        {
          "x": 350,
          "y": 988,
          "w": 850,
          "h": 20,
          "dir": -1
        },
        {
          "x": 780,
          "y": 36,
          "w": 650,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1048,
          "y": 430,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 785,
          "y": 552,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "You can spend two flips quickly. The third one must be earned."
    },
    {
      "id": "9-shard-before-safety",
      "name": "Shard Before Safety",
      "parTime": 28,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1414,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 900,
          "y": 232,
          "amount": 100
        }
      ],
      "locks": [
        {
          "id": "mid",
          "shards": 2
        }
      ],
      "gates": [
        {
          "id": "mid-gate",
          "x": 1060,
          "y": 520,
          "w": 44,
          "h": 300,
          "shards": 0,
          "lockId": "mid"
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 610,
          "y": 742,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 420,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.9,
          "dir": 1
        }
      ],
      "tip": "The safe platform is locked behind the wrong shard order."
    },
    {
      "id": "10-pendulum-battery",
      "name": "Pendulum Battery",
      "parTime": 30,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 370,
          "y": 988,
          "w": 1100,
          "h": 20,
          "dir": -1
        },
        {
          "x": 430,
          "y": 36,
          "w": 1020,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [],
      "movers": [
        {
          "x": 620,
          "y": 720,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 190,
          "speed": 84
        },
        {
          "x": 1120,
          "y": 340,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 190,
          "speed": 92
        }
      ],
      "flipBatteries": [
        {
          "x": 976,
          "y": 454,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 1362,
          "y": 296,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "The refill sits between bad cycles. Board early or wait and suffer."
    },
    {
      "id": "11-serrated-choice",
      "name": "Serrated Choice",
      "parTime": 31,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 720,
          "y": 596,
          "w": 42,
          "h": 42,
          "vx": 90
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 505,
          "y": 132,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 1048,
          "y": 430,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 1280,
          "y": 178,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.2,
          "dir": 1
        }
      ],
      "tip": "Patrol first or beam first. Both answers hurt if you hesitate."
    },
    {
      "id": "12-gate-tax",
      "name": "Gate Tax",
      "parTime": 32,
      "parFlips": 4,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1320,
          "y": 812,
          "w": 46,
          "h": 46,
          "speed": 86
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1220,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 590,
          "y": 704,
          "amount": 100
        }
      ],
      "locks": [
        {
          "id": "upper",
          "shards": 1
        }
      ],
      "gates": [
        {
          "id": "upper-gate",
          "x": 840,
          "y": 150,
          "w": 46,
          "h": 260,
          "shards": 0,
          "lockId": "upper"
        },
        {
          "id": "exit-gate",
          "x": 1510,
          "y": 780,
          "w": 46,
          "h": 230,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "One shard opens the ceiling. Two shards open the way out. Mind the hunter."
    },
    {
      "id": "13-needle-contract",
      "name": "Needle Contract",
      "parTime": 34,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 300,
          "y": 988,
          "w": 1250,
          "h": 20,
          "dir": -1
        },
        {
          "x": 560,
          "y": 36,
          "w": 920,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 810,
          "y": 552,
          "amount": 45
        },
        {
          "x": 1348,
          "y": 110,
          "amount": 35
        }
      ],
      "jumpBatteries": [
        {
          "x": 1072,
          "y": 430,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 1060,
          "y": 474,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 360,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.1,
          "dir": -1
        }
      ],
      "tip": "There are refills. They are not gifts; they are bait."
    },
    {
      "id": "14-first-red-debt",
      "name": "First Red Debt",
      "parTime": 35,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 82,
        "rampPerSecond": 8,
        "startX": -210,
        "killOffset": 82
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 930,
          "y": 470,
          "w": 42,
          "h": 42,
          "vx": 98
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1280,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [
        {
          "x": 742,
          "y": 232,
          "amount": 100
        }
      ],
      "locks": [],
      "gates": [
        {
          "id": "rush-gate",
          "x": 1440,
          "y": 694,
          "w": 46,
          "h": 284,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "First red-line test. The detour is required, and the wall does not care."
    },
    {
      "id": "15-lockstep-orchard",
      "name": "Lockstep Orchard",
      "parTime": 36,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 730,
          "y": 596,
          "w": 42,
          "h": 42,
          "vx": 92
        },
        {
          "type": "patrol",
          "x": 1290,
          "y": 616,
          "w": 42,
          "h": 42,
          "vx": -88
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 962,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "orchard",
          "shards": 2
        }
      ],
      "gates": [
        {
          "id": "orchard-gate",
          "x": 1180,
          "y": 420,
          "w": 50,
          "h": 360,
          "shards": 0,
          "lockId": "orchard"
        }
      ],
      "hazards": [],
      "tip": "Clear the patrols or route around them. Both cost time."
    },
    {
      "id": "16-dead-battery-saint",
      "name": "Dead Battery Saint",
      "parTime": 38,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 760,
          "y": 594
        },
        {
          "x": 1180,
          "y": 146
        },
        {
          "x": 1510,
          "y": 806
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 560,
          "y": 704,
          "amount": 35
        },
        {
          "x": 1488,
          "y": 770,
          "amount": 35
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 870,
          "y": 610,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 470,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.1,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1240,
          "y": 178,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 500,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.2,
          "dir": 1
        }
      ],
      "tip": "Small refills mean no waste. A sloppy flip becomes a lock."
    },
    {
      "id": "17-the-false-floor",
      "name": "The False Floor",
      "parTime": 39,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1080,
          "y": 470,
          "w": 46,
          "h": 46,
          "speed": 88
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 710,
          "y": 232,
          "amount": 45
        },
        {
          "x": 1364,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "false-floor",
          "x": 940,
          "y": 720,
          "w": 46,
          "h": 288,
          "shards": 1,
          "lockId": null
        },
        {
          "id": "final-lock",
          "x": 1510,
          "y": 120,
          "w": 46,
          "h": 260,
          "shards": 3,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "The obvious landing opens nothing. The ugly shard opens everything."
    },
    {
      "id": "18-sentry-chapel",
      "name": "Sentry Chapel",
      "parTime": 40,
      "parFlips": 5,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 450,
          "h": 20,
          "dir": -1
        },
        {
          "x": 1080,
          "y": 988,
          "w": 450,
          "h": 20,
          "dir": -1
        },
        {
          "x": 760,
          "y": 36,
          "w": 520,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 970,
          "y": 430,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 600,
          "y": 742,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 500,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1340,
          "y": 214,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 500,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.15,
          "dir": -1
        }
      ],
      "tip": "Two beams, one rhythm. Break rhythm only to recharge."
    },
    {
      "id": "19-hunter-switchback",
      "name": "Hunter Switchback",
      "parTime": 42,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 620,
          "y": 724,
          "w": 46,
          "h": 46,
          "speed": 90
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1320,
          "y": 612,
          "w": 46,
          "h": 46,
          "speed": 92
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 920,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "switchback",
          "x": 1020,
          "y": 520,
          "w": 46,
          "h": 330,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Hunters make the slow route unsafe. Make the fast route clean."
    },
    {
      "id": "20-red-line-ledger",
      "name": "Red Line Ledger",
      "parTime": 43,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 92,
        "rampPerSecond": 10,
        "startX": -190,
        "killOffset": 88
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1192,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "rush",
          "shards": 2
        }
      ],
      "gates": [
        {
          "id": "rush",
          "x": 1330,
          "y": 650,
          "w": 46,
          "h": 330,
          "shards": 0,
          "lockId": "rush"
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 880,
          "y": 480,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 390,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.6,
          "dir": 1
        }
      ],
      "tip": "The red line turns waiting into a mistake. Solve while moving."
    },
    {
      "id": "21-three-key-feeling",
      "name": "Three-Key Feeling",
      "parTime": 44,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 520,
          "y": 724
        },
        {
          "x": 960,
          "y": 256
        },
        {
          "x": 1370,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 770,
          "y": 552,
          "amount": 45
        },
        {
          "x": 1210,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "deep",
          "shards": 3
        }
      ],
      "gates": [
        {
          "id": "deep-gate",
          "x": 1510,
          "y": 166,
          "w": 46,
          "h": 260,
          "shards": 0,
          "lockId": "deep"
        }
      ],
      "hazards": [],
      "tip": "No keys, just consequences. Three shards before the clean exit lane."
    },
    {
      "id": "22-beam-court",
      "name": "Beam Court",
      "parTime": 46,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 720,
          "y": 596,
          "w": 42,
          "h": 42,
          "vx": 94
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1235,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 500,
          "y": 204,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.3,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 960,
          "y": 602,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 430,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1450,
          "y": 812,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 460,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.6,
          "dir": -1
        }
      ],
      "tip": "Every safe square expires. Move like you meant to be there."
    },
    {
      "id": "23-gravity-usury",
      "name": "Gravity Usury",
      "parTime": 47,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 920,
          "y": 596,
          "w": 46,
          "h": 46,
          "speed": 92
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 500,
          "y": 132,
          "amount": 35
        },
        {
          "x": 1064,
          "y": 430,
          "amount": 35
        },
        {
          "x": 1490,
          "y": 770,
          "amount": 35
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "usury",
          "x": 1260,
          "y": 612,
          "w": 46,
          "h": 300,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "The room lends charge in pieces and charges interest in panic."
    },
    {
      "id": "24-red-thread-needle",
      "name": "Red Thread Needle",
      "parTime": 48,
      "parFlips": 6,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 98,
        "rampPerSecond": 11,
        "startX": -170,
        "killOffset": 92
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 966,
          "y": 232,
          "amount": 45
        },
        {
          "x": 1458,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 730,
          "y": 610,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 420,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.5,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1230,
          "y": 204,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.2,
          "dir": 1
        }
      ],
      "tip": "A chase with beams is a puzzle at sprint speed. Read two moves ahead."
    },
    {
      "id": "25-black-ferry",
      "name": "Black Ferry",
      "parTime": 50,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [
        {
          "x": 520,
          "y": 720,
          "w": 190,
          "h": 28,
          "axis": "x",
          "range": 180,
          "speed": 96
        },
        {
          "x": 920,
          "y": 520,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 210,
          "speed": 102
        },
        {
          "x": 1320,
          "y": 300,
          "w": 190,
          "h": 28,
          "axis": "x",
          "range": 180,
          "speed": 96
        }
      ],
      "flipBatteries": [
        {
          "x": 1212,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 1030,
          "y": 478,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 360,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.2,
          "dir": -1
        }
      ],
      "tip": "The ferry does not wait. Neither does the laser."
    },
    {
      "id": "26-predator-lattice",
      "name": "Predator Lattice",
      "parTime": 51,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 520,
          "y": 724,
          "w": 46,
          "h": 46,
          "speed": 92
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1020,
          "y": 468,
          "w": 46,
          "h": 46,
          "speed": 96
        },
        {
          "type": "patrol",
          "x": 1430,
          "y": 806,
          "w": 42,
          "h": 42,
          "vx": -90
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 804,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "lattice",
          "x": 1260,
          "y": 120,
          "w": 46,
          "h": 300,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Two hunters make hesitation louder than movement."
    },
    {
      "id": "27-locked-pendulum",
      "name": "Locked Pendulum",
      "parTime": 52,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [
        {
          "x": 650,
          "y": 730,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 210,
          "speed": 96
        },
        {
          "x": 1110,
          "y": 330,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 210,
          "speed": 108
        }
      ],
      "flipBatteries": [
        {
          "x": 956,
          "y": 454,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "pendulum-lock",
          "x": 1450,
          "y": 700,
          "w": 46,
          "h": 300,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 1280,
          "y": 178,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 420,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.4,
          "dir": -1
        }
      ],
      "tip": "Open the lock before the good platform cycle leaves you behind."
    },
    {
      "id": "28-red-line-backpay",
      "name": "Red Line Backpay",
      "parTime": 54,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 104,
        "rampPerSecond": 12,
        "startX": -155,
        "killOffset": 96
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 430,
          "y": 724
        },
        {
          "x": 1160,
          "y": 146
        },
        {
          "x": 1510,
          "y": 806
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1000,
          "y": 470,
          "w": 46,
          "h": 46,
          "speed": 94
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 872,
          "y": 552,
          "amount": 45
        },
        {
          "x": 1352,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "The first shard is behind schedule. Make the backtrack surgical."
    },
    {
      "id": "29-sentry-mill",
      "name": "Sentry Mill",
      "parTime": 55,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 790,
          "y": 552,
          "amount": 45
        },
        {
          "x": 1216,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "mill",
          "x": 1510,
          "y": 650,
          "w": 46,
          "h": 340,
          "shards": 3,
          "lockId": null
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 520,
          "y": 742,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 380,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 920,
          "y": 250,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 500,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.8,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1320,
          "y": 646,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 380,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.6,
          "dir": -1
        }
      ],
      "tip": "Three shards, three beams, one bad habit to unlearn."
    },
    {
      "id": "30-hunter-tithe",
      "name": "Hunter Tithe",
      "parTime": 57,
      "parFlips": 7,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 330,
          "y": 988,
          "w": 1160,
          "h": 20,
          "dir": -1
        },
        {
          "x": 680,
          "y": 36,
          "w": 840,
          "h": 20,
          "dir": 1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 560,
          "y": 724,
          "w": 46,
          "h": 46,
          "speed": 96
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 940,
          "y": 596,
          "w": 46,
          "h": 46,
          "speed": 98
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1320,
          "y": 146,
          "w": 46,
          "h": 46,
          "speed": 94
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1138,
          "y": 430,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [],
      "tip": "Every hunter can become a problem or a solution. Use the spikes."
    },
    {
      "id": "31-the-door-that-chases",
      "name": "The Door That Chases",
      "parTime": 58,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 108,
        "rampPerSecond": 13,
        "startX": -150,
        "killOffset": 100
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1198,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "door",
          "shards": 2
        }
      ],
      "gates": [
        {
          "id": "door",
          "x": 1320,
          "y": 640,
          "w": 46,
          "h": 340,
          "shards": 0,
          "lockId": "door"
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 850,
          "y": 478,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 440,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.8,
          "dir": 1
        }
      ],
      "tip": "The door opens late. The red line arrives early. Reconcile that."
    },
    {
      "id": "32-no-spare-landing",
      "name": "No Spare Landing",
      "parTime": 59,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": false,
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 1000,
          "y": 470,
          "w": 42,
          "h": 42,
          "vx": 100
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 552,
          "y": 704,
          "amount": 35
        },
        {
          "x": 1492,
          "y": 120,
          "amount": 35
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 760,
          "y": 610,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 360,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.4,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1180,
          "y": 214,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 360,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.4,
          "dir": -1
        }
      ],
      "tip": "There is no neutral landing. Every stop must pay for the next mistake."
    },
    {
      "id": "33-red-line-contract-i",
      "name": "Red Line Contract I",
      "parTime": 61,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 112,
        "rampPerSecond": 13,
        "startX": -140,
        "killOffset": 100
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1040,
          "y": 470,
          "w": 46,
          "h": 46,
          "speed": 96
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 772,
          "y": 552,
          "amount": 45
        },
        {
          "x": 1298,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "contract-one",
          "x": 1450,
          "y": 700,
          "w": 46,
          "h": 300,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Late contracts start here. The route is a fuse."
    },
    {
      "id": "34-red-line-contract-ii",
      "name": "Red Line Contract II",
      "parTime": 62,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 116,
        "rampPerSecond": 14,
        "startX": -130,
        "killOffset": 104
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 520,
          "y": 724
        },
        {
          "x": 1220,
          "y": 146
        },
        {
          "x": 1510,
          "y": 806
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [],
      "flipBatteries": [
        {
          "x": 998,
          "y": 430,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 620,
          "y": 742,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 460,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.2,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1270,
          "y": 190,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.1,
          "dir": 1
        }
      ],
      "tip": "Three shards under chase pressure. The slow route is a decorative lie."
    },
    {
      "id": "35-red-line-contract-iii",
      "name": "Red Line Contract III",
      "parTime": 63,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 120,
        "rampPerSecond": 15,
        "startX": -120,
        "killOffset": 106
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 620,
          "y": 724,
          "w": 46,
          "h": 46,
          "speed": 100
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1180,
          "y": 146,
          "w": 46,
          "h": 46,
          "speed": 98
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 888,
          "y": 232,
          "amount": 45
        },
        {
          "x": 1378,
          "y": 570,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "contract-three",
          "x": 1020,
          "y": 520,
          "w": 46,
          "h": 330,
          "shards": 1,
          "lockId": null
        },
        {
          "id": "contract-three-final",
          "x": 1510,
          "y": 650,
          "w": 46,
          "h": 330,
          "shards": 3,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "Open the middle gate early or die with a perfect plan in your pocket."
    },
    {
      "id": "36-red-line-contract-iv",
      "name": "Red Line Contract IV",
      "parTime": 65,
      "parFlips": 8,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 124,
        "rampPerSecond": 15,
        "startX": -110,
        "killOffset": 108
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 594
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [],
      "movers": [
        {
          "x": 600,
          "y": 720,
          "w": 190,
          "h": 28,
          "axis": "y",
          "range": 190,
          "speed": 112
        },
        {
          "x": 1120,
          "y": 330,
          "w": 190,
          "h": 28,
          "axis": "y",
          "range": 190,
          "speed": 120
        }
      ],
      "flipBatteries": [
        {
          "x": 1436,
          "y": 770,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 930,
          "y": 506,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 430,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.6,
          "dir": 1
        }
      ],
      "tip": "The mover is not transportation. It is a timed confession."
    },
    {
      "id": "37-crownless-red-vault",
      "name": "Crownless Red Vault",
      "parTime": 66,
      "parFlips": 9,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 128,
        "rampPerSecond": 16,
        "startX": -100,
        "killOffset": 110
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 872,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 788,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 620,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 530,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 640,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 859,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 209,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 291,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 208,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 241,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 614
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 360,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 1010,
          "y": 470,
          "w": 46,
          "h": 46,
          "speed": 100
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 570,
          "y": 704,
          "amount": 45
        },
        {
          "x": 1382,
          "y": 574,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "crownless",
          "shards": 3
        }
      ],
      "gates": [
        {
          "id": "crownless",
          "x": 1450,
          "y": 130,
          "w": 46,
          "h": 300,
          "shards": 0,
          "lockId": "crownless"
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 720,
          "y": 610,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 380,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.2,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1160,
          "y": 214,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 380,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.2,
          "dir": -1
        }
      ],
      "tip": "The crown gate wants every shard. The red line wants your spine."
    },
    {
      "id": "38-the-bad-shortcut",
      "name": "The Bad Shortcut",
      "parTime": 67,
      "parFlips": 9,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 132,
        "rampPerSecond": 16,
        "startX": -95,
        "killOffset": 112
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 854,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 806,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 602,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 548,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 622,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 868,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 218,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 282,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 226,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 232,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 440,
          "y": 724
        },
        {
          "x": 900,
          "y": 256
        },
        {
          "x": 1510,
          "y": 806
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 440,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 440,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "patrol",
          "x": 720,
          "y": 596,
          "w": 42,
          "h": 42,
          "vx": 102
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1260,
          "y": 614,
          "w": 46,
          "h": 46,
          "speed": 102
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1190,
          "y": 110,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [
        {
          "id": "shortcut",
          "x": 1020,
          "y": 720,
          "w": 46,
          "h": 288,
          "shards": 2,
          "lockId": null
        }
      ],
      "hazards": [],
      "tip": "The shortcut is faster only if you are already good enough."
    },
    {
      "id": "39-impossible-receipt",
      "name": "Impossible Receipt",
      "parTime": 69,
      "parFlips": 9,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 86,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 138,
        "rampPerSecond": 17,
        "startX": -90,
        "killOffset": 116
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 836,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 824,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 584,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 566,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 604,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 877,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 227,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 273,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 244,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 223,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 820,
          "y": 256
        },
        {
          "x": 1290,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 520,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 260,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 330,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 760,
          "y": 596,
          "w": 46,
          "h": 46,
          "speed": 104
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1280,
          "y": 146,
          "w": 46,
          "h": 46,
          "speed": 100
        }
      ],
      "movers": [],
      "flipBatteries": [
        {
          "x": 1082,
          "y": 430,
          "amount": 45
        },
        {
          "x": 1548,
          "y": 770,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [],
      "gates": [],
      "hazards": [
        {
          "type": "sentry",
          "x": 520,
          "y": 742,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 450,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 960,
          "y": 250,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.8,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1380,
          "y": 646,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 450,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.6,
          "dir": -1
        }
      ],
      "tip": "Nothing here is optional except dying slowly."
    },
    {
      "id": "40-the-crown-tumbler",
      "name": "The Crown Tumbler",
      "parTime": 54,
      "parFlips": 9,
      "parDeaths": 0,
      "spawn": {
        "x": 104,
        "y": 900
      },
      "exit": {
        "x": 1760,
        "y": 824,
        "w": 84,
        "h": 140
      },
      "chase": {
        "baseSpeed": 146,
        "rampPerSecond": 18,
        "startX": -80,
        "killOffset": 120
      },
      "platforms": [
        {
          "x": 0,
          "y": 1008,
          "w": 1920,
          "h": 72
        },
        {
          "x": 0,
          "y": 0,
          "w": 1920,
          "h": 36
        },
        {
          "x": 145,
          "y": 890,
          "w": 210,
          "h": 26
        },
        {
          "x": 430,
          "y": 770,
          "w": 190,
          "h": 26
        },
        {
          "x": 720,
          "y": 638,
          "w": 200,
          "h": 26
        },
        {
          "x": 1010,
          "y": 512,
          "w": 200,
          "h": 26
        },
        {
          "x": 1300,
          "y": 658,
          "w": 200,
          "h": 26
        },
        {
          "x": 1575,
          "y": 850,
          "w": 220,
          "h": 26
        },
        {
          "x": 430,
          "y": 200,
          "w": 210,
          "h": 26
        },
        {
          "x": 790,
          "y": 300,
          "w": 210,
          "h": 26
        },
        {
          "x": 1160,
          "y": 190,
          "w": 210,
          "h": 26
        },
        {
          "x": 1510,
          "y": 250,
          "w": 210,
          "h": 26
        }
      ],
      "shards": [
        {
          "x": 470,
          "y": 724
        },
        {
          "x": 960,
          "y": 256
        },
        {
          "x": 1340,
          "y": 614
        },
        {
          "x": 1540,
          "y": 146
        }
      ],
      "spikes": [
        {
          "x": 360,
          "y": 988,
          "w": 280,
          "h": 20,
          "dir": -1
        },
        {
          "x": 870,
          "y": 36,
          "w": 350,
          "h": 20,
          "dir": 1
        },
        {
          "x": 1320,
          "y": 988,
          "w": 220,
          "h": 20,
          "dir": -1
        }
      ],
      "enemies": [
        {
          "type": "hunter",
          "axis": "x",
          "x": 820,
          "y": 596,
          "w": 46,
          "h": 46,
          "speed": 106
        },
        {
          "type": "hunter",
          "axis": "x",
          "x": 1260,
          "y": 146,
          "w": 46,
          "h": 46,
          "speed": 104
        },
        {
          "type": "patrol",
          "x": 1510,
          "y": 806,
          "w": 42,
          "h": 42,
          "vx": -104
        }
      ],
      "movers": [
        {
          "x": 980,
          "y": 520,
          "w": 210,
          "h": 28,
          "axis": "y",
          "range": 210,
          "speed": 122
        }
      ],
      "flipBatteries": [
        {
          "x": 640,
          "y": 704,
          "amount": 45
        },
        {
          "x": 1128,
          "y": 430,
          "amount": 45
        },
        {
          "x": 1450,
          "y": 232,
          "amount": 45
        }
      ],
      "jumpBatteries": [],
      "locks": [
        {
          "id": "crown",
          "shards": 4
        }
      ],
      "gates": [
        {
          "id": "crown",
          "x": 1660,
          "y": 650,
          "w": 46,
          "h": 330,
          "shards": 0,
          "lockId": "crown"
        }
      ],
      "hazards": [
        {
          "type": "sentry",
          "x": 700,
          "y": 610,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 400,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 0.2,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1160,
          "y": 214,
          "w": 42,
          "h": 42,
          "axis": "y",
          "length": 520,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.1,
          "dir": 1
        },
        {
          "type": "sentry",
          "x": 1420,
          "y": 806,
          "w": 42,
          "h": 42,
          "axis": "x",
          "length": 360,
          "thickness": 18,
          "period": 2.3,
          "activeTime": 1.05,
          "phase": 1.7,
          "dir": -1
        }
      ],
      "tip": "Final contract. Spend nothing casually. The red line has the master key."
    }
  ];
})(window.GravityLocksmith);
