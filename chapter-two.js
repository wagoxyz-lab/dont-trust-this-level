(() => {
  'use strict';

  window.createChapterTwoLevels = function createChapterTwoLevels(api) {
    const {
      W,
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      say,
      tone,
      die,
      completeLevel,
      hit
    } = api;

    const fallingSpikeCount = 18;
    const fakeSpikeIndices = [7, 8, 9];
    const createFallingSpikes = () => Array.from({ length: fallingSpikeCount }, (_, index) => (
      spike(2 + index * 54, -32, 40, 28, {
        hidden: true,
        upside: true,
        falling: true,
        fakeDrop: fakeSpikeIndices.includes(index),
        dropDelay: .75 + index * .06,
        death: {
          title: '沒有比較快',
          reason: '你碰到了正在掉落的尖刺。',
          comment: '它掉得比你跑得快。',
          variant: 'tricked'
        }
      })
    ));

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: 0, ...build() }),
      { id, title }
    );

    const standingOn = (player, piece) => (
      player.grounded &&
      piece.active &&
      player.x + player.w > piece.x &&
      player.x < piece.x + piece.w &&
      Math.abs(player.y + player.h - piece.y) < 6
    );

    return [
      level('review-traps', '尖刺驗收', () => ({
        hint: '前面的紅色尖刺是陷阱。碰到就會死亡。',
        taunt: '一直往前跑，剛好每一根都接得到你。',
        spikeDeath: '你碰到了尖刺。它們通常不會先自我介紹。',
        spawn: [70, 418],
        goal: { x: 870, y: 384, w: 46, h: 76, locked: true },
        fallingStartIndex: 2,
        fakeSpikeIndices: [...fakeSpikeIndices],
        safeMiddle: { from: 410, to: 520 },
        dropStartY: -32,
        dropSpeed: 460,
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
          spike(810, 432, 40, 28, {
            hidden: true,
            death: {
              title: '上當了',
              reason: '第二根尖刺突然出現。',
              comment: '我確實只介紹了第一根。',
              variant: 'tricked'
            }
          }),
          ...createFallingSpikes()
        ],
        update(s, dt) {
          const player = getPlayer();
          const hiddenSpike = s.spikes[1];
          const fallingSpikes = s.spikes.slice(s.fallingStartIndex);
          const playerCenter = player.x + player.w / 2;

          fallingSpikes.forEach(item => {
            if (!item.vanishing) return;
            item.vanishTimer -= dt;
            if (item.vanishTimer <= 0) {
              item.vanishing = false;
              item.hidden = true;
            }
          });

          if (player.x > 170 && !s.firstInstruction) {
            s.firstInstruction = true;
            say('先跳過你看得到的那一個。', 0, true);
          }

          if (player.x > 90 && !s.dropStarted) {
            s.dropStarted = true;
            s.dropTime = 0;
            say('注意頭上。', 0, true);
            tone(150, .09);
          }

          if (s.dropStarted && !s.dropFinished) {
            s.dropTime += dt;
            if (!s.dropWarningShown && s.dropTime >= fallingSpikes[0].dropDelay) {
              s.dropWarningShown = true;
              say('尖刺掉下來了！', 0, true);
              tone(240, .1);
            }
            fallingSpikes.forEach(item => {
              if (!item.active) return;
              const fallingFor = s.dropTime - item.dropDelay;
              if (fallingFor < 0) return;
              item.hidden = false;
              item.y = s.dropStartY + fallingFor * s.dropSpeed;
            });

            const slowingInMiddle = (
              playerCenter >= s.safeMiddle.from &&
              playerCenter <= s.safeMiddle.to &&
              Math.abs(player.vx) < 80
            );
            if (slowingInMiddle) s.middleReady = true;
            fallingSpikes.forEach(item => {
              if (
                item.active &&
                item.fakeDrop &&
                s.middleReady &&
                item.y + item.h >= player.y - 8
              ) {
                item.y = player.y - item.h - 8;
                item.active = false;
                item.vanishing = true;
                item.vanishDuration = .45;
                item.vanishTimer = item.vanishDuration;
                item.clearedFake = true;
                tone(560, .06);
              }
              if (item.active && item.y > FLOOR_Y + 100) {
                item.active = false;
                item.hidden = true;
              }
            });

            const middleCleared = s.fakeSpikeIndices.every(index => fallingSpikes[index].clearedFake);
            if (middleCleared && !s.middleCleared) {
              s.middleCleared = true;
              say('中間那三根……自己消失了。', 0, true);
            }

            if (fallingSpikes.every(item => !item.active && !item.vanishing)) {
              if (s.middleCleared) {
                s.dropFinished = true;
                s.ceilingCleared = true;
                s.goal.locked = false;
                say('好。剩下的你應該記得。', 0, true);
              } else {
                s.dropFinished = true;
              }
            }
          }

          if (
            hiddenSpike.hidden &&
            playerCenter >= hiddenSpike.x &&
            playerCenter <= hiddenSpike.x + hiddenSpike.w
          ) {
            hiddenSpike.hidden = false;
            say('驚喜。', 0, true);
            tone(180, .06);
          }
        }
      })),

      level('review-jumps', '跳躍驗收', () => ({
        width: 1600,
        hint: '接下來是跳躍驗收。照剛才學過的方式前進。',
        taunt: '驗收結果很穩定：你每次都相信同一塊地板。',
        spikeDeath: '你沒有落在下一個平台上。',
        spawn: [70, 418],
        goal: { x: 1510, y: 384, w: 46, h: 76 },
        firstPlatformIndex: 1,
        movingPlatformIndex: 2,
        thirdPlatformIndex: 3,
        trapFloorIndex: 5,
        trapSpikeIndex: 3,
        movingPlatformPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 220, 80),
          platform(270, 410, 120),
          platform(455, 350, 110),
          platform(700, 410, 110),
          platform(850, FLOOR_Y, 130, 80),
          platform(980, FLOOR_Y, 135, 80),
          platform(1115, FLOOR_Y, 485, 80)
        ],
        spikes: [
          spike(220, 512, 235, 28, {
            death: {
              title: '落點錯誤',
              reason: '你沒有落在下一個平台上。',
              comment: '這是跳躍驗收。',
              variant: 'careless'
            }
          }),
          spike(450, 512, 130, 28, {
            death: {
              title: '平台不等人',
              reason: '你跟著下沉的平台掉進了尖刺。',
              comment: '移動方向不只一種。',
              variant: 'tricked'
            }
          }),
          spike(565, 512, 285, 28, {
            death: {
              title: '落點錯誤',
              reason: '你沒有落在下一個平台上。',
              comment: '這是跳躍驗收。',
              variant: 'careless'
            }
          }),
          spike(980, 512, 135, 28, {
            hidden: true,
            death: {
              title: '普通地板',
              reason: '你踩著那塊地板一起掉了下去。',
              comment: '驗收紀錄上沒有這一項。',
              variant: 'tricked'
            }
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const firstPlatform = s.platforms[s.firstPlatformIndex];
          const movingPlatform = s.platforms[s.movingPlatformIndex];
          const thirdPlatform = s.platforms[s.thirdPlatformIndex];
          const trapFloor = s.platforms[s.trapFloorIndex];
          const trapSpike = s.spikes[s.trapSpikeIndex];
          const playerCenter = player.x + player.w / 2;

          if (standingOn(player, firstPlatform) && !s.firstLanding) {
            s.firstLanding = true;
            say('很好，繼續保持。', 0, true);
          }

          if (
            s.movingPlatformPhase === 'idle' &&
            !player.grounded &&
            player.vx > 80 &&
            player.x > 340 &&
            player.x < movingPlatform.x
          ) {
            s.movingPlatformPhase = 'dropping';
            s.platformReactionTimer = .18;
            tone(210, .07);
          }

          if (s.platformReactionTimer > 0) {
            s.platformReactionTimer -= dt;
            if (s.platformReactionTimer <= 0 && !s.platformReacted) {
              s.platformReacted = true;
              say('……它不該往那邊。', 0, true);
            }
          }

          if (s.movingPlatformPhase === 'dropping') {
            movingPlatform.y = Math.min(405, movingPlatform.y + 340 * dt);
            if (movingPlatform.y >= 405) s.movingPlatformPhase = 'armed';
          }

          if (s.movingPlatformPhase === 'armed' && standingOn(player, movingPlatform)) {
            s.movingPlatformPhase = 'waiting';
            s.sinkTimer = .28;
            say('先繼續。這不影響驗收。', 0, true);
          }

          if (s.movingPlatformPhase === 'waiting') {
            s.sinkTimer -= dt;
            if (s.sinkTimer <= 0) {
              s.movingPlatformPhase = 'sinking';
              say('別站太久。', 0, true);
              tone(130, .08);
            }
          }

          if (s.movingPlatformPhase === 'sinking') {
            const wasStanding = standingOn(player, movingPlatform);
            const previousY = movingPlatform.y;
            movingPlatform.y += 240 * dt;
            if (wasStanding) player.y += movingPlatform.y - previousY;
            if (movingPlatform.y > 500) {
              movingPlatform.active = false;
              s.movingPlatformPhase = 'gone';
            }
          }

          if (standingOn(player, thirdPlatform) && !s.thirdLanding) {
            s.thirdLanding = true;
            say('很好。後面是普通地板。', 0, true);
          }

          if (!s.trapFloorTriggered && playerCenter >= 995) {
            s.trapFloorTriggered = true;
            s.trapFloorTimer = .09;
            trapFloor.cracked = true;
            tone(180, .06);
          }

          if (s.trapFloorTriggered && !s.trapFloorFalling) {
            s.trapFloorTimer -= dt;
            if (s.trapFloorTimer <= 0) {
              s.trapFloorFalling = true;
              trapSpike.hidden = false;
            }
          }

          if (s.trapFloorFalling && trapFloor.active) {
            const wasStanding = standingOn(player, trapFloor);
            const previousY = trapFloor.y;
            trapFloor.y += 760 * dt;
            if (wasStanding) player.y += trapFloor.y - previousY;
            if (trapFloor.y > FLOOR_Y + 110) trapFloor.active = false;
          }

          if (s.trapFloorTriggered && player.x > 1130 && !s.floorAnomalyNoticed) {
            s.floorAnomalyNoticed = true;
            say('……那塊不對。', 0, true);
          }
        }
      })),

      level('review-reactions', '反應驗收', () => ({
        width: 1800,
        hint: '反應驗收。看到不對就跳。',
        taunt: '反應很快。主要是每次都往同一個錯誤反應。',
        spawn: [70, 418],
        goal: { x: 1710, y: 384, w: 46, h: 76 },
        manualGoal: true,
        fallingPanelIndices: [1, 3],
        collapseFloorIndices: [0, 1, 2, 3, 4, 5, 6],
        collapseJumpZone: { from: 950, to: 1756 },
        collapseJumpBaseline: 0,
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(300, FLOOR_Y, 110, 80, { trapPanel: true, phase: 'idle', triggerX: 320, spikeIndex: 0 }),
          platform(410, FLOOR_Y, 240, 80),
          platform(650, FLOOR_Y, 110, 80, { trapPanel: true, phase: 'idle', triggerX: 670, spikeIndex: 1 }),
          platform(760, FLOOR_Y, 350, 80),
          platform(1110, FLOOR_Y, 180, 80),
          platform(1290, FLOOR_Y, 510, 80)
        ],
        spikes: [
          spike(300, 512, 110, 28, {
            hidden: true,
            death: {
              title: '反應太慢',
              reason: '普通地板在你腳下掉了下去。',
              comment: '下一次可以早一點跳。',
              variant: 'tricked'
            }
          }),
          spike(650, 512, 110, 28, {
            hidden: true,
            death: {
              title: '又是地板',
              reason: '第二塊地板也掉了下去。',
              comment: '至少規則看起來很一致。',
              variant: 'tricked'
            }
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const playerCenter = player.x + player.w / 2;

          if (hit(player, s.goal)) {
            completeLevel();
            return;
          }

          s.fallingPanelIndices.forEach((platformIndex, order) => {
            const piece = s.platforms[platformIndex];
            const danger = s.spikes[piece.spikeIndex];

            if (piece.phase === 'idle' && playerCenter >= piece.triggerX) {
              piece.phase = 'warning';
              piece.warningTimer = .08;
              piece.cracked = true;
              tone(170, .05);
            }
            if (piece.phase === 'warning') {
              piece.warningTimer -= dt;
              if (piece.warningTimer <= 0) {
                piece.phase = 'falling';
                danger.hidden = false;
              }
            }
            if (piece.phase === 'falling') {
              const wasStanding = standingOn(player, piece);
              const previousY = piece.y;
              piece.y += 720 * dt;
              if (wasStanding) player.y += piece.y - previousY;
              if (piece.y > FLOOR_Y + 110) {
                piece.active = false;
                piece.phase = 'gone';
              }
            }

            const passedX = order === 0 ? 430 : 780;
            const memoryKey = order === 0 ? 'firstPanelPassed' : 'secondPanelPassed';
            if (player.x > passedX && !s[memoryKey]) {
              s[memoryKey] = true;
              say(order === 0 ? '對，就是這樣。' : '反應很快。保持下去。', 0, true);
            }
          });

          if (!s.floorCollapseTriggered && player.grounded) {
            s.collapseJumpBaseline = player.jumps;
          }
          const insideCollapseJumpZone = (
            playerCenter >= s.collapseJumpZone.from &&
            playerCenter <= s.collapseJumpZone.to
          );
          const jumpedSinceLastLanding = player.jumps > s.collapseJumpBaseline;
          if (
            !s.floorCollapseTriggered &&
            !player.grounded &&
            jumpedSinceLastLanding &&
            insideCollapseJumpZone
          ) {
            s.floorCollapseTriggered = true;
            s.floorCollapseTimer = .18;
            s.screenShake = .05;
            s.collapseFloorIndices.forEach(index => {
              const piece = s.platforms[index];
              if (piece.active) piece.cracked = true;
            });
            say('……你跳得有這麼重嗎？', 0, true);
            tone(145, .08);
          }
          if (s.floorCollapseTriggered && !s.wholeFloorGone) {
            s.floorCollapseTimer -= dt;
            if (s.floorCollapseTimer <= 0) {
              s.wholeFloorGone = true;
              s.collapseFloorIndices.forEach(index => {
                s.platforms[index].active = false;
              });
              s.screenShake = .12;
              tone(85, .14);
            }
          }
          if (s.wholeFloorGone && player.y > FLOOR_Y + 35 && !s.collapseDeathStarted) {
            s.collapseDeathStarted = true;
            die({
              title: '超過承重上限',
              reason: '你一跳，所有地板就整片消失了。',
              comment: '它平常只承受得住走路的重量。',
              variant: 'tricked'
            });
          }
          s.screenShake = Math.max(0, (s.screenShake || 0) - dt);

        }
      })),

      level('review-route', '綜合驗收 1', () => ({
        width: 2250,
        hint: '路線驗收。這次沒有岔路，一直往右。',
        taunt: '每個陷阱都只做同一件事，是你每次都重新相信它。',
        spawn: [70, 418],
        goal: { x: 2160, y: 384, w: 46, h: 76 },
        hiddenLandingSpikeIndex: 2,
        firstPlatformIndex: 1,
        runnerPlatformIndex: 2,
        falseHintPlatformIndex: 3,
        runnerPhase: 'waiting',
        falseHintPhase: 'idle',
        safeMiddle: { from: 380, to: 420 },
        platforms: [
          platform(0, FLOOR_Y, 650, 80),
          platform(720, 410, 120),
          platform(900, 350, 100, 24, { runner: true }),
          platform(1120, 410, 120),
          platform(1375, 350, 100),
          platform(1560, 410, 110),
          platform(1740, FLOOR_Y, 510, 80)
        ],
        spikes: [
          spike(330, 432, 40, 28, {
            death: {
              title: '看得很清楚',
              reason: '你碰到了第一根看得見的尖刺。',
              comment: '它從頭到尾都沒有動。',
              variant: 'careless'
            }
          }),
          spike(430, 432, 40, 28, {
            death: {
              title: '看得很清楚',
              reason: '你碰到了第二根看得見的尖刺。',
              comment: '兩根確實離得很近。',
              variant: 'careless'
            }
          }),
          spike(480, 432, 40, 28, {
            hidden: true,
            death: {
              title: '一次跳完',
              reason: '你想一次越過兩根，落點才冒出第三根。',
              comment: '中間那一小段，剛好站得下。',
              variant: 'tricked'
            }
          }),
          spike(650, 512, 250, 28, {
            death: {
              title: '第一步就落空',
              reason: '你沒有落上第一塊平台。',
              comment: '後面的平台還沒機會動。',
              variant: 'careless'
            }
          }),
          spike(890, 512, 230, 28, {
            death: {
              title: '平台拒絕接人',
              reason: '你起跳時，下一塊平台往右邊躲開了。',
              comment: '它只躲第一次。',
              variant: 'tricked'
            }
          }),
          spike(1110, 512, 450, 28, {
            death: {
              title: '提示有用',
              reason: '你先試跳，腳下的平台就撐不住了。',
              comment: '這一次，猶豫比較重。',
              variant: 'tricked'
            }
          }),
          spike(1550, 512, 190, 28, {
            death: {
              title: '最後幾步',
              reason: '你沒有落上最後的平台。',
              comment: '這一段沒有額外規則。',
              variant: 'careless'
            }
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const playerCenter = player.x + player.w / 2;
          const hiddenLandingSpike = s.spikes[s.hiddenLandingSpikeIndex];
          const firstPlatform = s.platforms[s.firstPlatformIndex];
          const runnerPlatform = s.platforms[s.runnerPlatformIndex];
          const falseHintPlatform = s.platforms[s.falseHintPlatformIndex];

          if (player.x > 250 && !s.firstSpikesNoticed) {
            s.firstSpikesNoticed = true;
            say('兩根很近。', 0, true);
          }
          if (
            player.grounded &&
            playerCenter >= s.safeMiddle.from &&
            playerCenter <= s.safeMiddle.to &&
            !s.usedSpikeMiddle
          ) {
            s.usedSpikeMiddle = true;
            say('你選擇分開處理。', 0, true);
          }
          if (
            hiddenLandingSpike.hidden &&
            !s.usedSpikeMiddle &&
            !player.grounded &&
            playerCenter >= 430
          ) {
            hiddenLandingSpike.hidden = false;
            tone(170, .06);
          }

          if (standingOn(player, firstPlatform) && !s.runnerArmed) {
            s.runnerArmed = true;
            s.runnerJumpBaseline = player.jumps;
            say('下一塊只是普通平台。', 0, true);
          }
          if (
            s.runnerArmed &&
            s.runnerPhase === 'waiting' &&
            player.jumps > s.runnerJumpBaseline &&
            !player.grounded &&
            playerCenter <= firstPlatform.x + firstPlatform.w + 24
          ) {
            s.runnerPhase = 'warning';
            s.runnerTimer = .08;
            runnerPlatform.trapTell = true;
            say('它先替你反應了。', 0, true);
            tone(220, .05);
          }
          if (s.runnerPhase === 'warning') {
            s.runnerTimer -= dt;
            runnerPlatform.x = 900 + Math.sin(s.runnerTimer * 120) * 2;
            if (s.runnerTimer <= 0) {
              s.runnerPhase = 'escaping';
              runnerPlatform.x = 900;
              runnerPlatform.trapTell = false;
            }
          } else if (s.runnerPhase === 'escaping') {
            runnerPlatform.x = Math.min(1020, runnerPlatform.x + 575 * dt);
            if (runnerPlatform.x >= 1020) {
              s.runnerPhase = 'pausing';
              s.runnerTimer = .55;
            }
          } else if (s.runnerPhase === 'pausing') {
            s.runnerTimer -= dt;
            if (s.runnerTimer <= 0) s.runnerPhase = 'returning';
          } else if (s.runnerPhase === 'returning') {
            runnerPlatform.x = Math.max(900, runnerPlatform.x - 380 * dt);
            if (runnerPlatform.x <= 900) {
              s.runnerPhase = 'settled';
              runnerPlatform.x = 900;
              say('它回去了。', 0, true);
            }
          }

          if (standingOn(player, falseHintPlatform) && s.falseHintPhase === 'idle') {
            s.falseHintPhase = 'armed';
            s.falseHintJumpBaseline = player.jumps;
            say('保險一點，可以先原地跳一下。', 0, true);
          }
          if (
            s.falseHintPhase === 'armed' &&
            player.jumps > s.falseHintJumpBaseline &&
            !player.grounded
          ) {
            s.falseHintPhase = 'warning';
            s.falseHintTimer = .14;
            falseHintPlatform.cracked = true;
            tone(145, .06);
          }
          if (s.falseHintPhase === 'warning') {
            s.falseHintTimer -= dt;
            if (s.falseHintTimer <= 0) s.falseHintPhase = 'falling';
          }
          if (s.falseHintPhase === 'falling' && falseHintPlatform.active) {
            const wasStanding = standingOn(player, falseHintPlatform);
            const previousY = falseHintPlatform.y;
            falseHintPlatform.y += 650 * dt;
            if (wasStanding) player.y += falseHintPlatform.y - previousY;
            if (falseHintPlatform.y > 505) falseHintPlatform.active = false;
          }
          if (standingOn(player, s.platforms[4]) && !s.ignoredFalseHint) {
            s.ignoredFalseHint = true;
            say('……你沒有照做。', 0, true);
          }
          if (standingOn(player, s.platforms[6]) && !s.routeFinished) {
            s.routeFinished = true;
            say('路線正確。', 0, true);
          }
        }
      })),

      level('review-final', '綜合驗收 2', () => ({
        width: 2600,
        hint: '綜合驗收。沒有新規則。移動、跳躍，到門。',
        taunt: '前一題的答案很好用。尤其是用在錯的地方。',
        spawn: [70, 418],
        goal: { x: 2520, y: 384, w: 46, h: 76 },
        stopFloorIndex: 1,
        gateIndex: 2,
        runnerPlatformIndex: 4,
        fallingPanelIndices: [7, 9],
        longFloorIndex: 10,
        finalFloorIndex: 11,
        finalGroundSpikeIndex: 5,
        finalCeilingSpikeIndex: 6,
        gatePhase: 'closed',
        runnerPhase: 'waiting',
        longFloorPhase: 'idle',
        finalSpikePhase: 'waiting',
        platforms: [
          platform(0, FLOOR_Y, 450, 80),
          platform(450, FLOOR_Y, 170, 80, { pressure: true, phase: 'idle' }),
          platform(620, 220, 38, 240, { gate: true }),
          platform(700, 410, 150),
          platform(910, 350, 120, 24, { runner: true }),
          platform(1130, 400, 140),
          platform(1330, FLOOR_Y, 100, 80),
          platform(1430, FLOOR_Y, 90, 80, { phase: 'idle', triggerX: 1410, spikeIndex: 2 }),
          platform(1520, FLOOR_Y, 80, 80),
          platform(1600, FLOOR_Y, 90, 80, { phase: 'idle', triggerX: 1580, spikeIndex: 3 }),
          platform(1690, FLOOR_Y, 490, 80),
          platform(2180, FLOOR_Y, 420, 80)
        ],
        spikes: [
          spike(450, 512, 170, 28, {
            hidden: true,
            death: {
              title: '停得太完整',
              reason: '你照著停下後，腳下地板掉了。',
              comment: '提示只說停一下。',
              variant: 'tricked'
            }
          }),
          spike(620, 512, 710, 28, {
            death: {
              title: '平台折返',
              reason: '移動平台把你送回了尖刺區。',
              comment: '追到它，不代表要留在上面。',
              variant: 'tricked'
            }
          }),
          spike(1430, 512, 90, 28, {
            hidden: true,
            death: {
              title: '第一個反應',
              reason: '地板掉下去後，你沒有離開原位。',
              comment: '這一次確實要跳。',
              variant: 'tricked'
            }
          }),
          spike(1600, 512, 90, 28, {
            hidden: true,
            death: {
              title: '第二個反應',
              reason: '第二塊地板也照著前一塊掉了。',
              comment: '到這裡，重複反應都還是對的。',
              variant: 'tricked'
            }
          }),
          spike(1690, 512, 490, 28, {
            hidden: true,
            death: {
              title: '答案抄錯',
              reason: '你再次起跳，完整地板就整片消失了。',
              comment: '前兩次的答案不能直接抄。',
              variant: 'tricked'
            }
          }),
          spike(2380, 432, 70, 28, {
            death: {
              title: '等得不夠久',
              reason: '你碰到了還沒完全縮回去的尖刺。',
              comment: '它已經在往下了。',
              variant: 'careless'
            }
          }),
          spike(2280, 300, 210, 30, {
            hidden: true,
            upside: true,
            death: {
              title: '照得太完整',
              reason: '你照最早學的方法起跳，頭頂尖刺便落了下來。',
              comment: '最早的答案，現在不一定還對。',
              variant: 'tricked'
            }
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const playerCenter = player.x + player.w / 2;
          const stopFloor = s.platforms[s.stopFloorIndex];
          const gate = s.platforms[s.gateIndex];
          const runnerPlatform = s.platforms[s.runnerPlatformIndex];
          const longFloor = s.platforms[s.longFloorIndex];
          const finalFloor = s.platforms[s.finalFloorIndex];
          const finalGroundSpike = s.spikes[s.finalGroundSpikeIndex];
          const finalCeilingSpike = s.spikes[s.finalCeilingSpikeIndex];

          if (playerCenter >= 480 && !s.stopPromptShown) {
            s.stopPromptShown = true;
            say('前面還沒開。停一下。', 0, true);
          }
          if (
            !s.stopConfirmed &&
            standingOn(player, stopFloor) &&
            Math.abs(player.vx) < 25
          ) {
            s.stopConfirmed = true;
            s.gatePhase = 'lifting';
            stopFloor.phase = 'warning';
            stopFloor.timer = .5;
            stopFloor.cracked = true;
            gate.trapTell = true;
            say('很好。', 0, true);
            tone(130, .08);
          }
          if (s.gatePhase === 'lifting' && gate.active) {
            gate.y -= 520 * dt;
            if (gate.y + gate.h <= 190) {
              gate.active = false;
              s.gatePhase = 'gone';
            }
          }
          if (stopFloor.phase === 'warning') {
            stopFloor.timer -= dt;
            if (stopFloor.timer <= 0) {
              stopFloor.phase = 'falling';
              s.spikes[0].hidden = false;
              s.screenShake = .08;
            }
          }
          if (stopFloor.phase === 'falling' && stopFloor.active) {
            const wasStanding = standingOn(player, stopFloor);
            const previousY = stopFloor.y;
            stopFloor.y += 650 * dt;
            if (wasStanding) player.y += stopFloor.y - previousY;
            if (stopFloor.y > 560) stopFloor.active = false;
          }

          if (
            s.runnerPhase === 'waiting' &&
            !player.grounded &&
            player.vx > 80 &&
            player.x > 790 &&
            player.x < 930
          ) {
            s.runnerPhase = 'escaping';
            runnerPlatform.trapTell = true;
            say('追上它。', 0, true);
            tone(220, .06);
          }
          if (s.runnerPhase === 'escaping') {
            runnerPlatform.x = Math.min(970, runnerPlatform.x + 360 * dt);
            if (runnerPlatform.x >= 970) {
              s.runnerPhase = 'waitingForLanding';
              runnerPlatform.trapTell = false;
            }
          }
          if (s.runnerPhase === 'waitingForLanding' && standingOn(player, runnerPlatform)) {
            s.runnerPhase = 'landed';
            s.runnerTimer = .35;
            s.correctionTimer = 1.15;
            say('你已經走過這段了。', 0, true);
          }
          if (s.runnerPhase === 'landed') {
            s.runnerTimer -= dt;
            if (s.runnerTimer <= 0) {
              s.runnerPhase = 'returning';
              tone(115, .07);
            }
          }
          if (s.runnerPhase === 'returning' && runnerPlatform.active) {
            const wasStanding = standingOn(player, runnerPlatform);
            const previousX = runnerPlatform.x;
            runnerPlatform.x -= 520 * dt;
            if (wasStanding) player.x += runnerPlatform.x - previousX;
            if (runnerPlatform.x <= 850) {
              runnerPlatform.active = false;
              s.runnerPhase = 'gone';
            }
          }
          if (s.correctionTimer > 0) {
            s.correctionTimer -= dt;
            if (s.correctionTimer <= 0 && !s.correctedMemory) {
              s.correctedMemory = true;
              say('……我是說，前面的驗收。');
            }
          }

          s.fallingPanelIndices.forEach((platformIndex, order) => {
            const piece = s.platforms[platformIndex];
            const danger = s.spikes[piece.spikeIndex];
            if (piece.phase === 'idle' && playerCenter >= piece.triggerX) {
              piece.phase = 'warning';
              piece.timer = .11;
              piece.cracked = true;
              tone(165, .05);
            }
            if (piece.phase === 'warning') {
              piece.timer -= dt;
              if (piece.timer <= 0) {
                piece.phase = 'falling';
                danger.hidden = false;
              }
            }
            if (piece.phase === 'falling' && piece.active) {
              const wasStanding = standingOn(player, piece);
              const previousY = piece.y;
              piece.y += 700 * dt;
              if (wasStanding) player.y += piece.y - previousY;
              if (piece.y > 560) piece.active = false;
            }
            const passedX = order === 0 ? 1530 : 1705;
            const passedKey = order === 0 ? 'firstReviewPanelPassed' : 'secondReviewPanelPassed';
            if (player.x > passedX && !s[passedKey]) {
              s[passedKey] = true;
              say(order === 0 ? '對。' : '很好。再一次。', 0, true);
            }
          });

          if (standingOn(player, longFloor) && !s.longFloorReady) {
            s.longFloorReady = true;
            s.longFloorJumpBaseline = player.jumps;
          }
          if (
            s.longFloorReady &&
            s.longFloorPhase === 'idle' &&
            !player.grounded &&
            player.jumps > s.longFloorJumpBaseline &&
            playerCenter >= 1750 &&
            playerCenter <= 2140
          ) {
            s.longFloorPhase = 'warning';
            s.longFloorTimer = .12;
            longFloor.cracked = true;
            tone(125, .07);
          }
          if (s.longFloorPhase === 'warning') {
            s.longFloorTimer -= dt;
            if (s.longFloorTimer <= 0) {
              s.longFloorPhase = 'gone';
              longFloor.active = false;
              s.spikes[4].hidden = false;
              s.screenShake = .1;
            }
          }
          if (player.x > 2070 && s.longFloorPhase === 'idle' && !s.walkedLongFloor) {
            s.walkedLongFloor = true;
            say('這次沒有要你跳。', 0, true);
          }

          if (standingOn(player, finalFloor) && !s.finalStageReady) {
            s.finalStageReady = true;
            s.finalJumpBaseline = player.jumps;
            say('最後一根。照你最早學的方式。', 0, true);
          }
          if (
            s.finalStageReady &&
            finalGroundSpike.active &&
            player.grounded &&
            playerCenter >= 2280 &&
            playerCenter <= 2350 &&
            Math.abs(player.vx) < 25
          ) {
            s.finalWait = (s.finalWait || 0) + dt;
          } else if (s.finalSpikePhase === 'waiting') {
            s.finalWait = 0;
          }
          if (s.finalSpikePhase === 'waiting' && s.finalWait >= .7) {
            s.finalSpikePhase = 'retracting';
            say('……也算通過。', 0, true);
            tone(520, .08);
          }
          if (s.finalSpikePhase === 'retracting' && finalGroundSpike.active) {
            finalGroundSpike.h = Math.max(0, finalGroundSpike.h - 70 * dt);
            finalGroundSpike.y = FLOOR_Y - finalGroundSpike.h;
            if (finalGroundSpike.h <= 2) {
              finalGroundSpike.active = false;
              finalGroundSpike.hidden = true;
              s.finalSpikePhase = 'gone';
            }
          }
          if (
            s.finalStageReady &&
            finalGroundSpike.active &&
            !s.finalCeilingTriggered &&
            !player.grounded &&
            player.jumps > s.finalJumpBaseline &&
            playerCenter >= 2250 &&
            playerCenter <= 2470
          ) {
            s.finalCeilingTriggered = true;
            s.finalCeilingPhase = 'dropping';
            finalCeilingSpike.hidden = false;
            tone(150, .08);
          }
          if (s.finalCeilingPhase === 'dropping' && finalCeilingSpike.active) {
            finalCeilingSpike.y += 440 * dt;
            if (finalCeilingSpike.y > 470) {
              finalCeilingSpike.active = false;
              s.finalCeilingPhase = 'gone';
            }
          }

          s.screenShake = Math.max(0, (s.screenShake || 0) - dt);
        }
      }))
    ];
  };
})();
