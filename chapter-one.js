(() => {
  'use strict';

  window.createGameLevels = function createGameLevels(api) {
    const {
      W,
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      getLevelTime,
      say,
      tone,
      die,
      completeLevel,
      triggerSystemError,
      hit
    } = api;

    const deathTaunts = {
      'tutorial-move': '這關的陷阱是希望你會走路。',
      'tutorial-traps': '我介紹的是尖刺，不是讓你收集尖刺。',
      'tutorial-jump': '缺口沒有變寬，你倒是掉得越來越準。',
      'tutorial-pause': '白框只是白框，是你自己第六次相信它。'
    };

    const level = (id, title, build, metadata = {}) => Object.assign(
      () => ({ id, title, corruption: 0, taunt: deathTaunts[id], ...build() }),
      { id, title, ...metadata }
    );

    const standingOn = (player, piece) => (
      player.grounded &&
      piece.active &&
      player.x + player.w > piece.x &&
      player.x < piece.x + piece.w &&
      Math.abs(player.y + player.h - piece.y) < 5
    );

    return [
      level('tutorial-move', '左右移動', () => ({
        hint: '嗨，我是提示。接下來我會幫助你，先聽我說完。',
        spawn: [70, 418],
        goal: { x: 860, y: 384, w: 46, h: 76 },
        manualGoal: true,
        doorPositions: [70, 730, 260, 620],
        doorDialogues: [
          '很好，你有在聽。只是門跑回起點了。',
          '我沒有叫它再跑。去右邊看看。',
          '它好像知道你在找它。',
          '好，這次我看著它。應該不會再跑了。'
        ],
        platforms: [platform(0, FLOOR_Y, W, 80)],
        spikes: [],
        update(s) {
          const player = getPlayer();
          const time = getLevelTime();

          if (!s.introFinished && time >= 4.8) {
            s.introFinished = true;
            say('好了。現在先走到右邊的門。');
          }
          if (s.teleportCount > 0 && !s.waitingComment && time - s.lastTeleportAt >= 6) {
            s.waitingComment = true;
            say('你在等它自己回來嗎？它目前沒有這個打算。');
          }
          if (!hit(player, s.goal) || time < (s.touchReadyAt || 0)) return;
          if (!s.introFinished) {
            die('為什麼不理我？');
            return;
          }
          if ((s.teleportCount || 0) >= s.doorPositions.length) {
            completeLevel();
            return;
          }

          const index = s.teleportCount || 0;
          s.goal.x = s.doorPositions[index];
          s.teleportCount = index + 1;
          s.lastTeleportAt = time;
          s.waitingComment = false;
          s.touchReadyAt = time + .35;
          say(s.doorDialogues[index], 0, true);
        }
      })),

      level('tutorial-traps', '認識陷阱', () => ({
        hint: '前面的紅色尖刺是陷阱。碰到就會死亡。',
        spikeDeath: '你碰到了尖刺。它們通常不會先自我介紹。',
        spawn: [70, 418],
        goal: { x: 870, y: 384, w: 46, h: 76 },
        platforms: [platform(0, FLOOR_Y, W, 80)],
        spikes: [
          spike(350, 432, 40, 28, {
            death: {
              title: '這也撞得到？',
              reason: '你碰到了眼前的尖刺。',
              comment: '它一直都在那裡。',
              variant: 'careless'
            }
          }),
          spike(500, 432, 40, 28, {
            hidden: true,
            death: {
              title: '上當了',
              reason: '第二根尖刺突然出現。',
              comment: '我確實只介紹了第一根。',
              variant: 'tricked'
            }
          })
        ],
        update(s) {
          const player = getPlayer();
          const hiddenSpike = s.spikes[1];
          const playerCenter = player.x + player.w / 2;

          if (player.x > 170 && !s.firstInstruction) {
            s.firstInstruction = true;
            say('先跳過你看得到的那一個。', 0, true);
          }
          if (
            hiddenSpike.hidden &&
            playerCenter >= hiddenSpike.x &&
            playerCenter <= hiddenSpike.x + hiddenSpike.w
          ) {
            hiddenSpike.hidden = false;
            say('我只介紹了第一個。', 0, true);
            tone(180, .06);
          }
          if (player.x > 560 && !s.passedSpikes) {
            s.passedSpikes = true;
            say('很好。現在你認識陷阱了。');
            return;
          }
        }
      })),

      level('tutorial-jump', '基本跳躍', () => ({
        hint: '接下來認識跳躍。先跳上第一個平台。',
        spikeDeath: '沒有跳到平台上。',
        spawn: [70, 418],
        goal: { x: 860, y: 384, w: 46, h: 76, locked: true },
        firstPlatformIndex: 1,
        trickPlatformIndex: 2,
        platforms: [
          platform(0, FLOOR_Y, 220, 80),
          platform(270, 410, 120),
          platform(455, 350, 110),
          platform(700, 410, 110),
          platform(850, FLOOR_Y, 110, 80)
        ],
        spikes: [spike(220, 512, 630, 28)],
        update(s) {
          const player = getPlayer();
          const firstPlatform = s.platforms[s.firstPlatformIndex];
          const trickPlatform = s.platforms[s.trickPlatformIndex];

          if (standingOn(player, firstPlatform) && !s.firstLanding) {
            s.firstLanding = true;
            say('很好。下一塊看起來也差不多。', 0, true);
          }
          if (!s.platformDodged && !player.grounded && player.vx > 80 && player.x > 310) {
            s.platformDodged = true;
            trickPlatform.x += 60;
            say('……它剛才是不是也跳了一下？', 0, true);
            tone(240, .06);
          }
          if (s.platformDodged && standingOn(player, trickPlatform) && !s.caughtPlatform) {
            s.caughtPlatform = true;
            s.goal.locked = false;
            say('你追上它了。繼續往門走。', 0, true);
          }
        }
      })),

      level('tutorial-pause', '停一秒', () => ({
        hint: '請在前面的白框裡停一秒。',
        spawn: [70, 418],
        goal: { x: 880, y: 384, w: 46, h: 76 },
        zone: { x: 310, y: 414, w: 76, h: 46, mode: 'stop', active: true },
        platforms: [platform(0, FLOOR_Y, W, 80)],
        spikes: [],
        crusher: { x: -80, y: 70, w: 70, h: 390, active: false, speed: 330 },
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const inside = center > s.zone.x && center < s.zone.x + s.zone.w;
          const stopped = inside && player.grounded && Math.abs(player.vx) < 18;
          if (stopped) s.obeyedHint = true;

          if (!s.chaseStarted && center >= s.zone.x) {
            s.chaseStarted = true;
            s.crusher.active = true;
            tone(120, .1);
          }
          if (!s.crusher.active) return;

          s.crusher.speed = Math.min(430, s.crusher.speed + 60 * dt);
          s.crusher.x += s.crusher.speed * dt;
          if (player.x > s.zone.x + s.zone.w + 30 && s.zone.active) {
            s.zone.active = false;
            if (!s.obeyedHint) say('……你居然沒有停。', 0, true);
          }
          if (hit(player, s.crusher)) {
            die(s.obeyedHint ? '你真的照提示停下來了。' : '你中途慢下來了。');
          }
        }
      })),

      level('tutorial-missing-level', '不存在的關卡', () => ({
        hint: '因為某些錯誤，這個關卡已被刪除了。',
        spawn: [70, 418],
        goal: { x: 860, y: 384, w: 46, h: 76 },
        manualGoal: true,
        platforms: [platform(0, FLOOR_Y, W, 80)],
        spikes: [],
        update(s) {
          const player = getPlayer();
          const time = getLevelTime();

          if (!s.explained && time >= 3.8) {
            s.explained = true;
            say('……但我們還是進來了。這不應該發生。', 0, true);
          }
          if (hit(player, s.goal) && !s.doorChecked) {
            s.doorChecked = true;
            say('這道門沒有連到任何地方。', 0, true);
          }
          if (!s.errorTriggered && time >= 8.5) {
            s.errorTriggered = true;
            triggerSystemError();
          }
        }
      }), { secret: true })
    ];
  };
})();
