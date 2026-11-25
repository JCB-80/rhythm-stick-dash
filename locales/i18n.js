// Auto-loaded i18n dictionary & helper (works on file:// without CORS errors)
window.GAME_LOCALES = {
  "ko": {
    "lang_name": "한국어",
    "login_kakao": "카카오로 1초 시작",
    "login_naver": "네이버로 1초 시작",
    "login_google": "Google로 계속하기",
    "login_apple": "Apple로 계속하기",
    "login_guest": "게스트 즉시 플레이",
    "ranking_weekly": "주간 30인 리그",
    "ranking_daily": "일일 챌린지",
    "shop_vip": "VIP 패스 (광고 제거)",
    "btn_retry": "다시 도전",
    "btn_lobby": "로비로 이동",
    "btn_claim": "보상 받기",
    "game_title": "리듬 스틱 대쉬",
    "select_hero": "러너 선택",
    "char_kai": "카이 (실드·판정 완화)",
    "char_luna": "루나 (피버 지속·회복)",
    "char_aria": "아리아 (콤보 배율 특화)",
    "start_run": "질주 시작",
    "branch_std": "일반 루트 1x",
    "branch_rush": "러시 루트 2x",
    "stage_clear": "스테이지 클리어!",
    "upload_mp3": "내 MP3 곡 불러오기"
  },
  "en": {
    "lang_name": "English",
    "login_kakao": "Continue with Kakao",
    "login_naver": "Continue with Naver",
    "login_google": "Continue with Google",
    "login_apple": "Continue with Apple",
    "login_guest": "Guest Instant Play",
    "ranking_weekly": "Weekly 30-Group League",
    "ranking_daily": "Daily Challenge",
    "shop_vip": "VIP Pass (No Ads)",
    "btn_retry": "Retry",
    "btn_lobby": "Back to Lobby",
    "btn_claim": "Claim Reward",
    "game_title": "Rhythm Stick Dash",
    "select_hero": "Select Runner",
    "char_kai": "Kai (Shield & Easy Judge)",
    "char_luna": "Luna (Fever Boost & Heal)",
    "char_aria": "Aria (Combo Score x2.5)",
    "start_run": "START RUN",
    "branch_std": "STANDARD 1x",
    "branch_rush": "RUSH 2x",
    "stage_clear": "STAGE CLEAR!",
    "upload_mp3": "Upload Custom MP3"
  },
  "ja": {
    "lang_name": "日本語",
    "login_kakao": "カカオで1秒スタート",
    "login_naver": "NAVERで1秒スタート",
    "login_google": "Googleで続ける",
    "login_apple": "Appleでサインイン",
    "login_guest": "ゲストですぐ遊ぶ",
    "ranking_weekly": "週間30人リーグ",
    "ranking_daily": "デイリーチャレンジ",
    "shop_vip": "VIPパス（広告削除）",
    "btn_retry": "リトライ",
    "btn_lobby": "ロビーへ",
    "btn_claim": "報酬を受け取る",
    "game_title": "リズムスティックダッシュ",
    "select_hero": "ランナー選択",
    "char_kai": "カイ（シールド・判定緩和）",
    "char_luna": "ルナ（フィーバー延長・回復）",
    "char_aria": "アリア（コンボ倍率特化）",
    "start_run": "ラン開始",
    "branch_std": "通常ルート 1x",
    "branch_rush": "ラッシュ 2x",
    "stage_clear": "ステージクリア！",
    "upload_mp3": "MP3アップロード"
  },
  "zh-TW": {
    "lang_name": "繁體中文",
    "login_kakao": "使用 Kakao 快速開始",
    "login_naver": "使用 NAVER 快速開始",
    "login_google": "使用 Google 繼續",
    "login_apple": "使用 Apple 繼續",
    "login_guest": "訪客立即遊玩",
    "ranking_weekly": "每週30人聯賽",
    "ranking_daily": "每日挑戰",
    "shop_vip": "VIP通行證（免廣告）",
    "btn_retry": "重新挑戰",
    "btn_lobby": "返回大廳",
    "btn_claim": "領取獎勵",
    "game_title": "節奏音棍衝刺",
    "select_hero": "選擇跑者",
    "char_kai": "凱（護盾・判定放寬）",
    "char_luna": "露娜（狂熱延長・回復）",
    "char_aria": "艾莉亞（連擊高分特化）",
    "start_run": "開始奔馳",
    "branch_std": "標準路線 1x",
    "branch_rush": "狂飆路線 2x",
    "stage_clear": "關卡完成！",
    "upload_mp3": "上傳自訂 MP3"
  },
  "es": {
    "lang_name": "Español",
    "login_kakao": "Continuar con Kakao",
    "login_naver": "Continuar con Naver",
    "login_google": "Continuar con Google",
    "login_apple": "Continuar con Apple",
    "login_guest": "Jugar como Invitado",
    "ranking_weekly": "Liga Semanal (Grupo 30)",
    "ranking_daily": "Desafío Diario",
    "shop_vip": "Pase VIP (Sin Anuncios)",
    "btn_retry": "Reintentar",
    "btn_lobby": "Ir al Lobby",
    "btn_claim": "Reclamar",
    "game_title": "Rhythm Stick Dash",
    "select_hero": "Elegir Corredor",
    "char_kai": "Kai (Escudo y Precisión)",
    "char_luna": "Luna (Fiebre y Curación)",
    "char_aria": "Aria (Bono de Combo)",
    "start_run": "INICIAR CARRERA",
    "branch_std": "RUTA NORMAL 1x",
    "branch_rush": "RUTA RUSH 2x",
    "stage_clear": "¡NIVEL COMPLETADO!",
    "upload_mp3": "Subir MP3 Propio"
  }
};

window.I18n = {
  supported: ['ko', 'en', 'ja', 'zh-TW', 'es'],
  current: (function() {
    const saved = window.GameStorage.get('game_lang');
    if (saved && window.GAME_LOCALES[saved]) return saved;
    const nav = (navigator.language || 'ko').toLowerCase();
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('zh')) return 'zh-TW';
    if (nav.startsWith('es')) return 'es';
    return 'en';
  })(),
  t: function(key, fallback) {
    const pack = window.GAME_LOCALES[this.current] || window.GAME_LOCALES['ko'];
    return pack[key] || window.GAME_LOCALES['en'][key] || fallback || key;
  },
  setLang: function(lang) {
    if (!window.GAME_LOCALES[lang]) return;
    this.current = lang;
    window.GameStorage.set('game_lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      el.textContent = this.t(k);
    });
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
};
