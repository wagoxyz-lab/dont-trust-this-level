(() => {
  'use strict';

  window.createChapterThreeLevels = function createChapterThreeLevels(api) {
    const {
      FLOOR_Y,
      platform,
      spike,
      getPlayer,
      tone,
      hit
    } = api;

    const level = (id, title, build) => Object.assign(
      () => ({ id, title, corruption: .03, ...build() }),
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
      level('official-directions', '1', () => ({
        width: 1900,
        hint: '現在開始請自己努力，我沒辦法像之前一樣幫助你了。',
        taunt: '反應夠快了。現在試著不要每次都用同一個反應。',
        spawn: [70, 418],
        goal: { x: 1810, y: 384, w: 46, h: 76 },
        ceilingSpikeIndex: 1,
        firstPopSpikeIndex: 2,
        rearSpikeIndex: 3,
        frontSpikeIndex: 4,
        gapSpikeIndex: 6,
        platforms: [platform(0, FLOOR_Y, 1900, 80)],
        spikes: [
          spike(340, 432, 42, 28, {
            death: death('第一根', '你碰到了唯一一根先讓你看見的尖刺。', '後面的不一定會先出現。', 'careless')
          }),
          spike(300, 295, 125, 34, {
            hidden: true,
            upside: true,
            death: death('跳得太完整', '你用完整跳躍處理了第一根尖刺。', '上方也算路線的一部分。')
          }),
          spike(720, 432, 44, 28, {
            hidden: true,
            death: death('空地反悔', '尖刺在你抵達前出現了。', '它出現時，你還有一次起跳的距離。')
          }),
          spike(925, 432, 44, 28, {
            hidden: true,
            death: death('退路關閉', '你看見前方變化後立刻往回走。', '前後兩根是一起出現的。')
          }),
          spike(1080, 432, 44, 28, {
            hidden: true,
            death: death('前路關閉', '你沒有跳過突然出現的前方尖刺。', '後退也不是這一段的答案。')
          }),
          spike(1360, 432, 34, 28),
          spike(1410, 432, 34, 28, {
            hidden: true,
            death: death('空位取消', '你打算落在兩根尖刺中間。', '這一組只留了一次落地。')
          }),
          spike(1450, 432, 34, 28)
        ],
        spikeDeath: death('尖刺', '你碰到了尖刺。', '它們這次沒有移動。', 'careless'),
        update(s) {
          const player = getPlayer();
          const center = player.x + player.w / 2;

          if (
            !s.ceilingRevealed &&
            !player.grounded &&
            center >= 245 &&
            center <= 425
          ) {
            s.ceilingRevealed = true;
            s.spikes[s.ceilingSpikeIndex].hidden = false;
            tone(145, .07);
          }

          if (!s.firstPopRevealed && center >= 650) {
            s.firstPopRevealed = true;
            s.spikes[s.firstPopSpikeIndex].hidden = false;
            tone(190, .05);
          }

          if (!s.corridorClosed && center >= 1000) {
            s.corridorClosed = true;
            s.spikes[s.rearSpikeIndex].hidden = false;
            s.spikes[s.frontSpikeIndex].hidden = false;
            tone(120, .08);
          }

          if (
            !s.gapClosed &&
            !player.grounded &&
            center >= 1320 &&
            center <= 1490
          ) {
            s.gapClosed = true;
            s.spikes[s.gapSpikeIndex].hidden = false;
            tone(135, .07);
          }
        }
      })),

      level('official-drop', '2', () => ({
        width: 1900,
        hint: '',
        taunt: '每一塊都能站。只是不能站你第一眼選的位置。',
        spawn: [70, 418],
        goal: { x: 1810, y: 384, w: 46, h: 76 },
        landingSpikeIndices: [1, 2, 3, 4, 5, 6, 7, 8],
        platformSpikeGroups: {
          1: [1],
          2: [2],
          3: [3, 4],
          4: [5],
          5: [6, 7],
          6: [8]
        },
        platforms: [
          platform(0, FLOOR_Y, 260, 80),
          platform(330, 410, 170),
          platform(560, 350, 180),
          platform(800, 290, 180),
          platform(1040, 350, 180),
          platform(1280, 410, 180),
          platform(1520, FLOOR_Y, 380, 80)
        ],
        spikes: [
          spike(260, 512, 1260, 28, {
            death: death('落點以外', '你沒有落在下一塊平台上。', '每一段都使用普通跳躍。', 'careless')
          }),
          spike(420, 410, 34, 28, {
            hidden: true, phase: 'idle', riseTo: 382, riseSpeed: 330,
            death: death('第一塊的中間', '平台在你落地後才長出尖刺。', '同一塊平台上還有左右兩邊。')
          }),
          spike(565, 350, 38, 28, {
            hidden: true, phase: 'idle', riseTo: 322, riseSpeed: 360,
            death: death('落得太早', '你落在下一塊平台最先接到的位置。', '右側仍然能站。')
          }),
          spike(805, 290, 34, 28, {
            hidden: true, phase: 'idle', riseTo: 262, riseSpeed: 360,
            death: death('沒有置中', '平台只留下中央那一段。', '兩側是一起出現的。')
          }),
          spike(941, 290, 34, 28, {
            hidden: true, phase: 'idle', riseTo: 262, riseSpeed: 360,
            death: death('沒有置中', '平台只留下中央那一段。', '兩側是一起出現的。')
          }),
          spike(1110, 350, 40, 28, {
            hidden: true, phase: 'idle', riseTo: 322, riseSpeed: 360,
            death: death('正中陷阱', '你把平台中央當成最穩的落點。', '左右兩側都還能站。')
          }),
          spike(1285, 410, 34, 28, {
            hidden: true, phase: 'idle', riseTo: 382, riseSpeed: 360,
            death: death('沒有置中', '最後一塊小平台只留下中央。', '兩側是一起出現的。')
          }),
          spike(1421, 410, 34, 28, {
            hidden: true, phase: 'idle', riseTo: 382, riseSpeed: 360,
            death: death('沒有置中', '最後一塊小平台只留下中央。', '兩側是一起出現的。')
          }),
          spike(1520, 460, 50, 28, {
            hidden: true, phase: 'idle', riseTo: 432, riseSpeed: 380,
            death: death('終點左側', '你只確認自己跳到了終點地板。', '還要越過它最前面的一段。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();

          const activateGroup = platformIndex => {
            for (const spikeIndex of s.platformSpikeGroups[platformIndex] || []) {
              activateRisingSpike(s.spikes[spikeIndex]);
            }
          };

          for (let index = 1; index <= 5; index += 1) {
            const piece = s.platforms[index];
            const baselineKey = `jumpBaseline${index}`;
            const readyKey = `jumpReady${index}`;

            if (standingOn(player, piece)) {
              if (index === 1) activateGroup(1);
              s[readyKey] = true;
              s[baselineKey] = player.jumps;
            }

            if (
              s[readyKey] &&
              !player.grounded &&
              player.jumps > (s[baselineKey] ?? player.jumps)
            ) {
              s[readyKey] = false;
              activateGroup(index + 1);
            }
          }

          for (const index of s.landingSpikeIndices) updateRisingSpike(s.spikes[index], dt);
        }
      })),

      level('official-spacing', '3', () => ({
        width: 1900,
        hint: '',
        taunt: '前兩次跳得很好，所以第三次才特別有效。',
        spawn: [70, 418],
        goal: { x: 1810, y: 384, w: 46, h: 76 },
        fallingPanelIndices: [1, 3],
        floorSpikeIndices: [0, 1],
        ceilingSpikeIndex: 2,
        jumpingSpikeIndex: 3,
        thirdZone: { from: 980, to: 1230 },
        jumpingSpikeZone: { from: 1340, to: 1515 },
        panelPhases: ['idle', 'idle'],
        jumpingSpikePhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(300, FLOOR_Y, 130, 80),
          platform(430, FLOOR_Y, 220, 80),
          platform(650, FLOOR_Y, 130, 80),
          platform(780, FLOOR_Y, 270, 80),
          platform(1050, FLOOR_Y, 130, 80),
          platform(1180, FLOOR_Y, 720, 80)
        ],
        spikes: [
          spike(300, 432, 130, 28, {
            hidden: true,
            death: death('第一塊地板', '地板掉下去後，下面只剩尖刺。', '它裂開時仍有時間起跳。')
          }),
          spike(650, 432, 130, 28, {
            hidden: true,
            death: death('第二塊地板', '第二塊也照同樣的方式掉了。', '這一次重複反應仍然正確。')
          }),
          spike(1020, 300, 190, 40, {
            hidden: true,
            upside: true,
            death: death('第三次起跳', '第三塊地板沒有掉，尖刺反而從上方出現。', '前兩次的答案不能直接抄。')
          }),
          spike(1480, 432, 42, 28, {
            phase: 'idle',
            death: death('尖刺也會跳', '你起跳時，尖刺也往上跳了。', '先讓它跳完，再處理原本的位置。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;

          s.fallingPanelIndices.forEach((platformIndex, order) => {
            const piece = s.platforms[platformIndex];
            const danger = s.spikes[s.floorSpikeIndices[order]];
            const triggerX = order === 0 ? 330 : 680;

            if (s.panelPhases[order] === 'idle' && center >= triggerX) {
              s.panelPhases[order] = 'warning';
              s[`panelTimer${order}`] = .16;
              piece.cracked = true;
              tone(150, .06);
            }

            if (s.panelPhases[order] === 'warning') {
              s[`panelTimer${order}`] -= dt;
              if (s[`panelTimer${order}`] <= 0) {
                s.panelPhases[order] = 'falling';
                danger.hidden = false;
              }
            }

            if (s.panelPhases[order] === 'falling' && piece.active) {
              carryPlatform(player, piece, 'y', piece.y + 700 * dt);
              if (piece.y > 560) {
                piece.active = false;
                s.panelPhases[order] = 'gone';
              }
            }
          });

          if (player.grounded && center >= 900 && center <= s.thirdZone.to) {
            s.thirdJumpReady = true;
            s.thirdJumpBaseline = player.jumps;
          }
          if (
            s.thirdJumpReady &&
            !s.thirdJumpTriggered &&
            !player.grounded &&
            player.jumps > (s.thirdJumpBaseline ?? player.jumps) &&
            center >= s.thirdZone.from &&
            center <= s.thirdZone.to
          ) {
            s.thirdJumpTriggered = true;
            s.spikes[s.ceilingSpikeIndex].hidden = false;
            tone(120, .08);
          }

          if (
            s.jumpingSpikePhase === 'idle' &&
            !player.grounded &&
            center >= s.jumpingSpikeZone.from &&
            center <= s.jumpingSpikeZone.to
          ) {
            s.jumpingSpikePhase = 'rising';
            tone(170, .05);
          }
          const jumpingSpike = s.spikes[s.jumpingSpikeIndex];
          if (s.jumpingSpikePhase === 'rising') {
            jumpingSpike.y = Math.max(330, jumpingSpike.y - 520 * dt);
            if (jumpingSpike.y <= 330) {
              s.jumpingSpikePhase = 'falling';
              s.jumpingSpikePause = .06;
            }
          } else if (s.jumpingSpikePhase === 'falling') {
            s.jumpingSpikePause -= dt;
            if (s.jumpingSpikePause <= 0) {
              jumpingSpike.y = Math.min(432, jumpingSpike.y + 520 * dt);
              if (jumpingSpike.y >= 432) s.jumpingSpikePhase = 'settled';
            }
          }
        }
      })),

      level('official-transfer', '4', () => ({
        width: 2200,
        hint: '',
        taunt: '不要只等距離最短。也看看那裡還剩多少高度。',
        spawn: [70, 418],
        goal: { x: 2120, y: 384, w: 46, h: 76 },
        firstCarrierIndex: 1,
        verticalCarrierIndex: 3,
        finalCarrierIndex: 5,
        destinationPlatformIndex: 6,
        firstCeilingSpikeIndex: 1,
        destinationSpikeIndex: 3,
        finalFloorSpikeIndex: 4,
        platforms: [
          platform(0, FLOOR_Y, 260, 80),
          platform(330, 410, 120, 24, {
            moving: { axis: 'x', from: 330, to: 500, speed: 110 }
          }),
          platform(580, 350, 130),
          platform(790, 420, 125, 24, {
            moving: { axis: 'y', from: 300, to: 420, speed: 90, direction: -1 }
          }),
          platform(1010, 340, 130),
          platform(1240, 405, 130, 24, {
            moving: { axis: 'x', from: 1190, to: 1400, speed: 120 }
          }),
          platform(1515, 355, 150),
          platform(1740, FLOOR_Y, 460, 80)
        ],
        spikes: [
          spike(260, 512, 1480, 28, {
            death: death('轉乘失敗', '你沒有落在下一塊平台上。', '平台的移動週期每次都相同。', 'careless')
          }),
          spike(445, 285, 130, 34, {
            hidden: true,
            upside: true,
            death: death('等得太剛好', '平台靠近時，完整跳躍的高度被封住了。', '最短距離不一定留有足夠高度。')
          }),
          spike(780, 240, 145, 34, {
            upside: true,
            death: death('最高點', '你在垂直平台太高的位置起跳。', '尖刺從一開始就在上面。', 'careless')
          }),
          spike(1520, 355, 40, 28, {
            hidden: true, phase: 'idle', riseTo: 327, riseSpeed: 360,
            death: death('靠得不夠近', '你在移動平台剛進入範圍時就跳了。', '它還會再往右一點。')
          }),
          spike(1740, 460, 50, 28, {
            hidden: true, phase: 'idle', riseTo: 432, riseSpeed: 380,
            death: death('終點前緣', '固定地板的最前面也長出了尖刺。', '下降高度足夠你直接落到它後面。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const firstCarrier = s.platforms[s.firstCarrierIndex];
          const finalCarrier = s.platforms[s.finalCarrierIndex];
          const destination = s.platforms[s.destinationPlatformIndex];

          if (
            !s.firstCeilingRevealed &&
            standingOn(player, firstCarrier) &&
            firstCarrier.x >= 405
          ) {
            s.firstCeilingRevealed = true;
            s.spikes[s.firstCeilingSpikeIndex].hidden = false;
            tone(135, .07);
          }

          if (standingOn(player, finalCarrier)) {
            s.carrierJumpReady = true;
            s.carrierJumpBaseline = player.jumps;
          }
          if (
            s.carrierJumpReady &&
            !player.grounded &&
            player.jumps > (s.carrierJumpBaseline ?? player.jumps)
          ) {
            s.carrierJumpReady = false;
            activateRisingSpike(s.spikes[s.destinationSpikeIndex]);
          }

          if (standingOn(player, destination)) {
            s.finalJumpReady = true;
            s.finalJumpBaseline = player.jumps;
          }
          if (
            s.finalJumpReady &&
            !player.grounded &&
            player.jumps > (s.finalJumpBaseline ?? player.jumps)
          ) {
            s.finalJumpReady = false;
            activateRisingSpike(s.spikes[s.finalFloorSpikeIndex]);
          }

          updateRisingSpike(s.spikes[s.destinationSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.finalFloorSpikeIndex], dt);
        }
      })),

      level('official-four-platforms', '5', () => ({
        width: 2600,
        hint: '',
        taunt: '兩道門都是真的。只是都不打算待在第一次看到的位置。',
        spawn: [70, 418],
        goal: { x: 1290, y: 384, w: 46, h: 76 },
        doorPhase: 'first',
        firstCrumbleIndex: 1,
        firstDoorFloorIndex: 5,
        risingLandingIndex: 6,
        sinkingPlatformIndex: 7,
        finalLandingIndex: 8,
        firstDoorFloorSpikeIndex: 2,
        risingLandingSpikeIndex: 3,
        finalLandingSpikeIndex: 4,
        finalCeilingSpikeIndex: 7,
        firstCrumblePhase: 'idle',
        firstDoorFloorPhase: 'idle',
        sinkingPhase: 'idle',
        platforms: [
          platform(0, FLOOR_Y, 300, 80),
          platform(370, 405, 120),
          platform(560, 340, 130),
          platform(770, 405, 130),
          platform(930, FLOOR_Y, 190, 80),
          platform(1120, FLOOR_Y, 230, 80),
          platform(1420, 400, 140),
          platform(1620, 335, 130),
          platform(1840, 400, 150),
          platform(2050, FLOOR_Y, 550, 80)
        ],
        spikes: [
          spike(300, 512, 630, 28, {
            death: death('前半段', '你沒有落在下一塊平台上。', '第一道門前沒有額外操作。', 'careless')
          }),
          spike(1350, 512, 700, 28, {
            death: death('後半段', '你沒有落在下一塊平台上。', '門移動後，普通跳躍仍然有效。', 'careless')
          }),
          spike(1120, 512, 230, 28, {
            hidden: true,
            death: death('停在終點', '門離開後，你仍站在門原本的位置。', '下一塊平台就在前方。')
          }),
          spike(1510, 400, 36, 28, {
            hidden: true, phase: 'idle', riseTo: 372, riseSpeed: 360,
            death: death('沒有下一步', '你落地後走向平台另一端。', '那一端只留下起跳距離。')
          }),
          spike(1895, 400, 40, 28, {
            hidden: true, phase: 'idle', riseTo: 372, riseSpeed: 360,
            death: death('正中間', '你落在後半段平台的中央。', '它出現時，左右都還能站。')
          }),
          spike(2160, 432, 42, 28),
          spike(2350, 432, 46, 28, {
            death: death('第二根', '你用完整跳躍處理了第二根地刺。', '它的上方已經不是空的。')
          }),
          spike(2320, 295, 110, 34, {
            hidden: true,
            upside: true,
            death: death('照抄第一根', '第二根尖刺上方也出現了尖刺。', '輕一點的跳躍仍然足夠。')
          })
        ],
        update(s, dt) {
          const player = getPlayer();
          const center = player.x + player.w / 2;
          const firstCrumble = s.platforms[s.firstCrumbleIndex];
          const firstDoorFloor = s.platforms[s.firstDoorFloorIndex];
          const risingLanding = s.platforms[s.risingLandingIndex];
          const sinking = s.platforms[s.sinkingPlatformIndex];

          if (s.firstCrumblePhase === 'idle' && standingOn(player, firstCrumble)) {
            s.firstCrumblePhase = 'warning';
            s.firstCrumbleTimer = .28;
            firstCrumble.cracked = true;
            tone(150, .05);
          }
          if (s.firstCrumblePhase === 'warning') {
            s.firstCrumbleTimer -= dt;
            if (s.firstCrumbleTimer <= 0) {
              firstCrumble.active = false;
              s.firstCrumblePhase = 'gone';
            }
          }

          if (s.doorPhase === 'first' && hit(player, s.goal)) {
            s.doorPhase = 'relocatingForward';
            s.goal.hidden = true;
            s.goal.locked = true;
            s.goal.x = 2520;
            s.doorRevealTimer = .2;
            s.firstDoorFloorPhase = 'warning';
            s.firstDoorFloorTimer = .38;
            firstDoorFloor.cracked = true;
            tone(95, .12);
          }
          if (s.doorPhase === 'relocatingForward') {
            s.doorRevealTimer -= dt;
            if (s.doorRevealTimer <= 0) {
              s.doorPhase = 'second';
              s.goal.hidden = false;
              s.goal.locked = false;
            }
          }

          if (s.firstDoorFloorPhase === 'warning') {
            s.firstDoorFloorTimer -= dt;
            if (s.firstDoorFloorTimer <= 0) {
              s.firstDoorFloorPhase = 'falling';
              s.spikes[s.firstDoorFloorSpikeIndex].hidden = false;
            }
          }
          if (s.firstDoorFloorPhase === 'falling' && firstDoorFloor.active) {
            carryPlatform(player, firstDoorFloor, 'y', firstDoorFloor.y + 650 * dt);
            if (firstDoorFloor.y > 560) {
              firstDoorFloor.active = false;
              s.firstDoorFloorPhase = 'gone';
            }
          }

          if (standingOn(player, risingLanding)) {
            activateRisingSpike(s.spikes[s.risingLandingSpikeIndex]);
          }

          if (s.sinkingPhase === 'idle' && standingOn(player, sinking)) {
            s.sinkingPhase = 'warning';
            s.sinkingTimer = .34;
            sinking.cracked = true;
            tone(145, .05);
          }
          if (s.sinkingPhase === 'warning') {
            s.sinkingTimer -= dt;
            if (s.sinkingTimer <= 0) s.sinkingPhase = 'falling';
          }
          if (s.sinkingPhase === 'falling' && sinking.active) {
            carryPlatform(player, sinking, 'y', sinking.y + 540 * dt);
            if (sinking.y > 540) {
              sinking.active = false;
              s.sinkingPhase = 'gone';
            }
          }

          if (standingOn(player, sinking)) {
            s.sinkJumpReady = true;
            s.sinkJumpBaseline = player.jumps;
          }
          if (
            s.sinkJumpReady &&
            !player.grounded &&
            player.jumps > (s.sinkJumpBaseline ?? player.jumps)
          ) {
            s.sinkJumpReady = false;
            activateRisingSpike(s.spikes[s.finalLandingSpikeIndex]);
          }

          if (
            standingOn(player, s.platforms[9]) &&
            center >= 2240 &&
            center <= 2335
          ) {
            s.finalGroundReady = true;
            s.finalGroundJumpBaseline = player.jumps;
          }
          if (
            s.finalGroundReady &&
            !s.finalCeilingRevealed &&
            !player.grounded &&
            player.jumps > (s.finalGroundJumpBaseline ?? player.jumps) &&
            center >= 2260
          ) {
            s.finalCeilingRevealed = true;
            s.spikes[s.finalCeilingSpikeIndex].hidden = false;
            tone(120, .08);
          }

          if (s.doorPhase === 'second' && hit(player, s.goal)) {
            s.doorPhase = 'relocatingBack';
            s.goal.hidden = true;
            s.goal.locked = true;
            s.goal.x = 2260;
            s.doorRevealTimer = .18;
            tone(90, .12);
          }
          if (s.doorPhase === 'relocatingBack') {
            s.doorRevealTimer -= dt;
            if (s.doorRevealTimer <= 0) {
              s.doorPhase = 'final';
              s.goal.hidden = false;
              s.goal.locked = false;
            }
          }

          updateRisingSpike(s.spikes[s.risingLandingSpikeIndex], dt);
          updateRisingSpike(s.spikes[s.finalLandingSpikeIndex], dt);
        }
      }))
    ];
  };
})();
