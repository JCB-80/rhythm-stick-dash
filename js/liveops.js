// Wave 2 Top-Grossing Live-Ops + Beatstar-Proof Modifiers (MIRROR/HIDDEN/SPEED 1.25x), Ghost Tournament & Cosmetic Pass — Rhythm Stick Dash
(function (global) {
  'use strict';

  const STORAGE_KEY = 'rsd_wave2_liveops_v1';

  const CHALLENGE_MODIFIERS = [
    { id: 'MIRROR',    icon: '🪞', label: 'MIRROR',      scoreBonusPct: 15, coinBonusPct: 20, desc: '좌우 레인·스와이프 반전' },
    { id: 'HIDDEN',    icon: '👻', label: 'HIDDEN',      scoreBonusPct: 20, coinBonusPct: 25, desc: '판정선 직전 노트 페이드' },
    { id: 'SPEED_125', icon: '⚡', label: 'SPEED 1.25x', scoreBonusPct: 25, coinBonusPct: 30, desc: '노트 낙하 속도 1.25배 가속' }
  ];

  const WEEKLY_MUTATORS = [
    { id: 'GHOST_DUEL_2X', icon: '👻', title: '주간 고스트 토너먼트',   desc: '고스트 라이벌 추월 시 보너스 코인 2배' },
    { id: 'FEVER_SURGE',   icon: '🔥', title: '피버 게이지 +30% 주간', desc: '노트 적중 시 피버 충전 속도 대폭 증가' },
    { id: 'MOD_BONUS_50',  icon: '🪞', title: '모디파이어 챌린지 주간', desc: 'MIRROR/HIDDEN/1.25x 클리어 보상 +50%' },
    { id: 'CORE_HARVEST',  icon: '⚡', title: '비트 코어 2배 주간',     desc: '스테이지 클리어 시 BEAT CORE 2배 획득' }
  ];

  const ATTENDANCE_7D = [
    { day: 1, label: '300 🪙',          coins: 300,  cores: 0 },
    { day: 2, label: '⚡ 5 CORE',       coins: 0,    cores: 5 },
    { day: 3, label: '600 🪙',          coins: 600,  cores: 0 },
    { day: 4, label: '⚡ 10 CORE',      coins: 0,    cores: 10 },
    { day: 5, label: '1,000 🪙',        coins: 1000, cores: 0 },
    { day: 6, label: '⚡ 15 CORE',      coins: 0,    cores: 15 },
    { day: 7, label: '👑 2,500🪙 + 신화 궤적', coins: 2500, cores: 30, mythic: true }
  ];

  const DAILY_MISSION_DEFS = [
    { id: 'clear_song',   title: '트랙 1곡 완주하기',          target: 1, coins: 350, cores: 4 },
    { id: 'mod_play',     title: '챌린지 모디파이어 1회 활성', target: 1, coins: 400, cores: 5 },
    { id: 'combo_50',     title: '50 콤보 이상 달성',          target: 1, coins: 450, cores: 5 },
    { id: 'cosmetic_use', title: '코스메틱/패스 방문',         target: 1, coins: 300, cores: 3 },
    { id: 'watch_ad',     title: '보상형 보급 1회 수령',       target: 1, coins: 350, cores: 5 }
  ];

  const LEAGUE_TIERS = [
    { id: 'bronze',  name: 'BRONZE',  icon: '🥉', minScore: 0 },
    { id: 'silver',  name: 'SILVER',  icon: '🥈', minScore: 150000 },
    { id: 'gold',    name: 'GOLD',    icon: '🥇', minScore: 400000 },
    { id: 'diamond', name: 'DIAMOND', icon: '💎', minScore: 700000 },
    { id: 'master',  name: 'MASTER',  icon: '👑', minScore: 1000000 }
  ];

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const isoWeekIndex = () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return Math.floor((Math.floor((now - start) / 86400000) + start.getUTCDay()) / 7);
  };

  function loadState() {
    const base = {
      streakDay: 0, lastCheckInDate: '', firstPurchaseClaimed: false,
      dailyDate: todayKey(),
      missions: { clear_song: 0, mod_play: 0, combo_50: 0, cosmetic_use: 0, watch_ad: 0 },
      missionsClaimed: {}, weeklyMissionPts: 0, weeklyChestClaimed: false,
      adsWatchedTotal: 0, adsToday: 0, adMilestonesClaimed: 0,
      activeModifiers: { MIRROR: false, HIDDEN: false, SPEED_125: false }
    };
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (raw && typeof raw === 'object') {
        Object.assign(base, raw);
        base.activeModifiers = Object.assign({ MIRROR: false, HIDDEN: false, SPEED_125: false }, raw.activeModifiers || {});
      }
    } catch (e) {}
    if (base.dailyDate !== todayKey()) {
      base.dailyDate = todayKey();
      base.missions = { clear_song: 0, mod_play: 0, combo_50: 0, cosmetic_use: 0, watch_ad: 0 };
      base.missionsClaimed = {};
      base.adsToday = 0;
    }
    return base;
  }

  function saveState(st) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (e) {} }

  class LocalAILeaderboardProvider {
    async fetchWeeklyBoard(userScore, userNick) {
      const rivals = [['GhostValkyrie', 1080000], ['MirrorMaster', 760000], ['HiddenBeatKR', 480000], ['SpeedRunner', 220000], ['NeonRookie', 85000]];
      const rows = rivals.map(([name, score]) => ({ name, score, isMe: false }));
      rows.push({ name: userNick || 'Runner', score: userScore || 0, isMe: true });
      rows.sort((a, b) => b.score - a.score);
      return rows.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, isMe: r.isMe, tier: Wave2LiveOps.getTierForScore(r.score) }));
    }
  }

  class RemoteHttpLeaderboardProvider {
    constructor(url, apiKey) { this.url = url || ''; this.apiKey = apiKey || ''; this.fallback = new LocalAILeaderboardProvider(); }
    async fetchWeeklyBoard(userScore, userNick) {
      if (!this.url || typeof fetch !== 'function') return this.fallback.fetchWeeklyBoard(userScore, userNick);
      try {
        const res = await fetch(`${this.url}/leaderboard/weekly`, { headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {} });
        if (res.ok) return await res.json();
      } catch (e) {}
      return this.fallback.fetchWeeklyBoard(userScore, userNick);
    }
  }

  const Wave2LiveOps = {
    CHALLENGE_MODIFIERS, WEEKLY_MUTATORS, ATTENDANCE_7D, DAILY_MISSION_DEFS, LEAGUE_TIERS,
    state: loadState(),
    leaderboardProvider: new LocalAILeaderboardProvider(),

    configureRemoteLeaderboard(url, apiKey) {
      this.leaderboardProvider = url ? new RemoteHttpLeaderboardProvider(url, apiKey) : new LocalAILeaderboardProvider();
    },
    getActiveMutator() { return WEEKLY_MUTATORS[isoWeekIndex() % WEEKLY_MUTATORS.length]; },
    getTierForScore(score) {
      let cur = LEAGUE_TIERS[0];
      for (const t of LEAGUE_TIERS) if ((score || 0) >= t.minScore) cur = t;
      return cur;
    },
    toggleModifier(id) {
      if (!(id in this.state.activeModifiers)) return false;
      this.state.activeModifiers[id] = !this.state.activeModifiers[id];
      if (this.state.activeModifiers[id]) this.recordMission('mod_play', 1);
      saveState(this.state);
      return this.state.activeModifiers[id];
    },
    getModifierBonus() {
      let scorePct = 0, coinPct = 0;
      for (const m of CHALLENGE_MODIFIERS) {
        if (this.state.activeModifiers[m.id]) { scorePct += m.scoreBonusPct; coinPct += m.coinBonusPct; }
      }
      return { scoreMult: 1 + scorePct / 100, coinMult: 1 + coinPct / 100, scorePct, coinPct };
    },
    claimAttendance(grantFn) {
      if (this.state.lastCheckInDate === todayKey() || this.state.streakDay >= 7) return { ok: false };
      const nextDay = (this.state.streakDay % 7) + 1;
      const reward = ATTENDANCE_7D[nextDay - 1];
      this.state.streakDay = nextDay;
      this.state.lastCheckInDate = todayKey();
      saveState(this.state);
      if (grantFn) grantFn(reward);
      return { ok: true, day: nextDay, reward };
    },
    recordMission(id, amt = 1) {
      const def = DAILY_MISSION_DEFS.find(m => m.id === id);
      if (!def) return;
      this.state.missions[id] = Math.min(def.target, (this.state.missions[id] || 0) + amt);
      saveState(this.state);
    },
    claimAllMissions(grantFn) {
      let coins = 0, cores = 0, count = 0;
      for (const m of DAILY_MISSION_DEFS) {
        if ((this.state.missions[m.id] || 0) >= m.target && !this.state.missionsClaimed[m.id]) {
          this.state.missionsClaimed[m.id] = true;
          coins += m.coins; cores += m.cores;
          this.state.weeklyMissionPts += 20;
          count++;
        }
      }
      if (count > 0) { saveState(this.state); if (grantFn) grantFn({ coins, cores }); }
      return { ok: count > 0, count, coins, cores };
    },
    claimFirstPurchaseStarter(grantFn) {
      if (this.state.firstPurchaseClaimed) return { ok: false };
      this.state.firstPurchaseClaimed = true;
      const reward = { coins: 2400, cores: 40 };
      saveState(this.state);
      if (grantFn) grantFn(reward);
      return { ok: true, reward };
    }
  };

  global.Wave2LiveOps = Wave2LiveOps;
})(typeof window !== 'undefined' ? window : globalThis);
