// AuthService (Local Mock + Cloud Adapter Stub) & 30-Player Unified Social Ranking Engine
(function () {
  const USER_STORAGE_KEY = 'rsd_user_session_v5';
  const SCORES_STORAGE_KEY = 'rsd_song_scores_v5';
  const RIVALS_STORAGE_KEY = 'rsd_weekly_group30_v5';

  function getIsoWeekKey() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}_W${String(weekNo).padStart(2, '0')}`;
  }

  function getWeeklyClaimKey() {
    return `rsd_weekly_claimed_${getIsoWeekKey()}`;
  }

  // Cloud configuration stub: drop Supabase / Firebase credentials here for production cross-social sync
  const CLOUD_CONFIG = {
    enabled: false,
    supabaseUrl: '',
    supabaseAnonKey: '',
    groupId: 'NEO-SYNDICATE-G07'
  };

  const PROVIDER_META = {
    kakao:  { badge: 'K', label: 'Kakao',  css: 'kakao' },
    naver:  { badge: 'N', label: 'NAVER',  css: 'naver' },
    google: { badge: 'G', label: 'Google', css: 'google' },
    apple:  { badge: 'A', label: 'Apple',  css: 'apple' },
    guest:  { badge: 'P', label: 'Guest',  css: 'guest' }
  };

  // ==================== 1. AUTH ADAPTER & SERVICE ====================
  const LocalAuthAdapter = {
    async signIn(provider) {
      await new Promise(resolve => setTimeout(resolve, 400));
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
      } catch (_) {}

      if (saved && saved.uid && saved.provider === provider) {
        return saved;
      }

      const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const numTag = Math.floor(100 + Math.random() * 899);
      const prefixMap = {
        kakao: 'BeatK_',
        naver: 'NeoN_',
        google: 'CyberG_',
        apple: 'SonicA_',
        guest: 'Runner_'
      };

      const user = {
        uid: (saved && saved.uid) ? saved.uid : ('uid_' + randId + Date.now().toString(36).slice(-4)),
        nickname: (saved && saved.nickname) ? saved.nickname : ((prefixMap[provider] || 'Runner_') + numTag),
        provider: provider,
        provider_badge: (PROVIDER_META[provider] || PROVIDER_META.guest).badge,
        coins: (saved && typeof saved.coins === 'number') ? saved.coins : 1200,
        vip: !!(saved && saved.vip),
        selectedChar: (saved && saved.selectedChar) || 'luna',
        settings: Object.assign({
          bgmVol: 0.75,
          sfxVol: 0.85,
          autoFever: true
        }, saved && saved.settings ? saved.settings : {}),
        createdAt: (saved && saved.createdAt) || new Date().toISOString()
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    }
  };

  const CloudAuthAdapter = {
    async signIn(provider) {
      // Production hook for Supabase / Firebase OAuth unified UID linking
      return LocalAuthAdapter.signIn(provider);
    }
  };

  window.AuthService = {
    PROVIDER_META,
    async signIn(provider) {
      const adapter = CLOUD_CONFIG.enabled ? CloudAuthAdapter : LocalAuthAdapter;
      return adapter.signIn(provider);
    },
    getCurrentUser() {
      try {
        return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
      } catch (_) {
        return null;
      }
    },
    updateUser(patch) {
      const curr = this.getCurrentUser();
      if (!curr) return null;
      const next = Object.assign({}, curr, patch);
      if (patch.settings) {
        next.settings = Object.assign({}, curr.settings || {}, patch.settings);
      }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      return next;
    },
    signOut() {
      // Keeps high scores & UID history available, clears active auto-enter flag if switching provider
      const curr = this.getCurrentUser();
      if (curr) {
        curr.loggedOut = true;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(curr));
      }
    }
  };

  // ==================== 2. UNIFIED 30-PLAYER SOCIAL RANKING ENGINE ====================
  const CloudRankingAdapter = {
    async syncScore(payload) {
      // Unified schema: { uid, nickname, provider_badge, score, group_id, updated_at }
      if (!CLOUD_CONFIG.enabled || !CLOUD_CONFIG.supabaseUrl) return payload;
      return payload;
    }
  };

  function createSeededRivals() {
    const names = [
      ['NeonValkyrie', 'google', 984200],
      ['서울비트장인', 'kakao', 942500],
      ['TokyoSlash_JP', 'apple', 915800],
      ['리듬왕루나', 'naver', 882400],
      ['Aria_Overdrive', 'kakao', 846100],
      ['Cyber Samurai', 'google', 812900],
      ['星夜音速TW', 'apple', 789300],
      ['스틱마스터99', 'kakao', 754000],
      ['SynthWave_ES', 'google', 721600],
      ['네온질주자', 'naver', 695400],
      ['PulseBreaker', 'apple', 661200],
      ['KaiShield_KR', 'kakao', 628500],
      ['ビート姫', 'google', 594800],
      ['Rush2X_Only', 'naver', 558300],
      ['LunarEclipse', 'apple', 521900],
      ['홍대사이버펑크', 'kakao', 489200],
      ['ElectroDash', 'google', 452700],
      ['極速音棍', 'google', 418600],
      ['VelozNeon', 'apple', 385400],
      ['밤하늘심포니', 'naver', 349000],
      ['BeatHunter77', 'guest', 312500],
      ['GhostRunnerX', 'google', 276800],
      ['초보탈출중', 'kakao', 241300],
      ['MelodySlash', 'apple', 208900],
      ['네오루키', 'naver', 174200],
      ['StarDrifter', 'guest', 142600],
      ['PixelTempo', 'google', 112400],
      ['비트연습생', 'kakao', 84500],
      ['RookieStick', 'guest', 52800]
    ];

    return names.map(([nickname, provider, baseScore], idx) => ({
      uid: 'ai_rival_' + (idx + 1),
      nickname,
      provider,
      provider_badge: PROVIDER_META[provider].badge,
      score: baseScore + Math.floor(Math.random() * 4200),
      group_id: CLOUD_CONFIG.groupId,
      updated_at: new Date().toISOString(),
      isAI: true
    }));
  }

  window.RankingEngine = {
    groupId: CLOUD_CONFIG.groupId,

    getRivals() {
      let rivals = null;
      try {
        rivals = JSON.parse(localStorage.getItem(RIVALS_STORAGE_KEY) || 'null');
      } catch (_) {}
      if (!Array.isArray(rivals) || rivals.length !== 29) {
        rivals = createSeededRivals();
        localStorage.setItem(RIVALS_STORAGE_KEY, JSON.stringify(rivals));
      }
      return rivals;
    },

    getAllSongScores() {
      try {
        return JSON.parse(localStorage.getItem(SCORES_STORAGE_KEY) || '{}');
      } catch (_) {
        return {};
      }
    },

    getSongBest(songId, diff) {
      const map = this.getAllSongScores();
      const key = `${songId}__${diff}`;
      return map[key] || { score: 0, maxCombo: 0, rank: 'A' };
    },

    getMyWeeklyTotalScore() {
      const map = this.getAllSongScores();
      // Sum best score per song (across its highest difficulty) so playing multiple songs climbs the 30-player league naturally
      const perSongMax = {};
      Object.keys(map).forEach(k => {
        const songId = k.split('__')[0];
        const s = map[k].score || 0;
        if (!perSongMax[songId] || s > perSongMax[songId]) {
          perSongMax[songId] = s;
        }
      });
      return Object.values(perSongMax).reduce((acc, v) => acc + v, 0);
    },

    getGroupLeaderboard() {
      const user = window.AuthService.getCurrentUser() || {
        uid: 'guest_local',
        nickname: 'Runner',
        provider: 'guest',
        provider_badge: 'P'
      };
      const myTotal = this.getMyWeeklyTotalScore();
      const meEntry = {
        uid: user.uid,
        nickname: user.nickname,
        provider: user.provider || 'guest',
        provider_badge: (PROVIDER_META[user.provider] || PROVIDER_META.guest).badge,
        score: myTotal,
        group_id: this.groupId,
        updated_at: new Date().toISOString(),
        isMe: true
      };

      const combined = [...this.getRivals(), meEntry].sort((a, b) => b.score - a.score);
      combined.forEach((item, idx) => {
        item.rank = idx + 1;
      });
      return combined;
    },

    getMyRank() {
      const board = this.getGroupLeaderboard();
      const me = board.find(e => e.isMe);
      return me ? me.rank : 30;
    },

    recordStageClear({ songId, diff, score, maxCombo, rankGrade }) {
      const prevRank = this.getMyRank();
      const map = this.getAllSongScores();
      const key = `${songId}__${diff}`;
      const prevBest = map[key] ? map[key].score : 0;
      const isNewBest = score > prevBest;

      if (isNewBest) {
        map[key] = {
          score,
          maxCombo,
          rank: rankGrade,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(map));
      } else if (!map[key]) {
        map[key] = { score, maxCombo, rank: rankGrade, updatedAt: new Date().toISOString() };
        localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(map));
      }

      // Gently nudge 2 random AI rivals slightly so league feels alive
      const rivals = this.getRivals();
      const idx = Math.floor(Math.random() * rivals.length);
      if (rivals[idx] && rivals[idx].score < 950000) {
        rivals[idx].score += Math.floor(400 + Math.random() * 1200);
        localStorage.setItem(RIVALS_STORAGE_KEY, JSON.stringify(rivals));
      }

      const newRank = this.getMyRank();
      const user = window.AuthService.getCurrentUser();
      if (user) {
        CloudRankingAdapter.syncScore({
          uid: user.uid,
          nickname: user.nickname,
          provider_badge: (PROVIDER_META[user.provider] || PROVIDER_META.guest).badge,
          score: this.getMyWeeklyTotalScore(),
          group_id: this.groupId,
          updated_at: new Date().toISOString()
        });
      }

      return {
        prevRank,
        newRank,
        rankDelta: prevRank - newRank,
        isNewBest,
        weeklyTotal: this.getMyWeeklyTotalScore()
      };
    },

    getLiveGhostRivals(songTargetScore = 240000) {
      const rivals = this.getRivals();
      // Pick 4 rivals scaled to single-song target scores for live race feel
      const picks = [rivals[2], rivals[8], rivals[15], rivals[22]].filter(Boolean);
      const factors = [1.15, 0.92, 0.68, 0.45];
      return picks.map((r, i) => ({
        nickname: r.nickname,
        provider: r.provider,
        badge: r.provider_badge,
        targetScore: Math.round(songTargetScore * factors[i])
      }));
    },

    claimWeeklyReward() {
      const claimKey = getWeeklyClaimKey();
      if (localStorage.getItem(claimKey) === 'claimed') {
        return { ok: false };
      }
      localStorage.setItem(claimKey, 'claimed');
      const user = window.AuthService.getCurrentUser();
      if (user) {
        window.AuthService.updateUser({ coins: (user.coins || 0) + 500 });
      }
      return { ok: true, coinsAdded: 500 };
    }
  };
})();
