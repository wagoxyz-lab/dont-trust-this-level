(() => {
  'use strict';

  window.createChapterTwoLevels = function createChapterTwoLevels(api) {
    const {
      W,
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      isDialogueActive,
      say,
      tone,
      die,
      hit
    } = api;

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: 0, ...build() }),
      { id, title }
    );

    return [
      level('review-traps', '尖刺驗收', () => ({
        hint: '前面的紅色尖刺是陷阱。碰到就會死亡。',
        taunt: '它追的是一直往前跑的人。你倒是很配合。',
        spikeDeath: '你碰到了尖刺。它們通常不會先自我介紹。',
        spawn: [70, 418],
        goal: { x: 870, y: 384, w: 46, h: 76, locked: true },
        zone: { x: 400, y: 414, w: 90, h: 46, mode: 'stop', active: false },
        platforms: [platform(0, FLOOR_Y, W, 80)],
        spikes: [
          spike(350, 432, 40, 28, {
            death: {
              title: '這也撞得到？',
              reason: '你碰到了第一根尖刺。',
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
          }),
          spike(70, 0, 40, 152, {
            hidden: true,
            upside: true,
            death: {
              title: '跑得不夠快？',
              reason: '頭上的尖刺追上你了。',
              comment: '其實這次不是比賽。',
              variant: 'tricked'
            }
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const hiddenSpike = s.spikes[1];
          const ceilingSpike = s.spikes[2];
          const playerCenter = player.x + player.w / 2;

          if (player.x > 170 && !s.firstInstruction) {
            s.firstInstruction = true;
            say('先跳過你看得到的那一個。', 0, true);
          }

          if (player.x > 180 && !s.ceilingStarted) {
            s.ceilingStarted = true;
            ceilingSpike.hidden = false;
            s.zone.active = true;
            say('等一下。你頭上也多了一根。', 0, true);
            tone(150, .09);
          }

          if (s.ceilingStarted && ceilingSpike.active) {
            s.farthestX = Math.max(s.farthestX || 180, player.x);
            const progress = Math.max(0, s.farthestX - 180);
            ceilingSpike.x = player.x + player.w / 2 - ceilingSpike.w / 2;
            ceilingSpike.h = Math.min(452, 152 + progress * .59);

            if (progress > 80 && !s.speedExplained) {
              s.speedExplained = true;
              say('你跑得越遠，它就掉得越低。', 0, true);
            }

            const inside = playerCenter > s.zone.x && playerCenter < s.zone.x + s.zone.w;
            const stopped = inside && player.grounded && Math.abs(player.vx) < 18;
            s.stopTime = stopped ? (s.stopTime || 0) + dt : 0;

            if (s.stopTime >= .75) {
              ceilingSpike.active = false;
              ceilingSpike.hidden = true;
              s.zone.active = false;
              s.ceilingCleared = true;
              say('你一停下來，它就不知道該追誰了。', 0, true);
              tone(560, .1);
            } else {
              const dangerBox = {
                x: ceilingSpike.x + 5,
                y: ceilingSpike.y + 5,
                w: ceilingSpike.w - 10,
                h: ceilingSpike.h - 5
              };
              if (hit(player, dangerBox)) {
                die(ceilingSpike.death);
                return;
              }
            }
          }

          if (
            hiddenSpike.hidden &&
            playerCenter >= hiddenSpike.x &&
            playerCenter <= hiddenSpike.x + hiddenSpike.w
          ) {
            hiddenSpike.hidden = false;
            say('我還是只介紹了第一根。', 0, true);
            tone(180, .06);
          }

          if (player.x > 560 && s.ceilingCleared && !s.passedSpikes) {
            s.passedSpikes = true;
            s.unlockPending = true;
            say('好的。尖刺驗收通過，現在等我說完。');
          }

          if (s.unlockPending && !isDialogueActive()) {
            s.unlockPending = false;
            s.goal.locked = false;
            tone(660, .08);
          }
        }
      }))
    ];
  };
})();
