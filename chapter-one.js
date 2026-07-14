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
      hit
    } = api;

    const deathTaunts = {
      'tutorial-move': '這關的陷阱是希望你會走路。',
      'tutorial-jump': '缺口沒有變寬，你倒是掉得越來越準。',
      'tutorial-pause': '白框只是白框，是你自己第六次相信它。',
      'tutorial-missing-door': '門已經回去等你了，它甚至沒有不耐煩。',
      'tutorial-cracks': '有裂痕的那塊至少沒有騙你。'
    };

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: 0, taunt: deathTaunts[id], ...build() }),
      { id, title }
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
          say(s.doorDialogues[index]);
        }
      })),

      level('tutorial-jump', '基本跳躍', () => ({
        hint: '接下來認識跳躍。先跳上第一個平台。',
        spikeDeath: '沒有跳到平台上。',
        spawn: [70, 418],
        goal: { x: 860, y: 384, w: 46, h: 76 },
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
            say('很好。下一塊看起來也差不多。');
          }
          if (s.firstLanding && !s.platformDodged && !player.grounded && player.vx > 80 && player.x > 310) {
            s.platformDodged = true;
            trickPlatform.x += 60;
            say('……它剛才是不是也跳了一下？');
            tone(240, .06);
          }
          if (s.platformDodged && standingOn(player, trickPlatform) && !s.caughtPlatform) {
            s.caughtPlatform = true;
            say('你追上它了。繼續往門走。');
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
        crusher: { x: 0, y: 70, w: 70, h: 390, active: false },
        update(s, dt) {
          const player = getPlayer();

          if (player.x > 270 && !s.crusher.active) {
            s.crusher.active = true;
            s.crusher.x = player.x - 250;
          }
          if (!s.crusher.active) return;

          const center = player.x + player.w / 2;
          const inside = center > s.zone.x && center < s.zone.x + s.zone.w;
          const stopped = inside && player.grounded && Math.abs(player.vx) < 18;
          s.stopTime = stopped ? (s.stopTime || 0) + dt : 0;
          if (s.stopTime >= .2) s.obeyedHint = true;

          s.crusher.x += 205 * dt;
          if (player.x > s.zone.x + s.zone.w + 30) s.zone.active = false;
          if (hit(player, s.crusher)) {
            die(s.obeyedHint ? '不要永遠相信提示。' : '後面的東西追上來了。');
          }
        }
      })),

      level('tutorial-missing-door', '門呢？', () => ({
        hint: '它應該就在右邊。',
        spawn: [80, 418],
        goal: { x: 20, y: 384, w: 46, h: 76, hidden: true },
        platforms: [
          platform(0, FLOOR_Y, W, 80),
          platform(0, 0, 12, FLOOR_Y, { invisible: true }),
          platform(W - 12, 0, 12, FLOOR_Y, { invisible: true })
        ],
        spikes: [],
        update(s) {
          const player = getPlayer();
          const time = getLevelTime();

          if (!s.questionedDoor && (time >= 3.5 || (time >= 2.2 && player.x > 280))) {
            s.questionedDoor = true;
            s.questionedAt = time;
            say('……這道門在哪裡？');
          }
          if (s.questionedDoor && !s.missingNoticed && time - s.questionedAt >= 3.2) {
            s.missingNoticed = true;
            s.missingAt = time;
            s.jumpsWhenNoticed = player.jumps;
            say('門好像自己消失了。');
          }

          const jumpsSinceNotice = player.jumps - (s.jumpsWhenNoticed || 0);
          if (s.missingNoticed && jumpsSinceNotice > 0 && jumpsSinceNotice < 3 && jumpsSinceNotice !== s.lastJumpEcho) {
            s.lastJumpEcho = jumpsSinceNotice;
            tone(520 + jumpsSinceNotice * 90, .06);
          }
          if (s.missingNoticed && jumpsSinceNotice >= 3 && s.goal.hidden) {
            s.goal.hidden = false;
            say('……剛才那裡有東西亮了一下。');
            tone(540, .1);
          }

          if (s.goal.hidden && s.missingNoticed && time - s.missingAt >= 3.4 && !s.tutorialStarted) {
            s.tutorialStarted = true;
            s.tutorialAt = time;
            say('不然先來個基本教學。');
          }
          if (s.goal.hidden && s.tutorialStarted && time - s.tutorialAt >= 3.2 && !s.jumpHinted) {
            s.jumpHinted = true;
            say('說到跳躍，可以多跳幾下。');
          }
        }
      })),

      level('tutorial-cracks', '裂痕', () => ({
        hint: '有裂痕的平台，看起來不太牢靠。',
        spikeDeath: '看起來正常，不代表會接住你。',
        spawn: [55, 418],
        goal: { x: 865, y: 384, w: 46, h: 76 },
        lessonIndex: 1,
        betrayalIndex: 2,
        platforms: [
          platform(0, FLOOR_Y, 250, 80),
          platform(300, 410, 130, 24, { cracked: true }),
          platform(470, 410, 80, 24),
          platform(575, 410, 135, 24),
          platform(760, FLOOR_Y, 200, 80)
        ],
        spikes: [spike(250, 512, 510, 28)],
        update(s) {
          const player = getPlayer();
          const lesson = s.platforms[s.lessonIndex];
          const betrayal = s.platforms[s.betrayalIndex];
          const onLesson = standingOn(player, lesson);
          const onBetrayal = standingOn(player, betrayal);

          if (onLesson) s.lessonTouched = true;
          if (s.lessonTouched && !onLesson && lesson.active) {
            lesson.active = false;
            tone(100, .06);
          }
          if (onBetrayal) {
            betrayal.active = false;
            player.grounded = false;
            player.vx *= .25;
            player.vy = 170;
            if (!s.betrayed) {
              s.betrayed = true;
              say('……沒裂痕的那塊才掉了。');
            }
            tone(85, .08);
          }
        }
      }))
    ];
  };
})();
