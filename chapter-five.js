(() => {
  'use strict';

  window.createChapterFiveLevels = function createChapterFiveLevels(api) {
    const {
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      say,
      tone,
      completeLevel,
      hit
    } = api;

    const radians = degrees => degrees * Math.PI / 180;

    const visualStyles = [
      { visualRotation: 0, visualOffsetX: 0, visualOffsetY: 0, visualScaleX: 1, visualScaleY: 1 },
      { visualRotation: radians(2), visualOffsetX: 1, visualOffsetY: -1, visualScaleX: 1.01, visualScaleY: .99 },
      { visualRotation: radians(-3), visualOffsetX: -2, visualOffsetY: 1, visualScaleX: .99, visualScaleY: 1.02 },
      { visualRotation: radians(4), visualOffsetX: 3, visualOffsetY: -1, visualScaleX: 1.02, visualScaleY: .98 },
      { visualRotation: radians(-5), visualOffsetX: -2, visualOffsetY: -2, visualScaleX: .98, visualScaleY: 1.01 },
      { visualRotation: radians(6), visualOffsetX: 4, visualOffsetY: 1, visualScaleX: 1.01, visualScaleY: .98 },
      { visualRotation: radians(-7), visualOffsetX: -3, visualOffsetY: 2, visualScaleX: .99, visualScaleY: 1.02 }
    ];

    const arbitraryStyle = index => ({ ...visualStyles[index % visualStyles.length] });

    const glitch = (strength, phase = 0, period) => ({
      visualGlitch: strength,
      visualGlitchPhase: phase,
      ...(Number.isFinite(period) ? { visualGlitchPeriod: period } : {})
    });

    const restyle = (object, index) => {
      Object.assign(object, arbitraryStyle(index));
      object.visualEchoes = [];
      delete object.visualKind;
    };

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: .16, ...build() }),
      { id, title }
    );

    const death = (title, reason, comment, variant = 'tricked') => ({
      title,
      reason,
      comment,
      variant
    });

    const standingOn = (player, piece) => (
      player.grounded &&
      piece.active &&
      player.x + player.w > piece.x &&
      player.x < piece.x + piece.w &&
      Math.abs(player.y + player.h - piece.y) < 6
    );

    const rememberTakeoff = (s, key, player, piece) => {
      const readyKey = `${key}Ready`;
      const jumpsKey = `${key}Jumps`;
      if (standingOn(player, piece)) {
        s[readyKey] = true;
        s[jumpsKey] = player.jumps;
      }
      if (
        s[readyKey] &&
        !player.grounded &&
        player.jumps > (s[jumpsKey] ?? player.jumps)
      ) {
        s[readyKey] = false;
        return true;
      }
      return false;
    };

    return [
      level('mutation-angles', '1', () => ({
        width: 2200,
        hint: '畫面好像閃了一下。大概只是載入慢了，先走吧。',
        taunt: '不是你眼花。只是畫面剛好又跳了一格。',
        spawn: [70, 418],
        goal: {
          x: 2100,
          y: 384,
          w: 46,
          h: 76,
          ...arbitraryStyle(6),
          ...glitch(.12, .7, 4.6)
        },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        spinningPlatformIndex: 5,
        thirdDestinationX: 775,
        fourthDestinationX: 1040,
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 400, 140, 24, {
            ...arbitraryStyle(0),
            ...glitch(.14, 0, 4.2)
          }),
          platform(590, 330, 140, 24, { ...arbitraryStyle(1, 1) }),
          platform(820, 400, 150, 24, { ...arbitraryStyle(2) }),
          platform(1015, 325, 140, 24, { ...arbitraryStyle(3, 1) }),
          platform(1310, 400, 140, 24, { ...arbitraryStyle(4) }),
          platform(1510, 340, 130, 24, { ...arbitraryStyle(5, 2) }),
          platform(1710, FLOOR_Y, 490, 80)
        ],
        spikes: [
          spike(300, 512, 1410, 28, {
            death: death(
              '角度失準',
              '你照著平台看起來的方向落地。',
              '那個方向只維持到你相信它。',
              'careless'
            )
          }),
          spike(1363, 372, 34, 28, {
            ...arbitraryStyle(5, 2),
            death: death(
              '旋轉中心',
              '你落在旋轉平台中央的尖刺上。',
              '它現在剛好想待在那裡。'
            )
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const spinning = s.platforms[s.spinningPlatformIndex];

          if (!s.firstTurned && center >= 260) {
            s.firstTurned = true;
            restyle(first, 3, 2);
            restyle(s.goal, 2, 1);
            say('……又閃了。沒事，碰得到就好。');
            tone(170, .06);
          }

          if (rememberTakeoff(s, 'firstTakeoff', player, first) && !s.secondTurned) {
            s.secondTurned = true;
            restyle(second, 5, 1);
            restyle(fourth, 0, 2);
            tone(145, .05);
          }

          if (standingOn(player, second) && !s.doorCameo) {
            s.doorCameo = true;
            s.doorCameoTimer = .35;
            s.goal.x = player.x + 34;
            s.goal.y = player.y - 72;
            s.goal.locked = true;
            restyle(s.goal, 4, 2);
          }
          if (s.doorCameoTimer > 0) {
            s.doorCameoTimer -= dt;
            if (s.doorCameoTimer <= 0) {
              s.goal.x = 2100;
              s.goal.y = 384;
              s.goal.locked = false;
              restyle(s.goal, 6, 1);
            }
          }

          if (rememberTakeoff(s, 'secondTakeoff', player, second) && !s.thirdMoved) {
            s.thirdMoved = true;
            third.x = s.thirdDestinationX;
            restyle(third, 6, 2);
            tone(155, .05);
          }

          if (rememberTakeoff(s, 'thirdTakeoff', player, third) && !s.fourthMoved) {
            s.fourthMoved = true;
            fourth.x = s.fourthDestinationX;
            restyle(spinning, 1, 2);
            say('那塊平台的位置，剛才也是這樣嗎？');
            tone(125, .07);
          }

          if (standingOn(player, spinning)) {
            s.spinningStarted = true;
          }
          if (s.spinningStarted) {
            spinning.visualRotation = (spinning.visualRotation + radians(22) * dt) % (Math.PI * 2);
          }
        }
      })),

      level('mutation-spike-placement', '2', () => ({
        width: 2200,
        hint: '這次有幾個物件載入得不太穩。等它閃完再看。',
        taunt: '至少尖刺碰起來沒有顯示錯誤。',
        spawn: [70, 418],
        goal: {
          x: 2100,
          y: 384,
          w: 46,
          h: 76,
          ...arbitraryStyle(4),
          ...glitch(.18, .4, 3.8)
        },
        firstSpikeIndex: 0,
        rearSpikeIndex: 1,
        jumpingSpikeIndex: 2,
        fallingSpikeIndex: 3,
        firstTargetY: 260,
        rearTargetX: 480,
        jumpingPeakY: 330,
        fallingTargetX: 1360,
        platforms: [platform(0, FLOOR_Y, 2200, 80)],
        spikes: [
          spike(420, 432, 42, 28, {
            ...arbitraryStyle(0, 1),
            death: death('追著位置跑', '你跳進了第一根尖刺的新高度。', '它不想待在地上。')
          }),
          spike(700, 260, 100, 34, {
            upside: true,
            ...arbitraryStyle(1),
            ...glitch(.2, 1.1, 3.5),
            death: death('回到原位', '你退回了尖刺剛選好的位置。', '它剛剛還在前面。')
          }),
          spike(950, 432, 44, 28, {
            ...arbitraryStyle(3, 1),
            death: death('一起起跳', '你和第三根尖刺同時離開地面。', '這一次它也選了跳躍。')
          }),
          spike(1230, 270, 100, 34, {
            upside: true,
            ...arbitraryStyle(5),
            ...glitch(.22, 2.1, 3.25),
            death: death('臨時落點', '倒掛尖刺換到了你前面的地板。', '這裡原本不在檔案裡。')
          }),
          spike(1640, 432, 110, 28, {
            ...arbitraryStyle(2, 2),
            death: death('斜放', '那團東西裡仍然有尖刺。', '至少碰到的這一份是真的。', 'careless')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const first = s.spikes[s.firstSpikeIndex];
          const rear = s.spikes[s.rearSpikeIndex];
          const jumping = s.spikes[s.jumpingSpikeIndex];
          const falling = s.spikes[s.fallingSpikeIndex];

          if (center >= 300 && !s.firstMoving) {
            s.firstMoving = true;
            restyle(rear, 4, 2);
            say('尖刺不該出現在那裡。');
            tone(160, .06);
          }
          if (s.firstMoving && first.y > s.firstTargetY) {
            first.y = Math.max(s.firstTargetY, first.y - 680 * dt);
            first.visualRotation = Math.min(radians(10), (first.visualRotation || 0) + radians(40) * dt);
            if (first.y <= s.firstTargetY) first.upside = true;
          }

          if (center >= 610 && !s.rearMoving) {
            s.rearMoving = true;
            s.rearProgress = 0;
            s.rearStartX = rear.x;
            s.rearStartY = rear.y;
            rear.active = false;
            tone(130, .05);
          }
          if (s.rearMoving && s.rearProgress < 1) {
            s.rearProgress = Math.min(1, s.rearProgress + dt / .24);
            const eased = 1 - Math.pow(1 - s.rearProgress, 2);
            rear.x = s.rearStartX + (s.rearTargetX - s.rearStartX) * eased;
            rear.y = s.rearStartY + (432 - s.rearStartY) * eased;
            rear.visualRotation = radians(8) * eased;
            if (s.rearProgress >= 1) {
              rear.upside = false;
              rear.active = true;
            }
          }
          if (center >= 760 && !s.rearCommented) {
            s.rearCommented = true;
            restyle(jumping, 6, 2);
            say('等等，我記得它剛才在前面。');
          }

          if (
            !s.jumpTrapUsed &&
            !player.grounded &&
            player.jumps > (s.lastJumps ?? 0) &&
            center >= 830 &&
            center <= 1010
          ) {
            s.jumpTrapUsed = true;
            s.jumpTrapPhase = 'rising';
            tone(185, .05);
          }
          s.lastJumps = player.jumps;
          if (s.jumpTrapPhase === 'rising') {
            jumping.y = Math.max(s.jumpingPeakY, jumping.y - 620 * dt);
            if (jumping.y <= s.jumpingPeakY) {
              s.jumpTrapPhase = 'waiting';
              s.jumpTrapTimer = .15;
            }
          } else if (s.jumpTrapPhase === 'waiting') {
            s.jumpTrapTimer -= dt;
            if (s.jumpTrapTimer <= 0) s.jumpTrapPhase = 'falling';
          } else if (s.jumpTrapPhase === 'falling') {
            jumping.y = Math.min(432, jumping.y + 520 * dt);
            if (jumping.y >= 432) s.jumpTrapPhase = 'done';
          }

          if (center >= 1120 && !s.fallingMoving) {
            s.fallingMoving = true;
            s.fallingProgress = 0;
            s.fallingStartX = falling.x;
            s.fallingStartY = falling.y;
            s.doorSweepTimer = .46;
            s.goal.x = 1040;
            s.goal.y = 190;
            s.goal.locked = true;
            restyle(s.goal, 0, 2);
            tone(120, .07);
          }
          if (s.doorSweepTimer > 0) {
            s.doorSweepTimer -= dt;
            s.goal.x += 760 * dt;
            s.goal.y += Math.sin(s.doorSweepTimer * 35) * 6;
            if (s.doorSweepTimer <= 0) {
              s.goal.x = 2100;
              s.goal.y = 384;
              s.goal.locked = false;
              restyle(s.goal, 4, 2);
            }
          }
          if (s.fallingMoving && s.fallingProgress < 1) {
            s.fallingProgress = Math.min(1, s.fallingProgress + dt / .3);
            const eased = s.fallingProgress * s.fallingProgress;
            falling.x = s.fallingStartX + (s.fallingTargetX - s.fallingStartX) * eased;
            falling.y = s.fallingStartY + (432 - s.fallingStartY) * eased;
            falling.visualRotation = radians(-9) * eased;
            if (s.fallingProgress >= 1) {
              falling.upside = false;
              restyle(first, 2, 1);
              restyle(falling, 0, 2);
              say('……可能只是檔案讀慢了。');
            }
          }
        }
      })),

      level('mutation-shy-platforms', '3', () => ({
        width: 2100,
        hint: '閃爍變多了。先別急，我正在確認這一關。',
        taunt: '你照著我看到的位置跳了。可惜它又換了。',
        spawn: [70, 418],
        goal: {
          x: 2010,
          y: 560,
          w: 46,
          h: 76,
          hidden: true,
          locked: true,
          ...arbitraryStyle(5),
          ...glitch(.34, .25, 2.65)
        },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        fifthPlatformIndex: 5,
        firstPhase: 'waiting',
        secondPhase: 'waiting',
        thirdPhase: 'hidden',
        fifthPhase: 'buried',
        goalPhase: 'buried',
        firstReadyX: 420,
        firstStartX: 600,
        secondTargetX: 640,
        secondTargetY: 330,
        secondStartX: 830,
        secondStartY: 170,
        thirdTargetX: 870,
        thirdTargetY: 400,
        thirdOriginX: 520,
        thirdOriginY: 240,
        fifthReadyY: 400,
        platforms: [
          platform(0, FLOOR_Y, 360, 80),
          platform(600, 400, 130, 24, { ...arbitraryStyle(0), ...glitch(.26, .7, 3.05) }),
          platform(830, 170, 130, 24, { ...arbitraryStyle(1), ...glitch(.28, 1.35, 2.95) }),
          platform(520, 240, 130, 24, {
            active: false,
            solid: false,
            ...arbitraryStyle(2),
            ...glitch(.31, 1.9, 2.8)
          }),
          platform(1100, 330, 130, 24, {
            ...arbitraryStyle(3),
            ...glitch(.32, 2.4, 2.75)
          }),
          platform(1340, 560, 130, 24, { ...arbitraryStyle(4), ...glitch(.34, .05, 2.6) }),
          platform(1600, FLOOR_Y, 500, 80)
        ],
        spikes: [
          spike(360, 512, 1240, 28, {
            ...arbitraryStyle(5, 1),
            death: death(
              '現在不是落點',
              '你跳向了一塊還沒決定待在哪裡的平台。',
              '下一塊剛才做過的事，這一塊不承認。',
              'careless'
            )
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];

          if (s.firstPhase === 'waiting' && player.vx < -40) {
            s.firstLookTime = (s.firstLookTime || 0) + dt;
            if (s.firstLookTime >= .1) {
              s.firstPhase = 'moving';
              restyle(s.goal, 1, 2);
              tone(170, .05);
            }
          }
          if (s.firstPhase === 'moving') {
            first.x = Math.max(s.firstReadyX, first.x - 420 * dt);
            first.visualRotation += radians(75) * dt;
            if (first.x <= s.firstReadyX) {
              first.x = s.firstReadyX;
              s.firstPhase = 'ready';
            }
          }

          if (s.secondPhase === 'waiting' && standingOn(player, first) && Math.abs(player.vx) < 30) {
            s.secondWaitTime = (s.secondWaitTime || 0) + dt;
            if (s.secondWaitTime >= .35) {
              s.secondPhase = 'fallingSideways';
              s.secondProgress = 0;
              restyle(first, 6, 1);
              tone(130, .07);
            }
          }
          if (s.secondPhase === 'fallingSideways') {
            s.secondProgress = Math.min(1, s.secondProgress + dt / .3);
            second.x = s.secondStartX + (s.secondTargetX - s.secondStartX) * s.secondProgress;
            second.y = s.secondStartY + (s.secondTargetY - s.secondStartY) * s.secondProgress;
            second.visualRotation += radians(95) * dt;
            if (s.secondProgress >= 1) {
              s.secondPhase = 'ready';
              restyle(second, 4, 2);
            }
          }

          if (s.thirdPhase === 'hidden' && rememberTakeoff(s, 'secondTakeoff', player, second)) {
            s.thirdPhase = 'behind';
            s.thirdProgress = 0;
            third.active = true;
            third.x = s.thirdOriginX;
            third.y = s.thirdOriginY;
            restyle(third, 0, 2);
            say('這塊平台剛才沒有在這裡。');
            tone(115, .08);
          }
          if (s.thirdPhase === 'behind') {
            s.thirdProgress = Math.min(1, s.thirdProgress + dt / .18);
            const eased = s.thirdProgress * s.thirdProgress;
            third.x = s.thirdOriginX + (s.thirdTargetX - s.thirdOriginX) * eased;
            third.y = s.thirdOriginY + (s.thirdTargetY - s.thirdOriginY) * eased;
            third.visualRotation -= radians(110) * dt;
            if (s.thirdProgress >= 1) {
              s.thirdPhase = 'ready';
              third.solid = true;
              restyle(third, 2, 1);
            }
          }

          if (standingOn(player, third) && !s.fourthReacted) {
            s.fourthReacted = true;
            restyle(s.goal, 3, 2);
            restyle(first, 5, 1);
          }

          if (
            s.fifthPhase === 'buried' &&
            standingOn(player, fourth) &&
            center < fourth.x + fourth.w / 2
          ) {
            s.fifthPhase = 'rising';
            say('我沒有改過它的位置。');
            tone(145, .06);
          }
          if (s.fifthPhase === 'rising') {
            fifth.y = Math.max(s.fifthReadyY, fifth.y - 520 * dt);
            fifth.visualRotation += radians(85) * dt;
            if (fifth.y <= s.fifthReadyY) {
              fifth.y = s.fifthReadyY;
              s.fifthPhase = 'ready';
              restyle(fifth, 6, 2);
            }
          }

          if (s.goalPhase === 'buried' && standingOn(player, fifth)) {
            s.goalPhase = 'rising';
            s.goal.hidden = false;
            restyle(s.goal, 2, 2);
          }
          if (s.goalPhase === 'rising') {
            s.goal.y = Math.max(384, s.goal.y - 520 * dt);
            s.goal.visualRotation += radians(100) * dt;
            if (s.goal.y <= 384) {
              s.goal.y = 384;
              s.goal.locked = false;
              s.goalPhase = 'ready';
            }
          }
        }
      })),

      level('mutation-reassembly', '4', () => ({
        width: 1900,
        hint: '先等一下。這不像顯示問題，位置真的在變。',
        taunt: '不是你猜錯，是它剛才又改了一次。',
        spawn: [70, 418],
        goal: {
          x: 1810,
          y: 384,
          w: 46,
          h: 76,
          ...arbitraryStyle(6),
          ...glitch(.42, .15, 2.25)
        },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        fifthPlatformIndex: 5,
        doorPhase: 'home',
        thirdPhase: 'hidden',
        firstPhase: 'waiting',
        secondPhase: 'waiting',
        fifthPhase: 'buried',
        thirdTargetX: 780,
        thirdTargetY: 400,
        thirdOriginX: 460,
        thirdOriginY: 220,
        fourthTargetX: 1000,
        fifthReadyY: 405,
        finalGoalX: 1810,
        cameoGoalX: 650,
        cameoGoalY: 170,
        platforms: [
          platform(0, FLOOR_Y, 280, 80),
          platform(350, 390, 130, 24, {
            ...arbitraryStyle(0),
            ...glitch(.32, .55, 2.75)
          }),
          platform(565, 325, 130, 24, {
            ...arbitraryStyle(1),
            ...glitch(.34, 1.05, 2.65)
          }),
          platform(460, 220, 130, 24, {
            active: false,
            solid: false,
            ...arbitraryStyle(2),
            ...glitch(.38, 1.55, 2.5)
          }),
          platform(1035, 335, 130, 24, {
            ...arbitraryStyle(3),
            ...glitch(.4, 1.95, 2.4)
          }),
          platform(1220, 560, 130, 24, { ...arbitraryStyle(4), ...glitch(.42, 2.25, 2.3) }),
          platform(1420, FLOOR_Y, 480, 80)
        ],
        spikes: [
          spike(280, 512, 1140, 28, {
            ...arbitraryStyle(5),
            ...glitch(.36, .8, 2.55),
            death: death(
              '不是這一版',
              '你落在剛才看見的平台位置。',
              '現在不是剛才。',
              'careless'
            )
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const pit = s.spikes[0];

          if (s.doorPhase === 'home' && center >= 220) {
            s.doorPhase = 'cameo';
            s.goal.x = s.cameoGoalX;
            s.goal.y = s.cameoGoalY;
            s.goal.locked = true;
            restyle(s.goal, 0, 2);
            tone(105, .08);
          }

          if (!s.fourthShifted && rememberTakeoff(s, 'firstTakeoff', player, first)) {
            s.fourthShifted = true;
            fourth.x = s.fourthTargetX;
            restyle(second, 5, 2);
            restyle(pit, 2, 2);
            tone(145, .05);
          }

          if (s.thirdPhase === 'hidden' && standingOn(player, second)) {
            s.thirdPhase = 'flying';
            s.thirdProgress = 0;
            third.active = true;
            third.x = s.thirdOriginX;
            third.y = s.thirdOriginY;
            restyle(first, 4, 2);
            tone(125, .07);
          }
          if (s.thirdPhase === 'flying') {
            s.thirdProgress = Math.min(1, s.thirdProgress + dt / .28);
            const eased = 1 - Math.pow(1 - s.thirdProgress, 2);
            third.x = s.thirdOriginX + (s.thirdTargetX - s.thirdOriginX) * eased;
            third.y = s.thirdOriginY + (s.thirdTargetY - s.thirdOriginY) * eased;
            third.visualRotation += radians(120) * dt;
            if (s.thirdProgress >= 1) {
              s.thirdPhase = 'ready';
              third.solid = true;
              restyle(third, 6, 1);
            }
          }

          if (s.firstPhase === 'waiting' && rememberTakeoff(s, 'thirdTakeoff', player, third)) {
            s.firstPhase = 'flying';
            say('你踩的是第三塊，變動的卻是第一塊。');
            tone(100, .09);
          }
          if (s.firstPhase === 'flying') {
            first.y -= 520 * dt;
            first.x -= 160 * dt;
            first.visualRotation -= radians(105) * dt;
            if (first.y < 60) s.firstPhase = 'goneAbove';
          }

          if (s.secondPhase === 'waiting' && rememberTakeoff(s, 'fourthTakeoff', player, fourth)) {
            s.secondPhase = 'falling';
            s.fifthPhase = 'rising';
            say('觸發順序和檔案裡寫的不一樣。');
            tone(115, .08);
          }
          if (s.secondPhase === 'falling') {
            second.y += 560 * dt;
            second.visualRotation += radians(90) * dt;
            if (second.y > 560) {
              second.active = false;
              s.secondPhase = 'gone';
            }
          }
          if (s.fifthPhase === 'rising') {
            fifth.y = Math.max(s.fifthReadyY, fifth.y - 560 * dt);
            fifth.visualRotation -= radians(80) * dt;
            if (fifth.y <= s.fifthReadyY) {
              fifth.y = s.fifthReadyY;
              s.fifthPhase = 'ready';
              restyle(fifth, 1, 2);
            }
          }

          if (s.doorPhase === 'cameo' && standingOn(player, fifth)) {
            s.doorPhase = 'returning';
            s.doorProgress = 0;
            s.doorStartX = s.goal.x;
            s.doorStartY = s.goal.y;
            s.pitSinking = true;
            say('……剛才那一行，好像自己換過順序了。');
          }
          if (s.pitSinking) {
            pit.y += 260 * dt;
            pit.visualRotation += radians(45) * dt;
          }
          if (s.doorPhase === 'returning') {
            s.doorProgress = Math.min(1, s.doorProgress + dt / .38);
            const eased = s.doorProgress * s.doorProgress;
            s.goal.x = s.doorStartX + (s.finalGoalX - s.doorStartX) * eased;
            s.goal.y = s.doorStartY + (384 - s.doorStartY) * eased;
            s.goal.visualRotation -= radians(135) * dt;
            if (s.doorProgress >= 1) {
              s.goal.x = s.finalGoalX;
              s.goal.y = 384;
              s.goal.locked = false;
              s.doorPhase = 'ready';
              restyle(s.goal, 3, 1);
            }
          }
        }
      })),

      level('mutation-preference', '5', () => ({
        width: 2900,
        hint: '這一關載入完成了。……至少畫面上是這樣寫的。',
        taunt: '你記住了上一秒；它只需要再改一次。',
        spawn: [70, 418],
        manualGoal: true,
        goal: {
          x: 1150,
          y: 384,
          w: 46,
          h: 76,
          fake: true,
          ...arbitraryStyle(2),
          ...glitch(.58, .2, 1.9)
        },
        doorPhase: 'first',
        doorStops: [
          { x: 930, y: 145, style: 4 },
          { x: 90, y: 285, style: 0 },
          { x: 2310, y: 85, style: 5 },
          { x: 2790, y: 300, style: 2 }
        ],
        fakeDoorFloorIndex: 4,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        seventhPlatformIndex: 7,
        eighthPlatformIndex: 8,
        sinkingPlatformIndex: 9,
        tenthPlatformIndex: 10,
        doorFloorSpikeIndex: 1,
        finalSpikeIndex: 4,
        floorPhase: 'idle',
        sinkingPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 400, 140, 24, {
            ...arbitraryStyle(0),
            ...glitch(.46, .45, 2.2)
          }),
          platform(590, 330, 140, 24, {
            ...arbitraryStyle(1),
            ...glitch(.48, .85, 2.15)
          }),
          platform(810, 400, 140, 24, {
            ...arbitraryStyle(2),
            ...glitch(.5, 1.25, 2.1)
          }),
          platform(1010, FLOOR_Y, 220, 80, { ...glitch(.48, 1.65, 2.05) }),
          platform(1290, 400, 140, 24, {
            ...arbitraryStyle(3),
            ...glitch(.52, .1, 2)
          }),
          platform(1510, 330, 140, 24, {
            ...arbitraryStyle(4),
            ...glitch(.54, .5, 1.95)
          }),
          platform(1720, 400, 140, 24, {
            ...arbitraryStyle(5),
            ...glitch(.56, .9, 1.9)
          }),
          platform(1940, 330, 140, 24, {
            ...arbitraryStyle(6),
            ...glitch(.58, 1.3, 1.85)
          }),
          platform(2200, 400, 140, 24, {
            sinking: true,
            ...arbitraryStyle(0),
            ...glitch(.6, 1.65, 1.8)
          }),
          platform(2380, 340, 130, 24, {
            ...arbitraryStyle(1),
            ...glitch(.62, .25, 1.75)
          }),
          platform(2600, FLOOR_Y, 300, 80, { ...glitch(.54, .65, 1.95) })
        ],
        spikes: [
          spike(300, 512, 710, 28, {
            ...arbitraryStyle(5),
            ...glitch(.5, .3, 2.1),
            death: death('排列之外', '你落在這些平台現在沒有選的位置。', '「原位」在這章只是一種建議。', 'careless')
          }),
          spike(1010, 512, 220, 28, {
            hidden: true,
            ...arbitraryStyle(3),
            ...glitch(.54, .75, 2),
            death: death('門口讓位', '門走了，地板覺得也可以。', '你剛好還站在它們原本的位置。')
          }),
          spike(1230, 512, 1370, 28, {
            ...arbitraryStyle(0),
            ...glitch(.56, 1.1, 1.95),
            death: death('後半排列之外', '那裡現在不是落點。', '剛才看起來像，不代表現在也是。', 'careless')
          }),
          spike(1720, 372, 42, 28, {
            ...arbitraryStyle(6),
            ...glitch(.6, 1.45, 1.85),
            death: death('偏好的左邊', '這塊平台把你落下的位置交給了尖刺。', '它沒有說過理由。')
          }),
          spike(2600, 432, 50, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 432,
            ...arbitraryStyle(2),
            ...glitch(.64, .05, 1.7),
            death: death('最後一個落點', '你落在剛才還空著的位置。', '它現在不空。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const startFloor = s.platforms[0];
          const fakeDoorFloor = s.platforms[s.fakeDoorFloorIndex];
          const doorFloorSpike = s.spikes[s.doorFloorSpikeIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const sixth = s.platforms[s.sixthPlatformIndex];
          const seventh = s.platforms[s.seventhPlatformIndex];
          const eighth = s.platforms[s.eighthPlatformIndex];
          const sinking = s.platforms[s.sinkingPlatformIndex];
          const tenth = s.platforms[s.tenthPlatformIndex];
          const finalSpike = s.spikes[s.finalSpikeIndex];

          if (center >= 530 && !s.fileCommented) {
            s.fileCommented = true;
            restyle(eighth, 2, 2);
            eighth.visualGlitch = .68;
            say('我檢查過了。檔案裡沒有這些角度。');
          }

          if (s.doorPhase === 'first' && hit(player, s.goal)) {
            s.doorPhase = 'wandering';
            s.goal.locked = true;
            s.goal.fake = false;
            s.doorStopIndex = 0;
            s.goal.x = s.doorStops[0].x;
            s.goal.y = s.doorStops[0].y;
            restyle(s.goal, s.doorStops[0].style, 2);
            s.doorTimer = .16;
            s.floorPhase = 'warning';
            s.floorTimer = .42;
            fakeDoorFloor.cracked = true;
            restyle(sixth, 6, 2);
            say('門的位置剛才還是正常的。');
            tone(90, .12);
          }
          if (s.doorPhase === 'wandering') {
            s.doorTimer -= dt;
            if (s.doorTimer <= 0) {
              s.doorStopIndex += 1;
              const stop = s.doorStops[s.doorStopIndex];
              if (stop) {
                s.goal.x = stop.x;
                s.goal.y = stop.y;
                restyle(s.goal, stop.style, 2);
                s.doorTimer = .16 + s.doorStopIndex * .03;
                tone(90 + s.doorStopIndex * 35, .04);
              } else {
                s.doorPhase = 'final';
                const finalStop = s.doorStops[s.doorStops.length - 1];
                s.goal.x = finalStop.x;
                s.goal.y = finalStop.y;
                s.goal.locked = false;
                restyle(s.goal, 2, 1);
              }
            }
          }

          if (s.floorPhase === 'warning') {
            s.floorTimer -= dt;
            if (s.floorTimer <= 0) {
              s.floorPhase = 'falling';
              doorFloorSpike.hidden = false;
            }
          }
          if (s.floorPhase === 'falling' && fakeDoorFloor.active) {
            const carrying = standingOn(player, fakeDoorFloor);
            const previousY = fakeDoorFloor.y;
            fakeDoorFloor.y += 600 * dt;
            if (carrying) player.y += fakeDoorFloor.y - previousY;
            if (fakeDoorFloor.y > 560) {
              fakeDoorFloor.active = false;
              s.floorPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'fifthTakeoff', player, fifth) && !s.sixthMoved) {
            s.sixthMoved = true;
            sixth.x = 1475;
            restyle(tenth, 0, 2);
            restyle(s.spikes[s.doorFloorSpikeIndex], 6, 2);
            tone(150, .05);
          }
          if (center >= 1550 && !s.preferenceQuestioned) {
            s.preferenceQuestioned = true;
            say('我沒有讓後面的東西跟著動。');
          }

          if (rememberTakeoff(s, 'seventhTakeoff', player, seventh) && !s.eighthMoved) {
            s.eighthMoved = true;
            eighth.x = 1980;
            s.startFloorFlying = true;
            restyle(startFloor, 3, 2);
            say('等等，座標剛剛自己改回去了。');
            tone(140, .05);
          }
          if (s.startFloorFlying) {
            startFloor.y -= 430 * dt;
            startFloor.visualRotation += radians(85) * dt;
            if (startFloor.y < 40) s.startFloorFlying = false;
          }

          if (s.sinkingPhase === 'idle' && standingOn(player, sinking)) {
            s.sinkingPhase = 'rising';
            sinking.cracked = true;
            restyle(sinking, 4, 2);
            tone(120, .06);
          }
          if (s.sinkingPhase === 'rising') {
            const carrying = standingOn(player, sinking);
            sinking.y = Math.max(360, sinking.y - 260 * dt);
            if (carrying) player.y = sinking.y - player.h - .01;
            if (sinking.y <= 360) s.sinkingPhase = 'sideways';
          }
          if (s.sinkingPhase === 'sideways') {
            const carrying = standingOn(player, sinking);
            const previousX = sinking.x;
            sinking.x = Math.max(2160, sinking.x - 300 * dt);
            if (carrying) player.x += sinking.x - previousX;
            if (sinking.x <= 2160) {
              s.sinkingPhase = 'hanging';
              s.sinkingTimer = .14;
            }
          }
          if (s.sinkingPhase === 'hanging') {
            s.sinkingTimer -= dt;
            if (s.sinkingTimer <= 0) s.sinkingPhase = 'falling';
          }
          if (s.sinkingPhase === 'falling' && sinking.active) {
            const carrying = standingOn(player, sinking);
            const previousY = sinking.y;
            sinking.y += 560 * dt;
            if (carrying) player.y += sinking.y - previousY;
            if (sinking.y > 550) {
              sinking.active = false;
              s.sinkingPhase = 'gone';
            }
          }
          if (center >= 2100 && !s.preferenceConfirmed) {
            s.preferenceConfirmed = true;
            say('……不像是畫面在壞。像是這一關正在改自己的內容。');
          }

          if (rememberTakeoff(s, 'tenthTakeoff', player, tenth) && finalSpike.phase === 'idle') {
            finalSpike.hidden = false;
            finalSpike.phase = 'ready';
            restyle(s.goal, 5, 2);
            restyle(finalSpike, 1, 2);
            tone(175, .06);
          }
          if (center >= 2600 && !s.nextChapterCommented) {
            s.nextChapterCommented = true;
            say('先出去。後面的檔案，我還沒看完。');
          }

          if (s.doorPhase === 'final' && hit(player, s.goal)) completeLevel();
        }
      }))
    ];
  };
})();
