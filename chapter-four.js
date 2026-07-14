(() => {
  'use strict';

  window.createChapterFourLevels = function createChapterFourLevels(api) {
    const {
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      say,
      tone,
      hit
    } = api;

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: .08, ...build() }),
      { id, title }
    );

    const death = (title, reason, comment, variant = 'tricked') => ({
      title,
      reason,
      comment,
      variant
    });

    const glitch = (strength, phase, period, duration) => ({
      visualGlitch: strength,
      visualGlitchPhase: phase,
      visualGlitchPeriod: period,
      visualGlitchDuration: duration
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

    const carryPlatform = (player, piece, axis, next) => {
      const carrying = standingOn(player, piece);
      const previous = piece[axis];
      piece[axis] = next;
      if (carrying) player[axis] += next - previous;
    };

    const activateRisingSpike = (item, frequency = 180) => {
      if (item.phase !== 'idle') return;
      item.hidden = false;
      item.phase = 'rising';
      tone(frequency, .06);
    };

    const updateRisingSpike = (item, dt) => {
      if (item.phase !== 'rising') return;
      item.y = Math.max(item.riseTo, item.y - item.riseSpeed * dt);
      if (item.y <= item.riseTo) item.phase = 'ready';
    };

    return [
      level('deviation-review', '1', () => ({
        width: 2200,
        hint: '沒有新規則。把前面學過的東西接起來。',
        taunt: '每個陷阱都照順序來。你也一樣。',
        spawn: [70, 418],
        goal: { x: 2110, y: 384, w: 46, h: 76 },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        finalFloorIndex: 7,
        thirdSpikeIndex: 1,
        sixthSpikeIndex: 2,
        ceilingSpikeIndex: 3,
        firstPhase: 'idle',
        fourthPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 405, 130),
          platform(560, 340, 135),
          platform(795, 405, 140),
          platform(1020, 335, 140),
          platform(1245, 405, 145),
          platform(1470, 345, 140),
          platform(1695, FLOOR_Y, 505, 80)
        ],
        spikes: [
          spike(300, 512, 1395, 28, {
            death: death('落點之外', '你沒有落在下一個平台上。', '每一段都能用普通跳躍通過。', 'careless')
          }),
          spike(844, 405, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 377,
            riseSpeed: 380,
            death: death('安全中央', '第三塊平台在你離地後封住了中央。', '平台左右仍然能站。')
          }),
          spike(1519, 345, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 317,
            riseSpeed: 390,
            death: death('又是中央', '最後一塊小平台也沒有把中央留給你。', '同一種落點不會永遠安全。')
          }),
          spike(1760, 300, 270, 34, {
            hidden: true,
            upside: true,
            death: death('多跳一次', '完整地板上方出現了倒掛尖刺。', '門就在前面，這一段不需要跳。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const finalFloor = s.platforms[s.finalFloorIndex];

          if (s.firstPhase === 'idle' && standingOn(player, first)) {
            s.firstPhase = 'warning';
            s.firstTimer = .55;
            first.cracked = true;
            tone(150, .05);
          }
          if (s.firstPhase === 'warning') {
            s.firstTimer -= dt;
            if (s.firstTimer <= 0) {
              first.active = false;
              s.firstPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'secondTakeoff', player, second)) {
            activateRisingSpike(s.spikes[s.thirdSpikeIndex]);
          }

          if (!s.fourthShifted && standingOn(player, third)) {
            s.fourthShifted = true;
            s.fourthPhase = 'moving';
            tone(130, .05);
          }
          if (s.fourthPhase === 'moving') {
            fourth.x = Math.min(1060, fourth.x + 220 * dt);
            if (fourth.x >= 1060) s.fourthPhase = 'ready';
          }

          if (s.fourthSinkPhase === undefined && standingOn(player, fourth)) {
            s.fourthSinkPhase = 'warning';
            s.fourthSinkTimer = .24;
            fourth.cracked = true;
            tone(140, .05);
          }
          if (s.fourthSinkPhase === 'warning') {
            s.fourthSinkTimer -= dt;
            if (s.fourthSinkTimer <= 0) s.fourthSinkPhase = 'falling';
          }
          if (s.fourthSinkPhase === 'falling' && fourth.active) {
            carryPlatform(player, fourth, 'y', fourth.y + 520 * dt);
            if (fourth.y > 560) {
              fourth.active = false;
              s.fourthSinkPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'fifthTakeoff', player, fifth)) {
            activateRisingSpike(s.spikes[s.sixthSpikeIndex], 170);
          }

          if (standingOn(player, finalFloor)) {
            s.finalJumpReady = true;
            s.finalJumpBaseline = player.jumps;
          }
          if (
            s.finalJumpReady &&
            !s.ceilingRevealed &&
            !player.grounded &&
            player.jumps > (s.finalJumpBaseline ?? player.jumps)
          ) {
            s.ceilingRevealed = true;
            s.spikes[s.ceilingSpikeIndex].hidden = false;
            tone(115, .08);
          }

          updateRisingSpike(s.spikes[s.thirdSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.sixthSpikeIndex], dt);
        }
      })),

      level('deviation-lag', '2', () => ({
        width: 2250,
        hint: '有些地板反應慢一點。看到裂痕就離開。',
        taunt: '它們只是晚一點動，你倒是每次準時掉下去。',
        spawn: [70, 418],
        goal: { x: 2160, y: 384, w: 46, h: 76 },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        fifthSpikeIndex: 1,
        firstPhase: 'idle',
        thirdPhase: 'idle',
        fifthPhase: 'idle',
        sixthPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 400, 130),
          platform(580, 335, 135),
          platform(800, 400, 140),
          platform(1020, 335, 140),
          platform(1250, 400, 145),
          platform(1480, 340, 140),
          platform(1720, FLOOR_Y, 530, 80)
        ],
        spikes: [
          spike(300, 512, 1420, 28, {
            death: death('落點之外', '你沒有落在下一個平台上。', '延遲不會改變平台之間的距離。', 'careless')
          }),
          spike(1302, 400, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 372,
            riseSpeed: 390,
            death: death('等到它完成', '尖刺等你站穩後才從腳下出現。', '落地不代表可以停下來。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const sixth = s.platforms[s.sixthPlatformIndex];

          if (s.firstPhase === 'idle' && standingOn(player, first)) {
            s.firstPhase = 'armed';
            first.cracked = true;
          }
          if (s.firstPhase === 'armed' && standingOn(player, second)) {
            s.firstPhase = 'falling';
            say('……比我說的還慢。');
            tone(125, .06);
          }
          if (s.firstPhase === 'falling' && first.active) {
            first.y += 560 * dt;
            if (first.y > 560) {
              first.active = false;
              s.firstPhase = 'gone';
            }
          }

          if (!s.fourthShifted && rememberTakeoff(s, 'secondTakeoff', player, second)) {
            s.fourthShifted = true;
            fourth.x = 990;
            tone(140, .05);
          }

          if (s.thirdPhase === 'idle' && standingOn(player, third)) {
            s.thirdPhase = 'warning';
            s.thirdTimer = .25;
            third.cracked = true;
          }
          if (s.thirdPhase === 'warning') {
            s.thirdTimer -= dt;
            if (s.thirdTimer <= 0) {
              third.active = false;
              s.thirdPhase = 'gone';
            }
          }

          if (s.fifthPhase === 'idle' && rememberTakeoff(s, 'fourthTakeoff', player, fourth)) {
            s.fifthPhase = 'escaping';
            say('它剛才明明沒有反應。');
            tone(110, .07);
          }
          if (s.fifthPhase === 'escaping') {
            fifth.x = Math.min(1360, fifth.x + 620 * dt);
            if (fifth.x >= 1360) {
              s.fifthPhase = 'away';
              s.fifthTimer = .28;
            }
          } else if (s.fifthPhase === 'away') {
            s.fifthTimer -= dt;
            if (s.fifthTimer <= 0) s.fifthPhase = 'returning';
          } else if (s.fifthPhase === 'returning') {
            fifth.x = Math.max(1250, fifth.x - 520 * dt);
            if (fifth.x <= 1250) {
              s.fifthPhase = 'ready';
              say('……現在又回去了。');
            }
          }

          if (!s.fifthSpikeArmed && standingOn(player, fifth)) {
            s.fifthSpikeArmed = true;
            s.fifthSpikeTimer = .3;
          }
          if (s.fifthSpikeArmed && s.spikes[s.fifthSpikeIndex].phase === 'idle') {
            s.fifthSpikeTimer -= dt;
            if (s.fifthSpikeTimer <= 0) activateRisingSpike(s.spikes[s.fifthSpikeIndex], 165);
          }

          if (s.sixthPhase === 'idle' && standingOn(player, sixth)) {
            s.sixthPhase = 'warning';
            s.sixthTimer = .28;
            sixth.cracked = true;
          }
          if (s.sixthPhase === 'warning') {
            s.sixthTimer -= dt;
            if (s.sixthTimer <= 0) {
              sixth.active = false;
              s.sixthPhase = 'gone';
            }
          }

          updateRisingSpike(s.spikes[s.fifthSpikeIndex], dt);
        }
      })),

      level('deviation-order', '3', () => ({
        width: 2450,
        hint: '這些平台會照順序移動。……應該會。',
        taunt: '它每次都用同一個錯誤順序。你倒是還沒記住。',
        spawn: [70, 418],
        goal: { x: 2360, y: 384, w: 46, h: 76 },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fourthPlatformIndex: 4,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        seventhPlatformIndex: 7,
        thirdPhase: 'waiting',
        fifthPhase: 'buried',
        sixthPhase: 'waiting',
        p5SpikeIndex: 1,
        p7SpikeIndex: 2,
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 405, 130),
          platform(580, 340, 135),
          platform(845, 405, 140),
          platform(1015, 335, 140),
          platform(1240, 560, 140, 24, { active: false, solid: false }),
          platform(1570, 335, 140),
          platform(1700, 405, 145),
          platform(1930, FLOOR_Y, 520, 80)
        ],
        spikes: [
          spike(300, 512, 1630, 28, {
            death: death('錯誤順序', '你跳向了還沒移到位的平台。', '每次重生後，它仍會用同一個順序。', 'careless')
          }),
          spike(1289, 400, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 372,
            riseSpeed: 390,
            death: death('等太久', '你站到第五塊平台的尖刺完成反應。', '它只給你等待下一塊移動的時間。')
          }),
          spike(1751, 405, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 377,
            riseSpeed: 390,
            death: death('不安全的中央', '前一塊平台讓這裡的中央升出了尖刺。', '落點兩側仍然安全。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fourth = s.platforms[s.fourthPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const sixth = s.platforms[s.sixthPlatformIndex];

          if (s.thirdPhase === 'waiting' && rememberTakeoff(s, 'firstTakeoff', player, first)) {
            s.thirdPhase = 'moving';
            say('……動的不是下一塊。先繼續。');
            tone(125, .06);
          }
          if (s.thirdPhase === 'moving') {
            third.x = Math.max(790, third.x - 300 * dt);
            if (third.x <= 790) s.thirdPhase = 'ready';
          }

          if (s.fifthPhase === 'buried' && standingOn(player, second)) {
            s.fifthPhase = 'rising';
            fifth.active = true;
            tone(135, .06);
          }
          if (s.fifthPhase === 'rising') {
            fifth.y = Math.max(400, fifth.y - 520 * dt);
            if (fifth.y <= 400) {
              fifth.y = 400;
              fifth.solid = true;
              s.fifthPhase = 'ready';
            }
          }

          if (s.thirdDropPhase === undefined && standingOn(player, third)) {
            s.thirdDropPhase = 'warning';
            s.thirdDropTimer = .24;
            third.cracked = true;
          }
          if (s.thirdDropPhase === 'warning') {
            s.thirdDropTimer -= dt;
            if (s.thirdDropTimer <= 0) {
              third.active = false;
              s.thirdDropPhase = 'gone';
            }
          }

          if (!s.cameoUsed && standingOn(player, fourth)) {
            s.cameoUsed = true;
            s.firstFlying = true;
            s.goal.x = fourth.x + 45;
            s.goal.y = fourth.y - 92;
            s.goal.locked = true;
            s.goalCameoTimer = .28;
            say('你沒有碰它。門也不該在這裡。');
            tone(95, .1);
          }
          if (s.firstFlying) {
            first.y -= 430 * dt;
            if (first.y < 45) s.firstFlying = false;
          }
          if (s.goalCameoTimer > 0) {
            s.goalCameoTimer -= dt;
            if (s.goalCameoTimer <= 0) {
              s.goal.x = 2360;
              s.goal.y = 384;
              s.goal.locked = false;
            }
          }

          if (s.sixthPhase === 'waiting' && standingOn(player, fifth)) {
            s.sixthPhase = 'moving';
            s.p5SpikeTimer = .55;
            tone(130, .06);
          }
          if (s.sixthPhase === 'moving') {
            sixth.x = Math.max(1480, sixth.x - 360 * dt);
            if (sixth.x <= 1480) s.sixthPhase = 'ready';
          }
          if (s.p5SpikeTimer > 0 && s.spikes[s.p5SpikeIndex].phase === 'idle') {
            s.p5SpikeTimer -= dt;
            if (s.p5SpikeTimer <= 0) activateRisingSpike(s.spikes[s.p5SpikeIndex], 160);
          }

          if (rememberTakeoff(s, 'sixthTakeoff', player, sixth)) {
            activateRisingSpike(s.spikes[s.p7SpikeIndex], 170);
          }

          updateRisingSpike(s.spikes[s.p5SpikeIndex], dt);
          updateRisingSpike(s.spikes[s.p7SpikeIndex], dt);
        }
      })),

      level('deviation-flicker', '4', () => ({
        width: 2600,
        hint: '這關應該和前面一樣。',
        taunt: '我也看見那塊平台了。至少大部分時間。',
        spawn: [70, 418],
        goal: { x: 2510, y: 384, w: 46, h: 76 },
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        seventhPlatformIndex: 7,
        eighthPlatformIndex: 8,
        secondPhase: 'waiting',
        firstPhase: 'waiting',
        seventhPhase: 'waiting',
        sixthPhase: 'idle',
        eighthPhase: 'idle',
        floorSpikeIndex: 2,
        seventhSpikeIndex: 3,
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 400, 140, 24, { ...glitch(.06, 5.2, 6.2, .05) }),
          platform(590, 330, 140),
          platform(840, 400, 140),
          platform(1050, FLOOR_Y, 240, 80),
          platform(1360, 400, 140),
          platform(1580, 330, 140),
          platform(1800, 400, 140),
          platform(2010, 340, 140),
          platform(2250, FLOOR_Y, 350, 80)
        ],
        spikes: [
          spike(300, 512, 750, 28, {
            death: death('前半落點', '你沒有落在下一個平台上。', '閃爍沒有改變平台的位置。', 'careless')
          }),
          spike(1290, 512, 960, 28, {
            death: death('後半落點', '你沒有落在下一個平台上。', '平台仍然按照固定位置停下。', 'careless')
          }),
          spike(1050, 460, 50, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 432,
            riseSpeed: 390,
            death: death('地板前緣', '第四塊落點的前緣升出了尖刺。', '再往裡落一點仍然安全。')
          }),
          spike(1799, 400, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 372,
            riseSpeed: 390,
            death: death('移動後的中央', '遠處平台移動後，中央又升出了尖刺。', '這次仍然可以落在邊緣。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const sixth = s.platforms[s.sixthPlatformIndex];
          const seventh = s.platforms[s.seventhPlatformIndex];
          const eighth = s.platforms[s.eighthPlatformIndex];

          if (!s.flickerCommented && center >= 300) {
            s.flickerCommented = true;
            say('……剛才有一塊平台閃了一下。');
          }

          if (s.secondPhase === 'waiting' && center >= 300) {
            s.secondPhase = 'moving';
          }
          if (s.secondPhase === 'moving') {
            second.x = Math.min(620, second.x + 180 * dt);
            if (second.x >= 620) s.secondPhase = 'ready';
          }

          if (s.firstPhase === 'waiting' && rememberTakeoff(s, 'secondTakeoff', player, second)) {
            s.firstPhase = 'falling';
            say('我剛剛沒有看錯吧？');
            tone(115, .07);
          }
          if (s.firstPhase === 'falling' && first.active) {
            first.y += 540 * dt;
            if (first.y > 560) {
              first.active = false;
              s.firstPhase = 'gone';
            }
          }

          if (!s.floorSpikeUsed && standingOn(player, third)) {
            s.floorSpikeUsed = true;
            activateRisingSpike(s.spikes[s.floorSpikeIndex], 170);
          }

          if (s.seventhPhase === 'waiting' && rememberTakeoff(s, 'fifthTakeoff', player, fifth)) {
            s.seventhPhase = 'moving';
            say('又不是下一塊。這不是單純的延遲。');
            tone(120, .07);
          }
          if (s.seventhPhase === 'moving') {
            seventh.x = Math.max(1750, seventh.x - 260 * dt);
            if (seventh.x <= 1750) s.seventhPhase = 'ready';
          }

          if (s.sixthPhase === 'idle' && standingOn(player, sixth)) {
            s.sixthPhase = 'warning';
            s.sixthTimer = .25;
            sixth.cracked = true;
          }
          if (s.sixthPhase === 'warning') {
            s.sixthTimer -= dt;
            if (s.sixthTimer <= 0) s.sixthPhase = 'falling';
          }
          if (s.sixthPhase === 'falling' && sixth.active) {
            carryPlatform(player, sixth, 'y', sixth.y + 500 * dt);
            if (sixth.y > 560) {
              sixth.active = false;
              s.sixthPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'sixthTakeoff', player, sixth)) {
            activateRisingSpike(s.spikes[s.seventhSpikeIndex], 165);
          }

          if (s.eighthPhase === 'idle' && standingOn(player, eighth)) {
            s.eighthPhase = 'warning';
            s.eighthTimer = .28;
            eighth.cracked = true;
          }
          if (s.eighthPhase === 'warning') {
            s.eighthTimer -= dt;
            if (s.eighthTimer <= 0) {
              eighth.active = false;
              s.eighthPhase = 'gone';
            }
          }

          if (!s.exitCommented && center >= 2250) {
            s.exitCommented = true;
            say('先出去。我再看一次。');
          }

          updateRisingSpike(s.spikes[s.floorSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.seventhSpikeIndex], dt);
        }
      })),

      level('deviation-threshold', '5', () => ({
        width: 2800,
        hint: '這關……等一下。先往右走，我看看。',
        taunt: '我也看見它在那裡。剛才。',
        spawn: [70, 418],
        goal: {
          x: 1130,
          y: 384,
          w: 46,
          h: 76,
          locked: true,
          ...glitch(.1, 2.3, 4.7, .075)
        },
        doorPhase: 'first',
        firstPlatformIndex: 1,
        secondPlatformIndex: 2,
        thirdPlatformIndex: 3,
        doorFloorIndex: 4,
        fifthPlatformIndex: 5,
        sixthPlatformIndex: 6,
        seventhPlatformIndex: 7,
        eighthPlatformIndex: 8,
        ninthPlatformIndex: 9,
        thirdSpikeIndex: 2,
        doorFloorSpikeIndex: 3,
        ninthSpikeIndex: 4,
        finalFloorSpikeIndex: 5,
        thirdPhase: 'waiting',
        firstPhase: 'idle',
        doorFloorPhase: 'idle',
        fifthPhase: 'idle',
        seventhPhase: 'waiting',
        eighthPhase: 'waiting',
        seventhDropPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 400, 140, 24, { ...glitch(.07, 4.8, 5.7, .06) }),
          platform(590, 330, 140),
          platform(810, 400, 140),
          platform(1010, FLOOR_Y, 230, 80),
          platform(1310, 400, 140, 24, { visualRotation: Math.PI / 180, ...glitch(.09, 1.1, 5.1, .07) }),
          platform(1530, 330, 140),
          platform(1750, 400, 140),
          platform(1970, 330, 140),
          platform(2190, 400, 140),
          platform(2420, FLOOR_Y, 380, 80)
        ],
        spikes: [
          spike(300, 512, 710, 28, {
            death: death('前半落點', '你沒有落在下一個平台上。', '前半段仍然使用普通跳躍。', 'careless')
          }),
          spike(1240, 512, 1180, 28, {
            death: death('後半落點', '你沒有落在下一個平台上。', '閃爍沒有改變實際落點。', 'careless')
          }),
          spike(819, 400, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 372,
            riseSpeed: 390,
            death: death('第三塊中央', '尖刺在你離開第二塊後出現。', '第三塊平台兩側仍然安全。')
          }),
          spike(1010, 512, 230, 28, {
            hidden: true,
            death: death('門先離開', '你留在了門原本的地板上。', '門消失後，前方平台仍然存在。')
          }),
          spike(2239, 400, 42, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 372,
            riseSpeed: 390,
            death: death('錯誤的中央', '倒數第二塊平台中央升出了尖刺。', '靠近邊緣落地仍然安全。')
          }),
          spike(2420, 460, 50, 28, {
            hidden: true,
            phase: 'idle',
            riseTo: 432,
            riseSpeed: 390,
            death: death('最後前緣', '終點地板最前面也不是落點。', '最後一跳需要再往裡一點。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const startFloor = s.platforms[0];
          const first = s.platforms[s.firstPlatformIndex];
          const second = s.platforms[s.secondPlatformIndex];
          const third = s.platforms[s.thirdPlatformIndex];
          const doorFloor = s.platforms[s.doorFloorIndex];
          const fifth = s.platforms[s.fifthPlatformIndex];
          const sixth = s.platforms[s.sixthPlatformIndex];
          const seventh = s.platforms[s.seventhPlatformIndex];
          const eighth = s.platforms[s.eighthPlatformIndex];
          const ninth = s.platforms[s.ninthPlatformIndex];

          if (s.firstPhase === 'idle' && standingOn(player, first)) {
            s.firstPhase = 'armed';
            first.cracked = true;
          }
          if (s.thirdPhase === 'waiting' && rememberTakeoff(s, 'firstTakeoff', player, first)) {
            s.thirdPhase = 'moving';
            s.firstPhase = 'warning';
            s.firstTimer = .26;
            say('不是下一塊。又不是。');
            tone(120, .07);
          }
          if (s.thirdPhase === 'moving') {
            third.x = Math.max(770, third.x - 280 * dt);
            if (third.x <= 770) s.thirdPhase = 'ready';
          }
          if (s.firstPhase === 'warning') {
            s.firstTimer -= dt;
            if (s.firstTimer <= 0) {
              first.active = false;
              s.firstPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'secondTakeoff', player, second)) {
            activateRisingSpike(s.spikes[s.thirdSpikeIndex], 165);
          }

          if (!s.startFloorFlying && standingOn(player, third)) {
            s.startFloorFlying = true;
            s.thirdDropTimer = .26;
            third.cracked = true;
            say('……我不知道。先別回頭。');
          }
          if (s.startFloorFlying) {
            startFloor.y -= 400 * dt;
            if (startFloor.y < 40) s.startFloorFlying = false;
          }
          if (s.thirdDropTimer > 0) {
            s.thirdDropTimer -= dt;
            if (s.thirdDropTimer <= 0) third.active = false;
          }

          if (s.doorPhase === 'first' && hit(player, s.goal)) {
            s.doorPhase = 'relocating';
            s.goal.hidden = true;
            s.goal.x = 2710;
            s.goal.y = 384;
            s.goalRevealTimer = .18;
            s.doorFloorPhase = 'warning';
            s.doorFloorTimer = .38;
            doorFloor.cracked = true;
            say('門還在。應該還在。');
            tone(90, .12);
          }
          if (s.doorPhase === 'relocating') {
            s.goalRevealTimer -= dt;
            if (s.goalRevealTimer <= 0) {
              s.doorPhase = 'final';
              s.goal.hidden = false;
              s.goal.locked = false;
            }
          }
          if (s.doorFloorPhase === 'warning') {
            s.doorFloorTimer -= dt;
            if (s.doorFloorTimer <= 0) {
              s.doorFloorPhase = 'falling';
              s.spikes[s.doorFloorSpikeIndex].hidden = false;
            }
          }
          if (s.doorFloorPhase === 'falling' && doorFloor.active) {
            carryPlatform(player, doorFloor, 'y', doorFloor.y + 560 * dt);
            if (doorFloor.y > 560) {
              doorFloor.active = false;
              s.doorFloorPhase = 'gone';
            }
          }

          if (s.fifthPhase === 'idle' && standingOn(player, fifth)) {
            s.fifthPhase = 'warning';
            s.fifthTimer = .32;
            fifth.cracked = true;
          }
          if (s.fifthPhase === 'warning') {
            s.fifthTimer -= dt;
            if (s.fifthTimer <= 0) s.fifthPhase = 'falling';
          }
          if (s.fifthPhase === 'falling' && fifth.active) {
            carryPlatform(player, fifth, 'y', fifth.y + 500 * dt);
            if (fifth.y > 560) {
              fifth.active = false;
              s.fifthPhase = 'gone';
            }
          }

          if (s.seventhPhase === 'waiting' && rememberTakeoff(s, 'fifthTakeoff', player, fifth)) {
            s.seventhPhase = 'moving';
          }
          if (s.seventhPhase === 'moving') {
            seventh.x = Math.max(1710, seventh.x - 240 * dt);
            if (seventh.x <= 1710) s.seventhPhase = 'ready';
          }

          if (s.eighthPhase === 'waiting' && rememberTakeoff(s, 'sixthTakeoff', player, sixth)) {
            s.eighthPhase = 'moving';
            say('這個順序我看不懂。');
          }
          if (s.eighthPhase === 'moving') {
            eighth.y = Math.min(350, eighth.y + 140 * dt);
            if (eighth.y >= 350) s.eighthPhase = 'ready';
          }

          if (s.seventhDropPhase === 'idle' && standingOn(player, seventh)) {
            s.seventhDropPhase = 'warning';
            s.seventhDropTimer = .24;
            seventh.cracked = true;
          }
          if (s.seventhDropPhase === 'warning') {
            s.seventhDropTimer -= dt;
            if (s.seventhDropTimer <= 0) {
              seventh.active = false;
              s.seventhDropPhase = 'gone';
            }
          }

          if (rememberTakeoff(s, 'eighthTakeoff', player, eighth)) {
            activateRisingSpike(s.spikes[s.ninthSpikeIndex], 165);
          }
          if (rememberTakeoff(s, 'ninthTakeoff', player, ninth)) {
            activateRisingSpike(s.spikes[s.finalFloorSpikeIndex], 155);
          }

          if (!s.exitCommented && center >= 2420) {
            s.exitCommented = true;
            say('先出去。下一章載入完也許就會正常。');
          }

          updateRisingSpike(s.spikes[s.thirdSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.ninthSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.finalFloorSpikeIndex], dt);
        }
      }))
    ];
  };
})();
