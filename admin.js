(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const percent = (value, total) => total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function render() {
    const events = window.gameAnalytics.getEvents();
    const visits = events.filter(event => event.type === 'visit');
    const starts = events.filter(event => event.type === 'chapter_start');
    const completions = events.filter(event => event.type === 'chapter_complete');
    const players = new Set(events.map(event => event.playerId).filter(Boolean));
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentVisitCount = visits.filter(event => new Date(event.timestamp).getTime() >= sevenDaysAgo).length;

    $('#playersMetric').textContent = players.size;
    $('#visitsMetric').textContent = visits.length;
    $('#startsMetric').textContent = starts.length;
    $('#completionsMetric').textContent = completions.length;
    $('#recentVisits').textContent = `最近 7 天 ${recentVisitCount} 次`;
    $('#visitToPlay').textContent = `造訪轉換率 ${percent(starts.length, visits.length)}%`;
    $('#overallRate').textContent = `整體通過率 ${percent(completions.length, starts.length)}%`;
    $('#activityTotal').textContent = recentVisitCount;

    renderActivity(visits);
    renderChapterRates(starts, completions);
    renderFunnel(visits.length, starts.length, completions.length);
  }

  function renderActivity(visits) {
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      days.push({ date, key: dayKey(date), count: 0 });
    }
    visits.forEach(event => {
      const item = days.find(day => day.key === dayKey(new Date(event.timestamp)));
      if (item) item.count += 1;
    });
    const max = Math.max(1, ...days.map(day => day.count));
    $('#activityChart').innerHTML = days.map((day, index) => `
      <div class="day-column" title="${day.key}：${day.count} 次造訪">
        <div class="bar-wrap"><div class="bar ${index === 6 ? 'today' : ''}" style="height:${Math.max(3, (day.count / max) * 100)}%"></div></div>
        <span>${new Intl.DateTimeFormat('zh-TW', { weekday: 'short' }).format(day.date)}</span>
      </div>
    `).join('');
  }

  function renderChapterRates(starts, completions) {
    $('#chapterRates').innerHTML = [1, 2].map(chapter => {
      const started = starts.filter(event => Number(event.data?.chapter) === chapter).length;
      const completed = completions.filter(event => Number(event.data?.chapter) === chapter).length;
      const rate = percent(completed, started);
      return `
        <div class="rate-row">
          <div class="rate-copy"><strong>第 ${chapter} 章</strong><span>${rate}%</span></div>
          <div class="rate-track"><div class="rate-fill" style="width:${rate}%"></div></div>
          <div class="rate-detail">${started} 次開始 · ${completed} 次完成</div>
        </div>
      `;
    }).join('');
  }

  function renderFunnel(visits, starts, completions) {
    const steps = [
      ['造訪遊戲', visits, '所有進入遊戲頁面的工作階段'],
      ['開始章節', starts, `${percent(starts, visits)}% 從造訪進入遊玩`],
      ['完成章節', completions, `${percent(completions, starts)}% 從遊玩抵達完成`]
    ];
    $('#funnel').innerHTML = steps.map(([label, value, detail], index) => `
      <div class="funnel-step"><span>0${index + 1} · ${label}</span><strong>${value}</strong><small>${detail}</small></div>
    `).join('');
  }

  $('#clearDataButton').addEventListener('click', () => {
    if (window.confirm('確定清除這台裝置上的所有測試統計嗎？')) window.gameAnalytics.clear();
  });
  window.addEventListener('game-analytics-update', render);
  render();
})();
