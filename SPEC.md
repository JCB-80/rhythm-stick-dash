# [공식 확정 게임명 — 검색 간섭 0건] 리듬 스틱 대쉬 (Rhythm Stick Dash)
- **국문 공식 타이틀:** 리듬 스틱 대쉬
- **영문 공식 타이틀:** Rhythm Stick Dash
- **다국어 표기:** KO `리듬 스틱 대쉬` / EN `Rhythm Stick Dash` / JA `リズムスティックダッシュ` / ZH-TW `節奏音棍衝刺` / ES `Rhythm Stick Dash`

# [종합 개발 & 비주얼 에셋 명세서 v5 (정밀검증판)] 리듬 스틱 대쉬 (Rhythm Stick Dash)

## 0. [최우선 절대 규칙] 되묻기 금지 & 무서버/무키 즉시 구현 아키텍처 (Zero-Question Spec)

> **CRITICAL INSTRUCTION FOR ANTIGRAVITY (절대 사용자에게 역질문하지 마세요!)**
> 아래 기술 스택, 소셜 로그인, 세션 저장, 랭킹 시스템 사양이 **이미 100% 확정**되어 있습니다. OAuth 클라이언트 키, 백엔드 서버 유무, 프레임워크 선택 등을 사용자에게 되묻지 말고 **질문 0회로 즉시 전체 코드를 작성해 실행 가능한 상태로 완성**하세요!

1. **확정 플랫폼 & 프레임워크:** 별도 번들러/빌드 설정 없이 즉시 실행되는 **순수 HTML5 + CSS3 + Vanilla JavaScript + Three.js (CDN 로드) + Web Audio API**.
2. **소셜 로그인 5종 처리 (ID/비번 입력창 절대 금지):**
   - 로그인 화면에는 **카카오 / 네이버 / 구글 / 애플 / 게스트** 원터치 5개 버튼만 배치합니다 (`./assets/sprites_login/login_01_kakao.png` ~ `login_05_guest.png` 사용, 아이디·비밀번호 입력창 및 회원가입 폼 절대 생성 금지).
   - 현재 프로토타입 단계에서는 실제 OAuth API 키 없이 작동하는 **`AuthAdapter` (Local Mock 모드)**로 구현합니다: 어떤 소셜 버튼을 클릭하든 0.4초 인증 연출 후 **첫 방문 시 자동으로 고유 `uid`와 기본 닉네임을 생성**하고 `localStorage`에 세션을 영구 유지합니다.
   - 추후 실제 출시 시 설정 파일에 **Supabase / Firebase 키만 넣으면 4개 소셜 계정이 하나의 통합 리더보드 DB로 묶이도록** 인터페이스(`AuthService.signIn(provider)`)를 깔끔하게 분리합니다.
3. **4대 소셜 통합 랭킹 & 고스트 대결 구현 방식:**
   - **프로토타입 기본 동작 (`LocalRankingEngine`):** 내 곡별 최고 점수(`localStorage`)와 29명의 AI 경쟁자 시뮬레이션 점수를 실시간 합산·정렬하여 **30인 소그룹 주간 리그 / 곡별 랭킹 리더보드**가 서버 없이도 100% 실제처럼 작동하고 승급·보상 수령이 가능해야 합니다.
   - **실서비스 확장 구조 (`CloudRankingAdapter` 스텁 내장):** 카카오·네이버·구글·애플 어느 버튼으로 들어오든 동일한 `leaderboard` 구조(`uid`, `nickname`, `provider_badge`, `score`, `group_id`, `updated_at`)에 점수를 기록해 통합 경쟁하도록 설계합니다.

---

## 0-B. [글로벌 다국어(i18n) 완벽 대응 필수 사양 — 5개 국어 실시간 전환]

> **다국어(Localization) 필수 구현 규칙**
> 본 프로젝트 폴더의 `./locales/i18n.js` (및 `./locales/translations.json`)와 무문자 버튼 프레임 `./assets/sprites_i18n_frames/`를 사용하여 **한국어(`ko`) · 영어(`en`) · 일본어(`ja`) · 중국어 번체(`zh-TW`) · 스페인어(`es`) 5개 국어**가 100% 실시간으로 전환되도록 구현하세요!

1. **기기 언어 자동 감지 & 실시간 스위처 (`icon_lang_globe.png`):**
   - `<script src="./locales/i18n.js"></script>`를 로드하여 최초 실행 시 `navigator.language`를 자동 감지하고, 선택한 언어를 `localStorage('game_lang')`에 영구 저장하세요.
   - **로그인 화면 우측 상단**과 **메인 로비/인게임 설정 상단**에 `./assets/sprites_i18n_frames/icon_lang_globe.png` 아이콘이 붙은 언어 선택 드롭다운(`한국어 | English | 日本語 | 繁體中文 | Español`)을 배치하여, 클릭 즉시 페이지 새로고침 없이 모든 UI 텍스트·캐릭터 스킬 설명·대사·상점·랭킹·알림 문구가 해당 언어로 즉시 바뀌어야 합니다.
2. **영문 고정 이미지 대신 '무문자 프레임 + 다국어 텍스트 오버레이' 적용:**
   - 언어를 바꿨을 때 버튼 글자까지 완벽히 번역되도록, 로그인 버튼과 주요 액션 버튼은 글자가 없는 투명 프레임인 `./assets/sprites_i18n_frames/social_bar_*_blank.png` (5종) 및 `btn_frame_primary.png`, `btn_frame_secondary.png`, `btn_frame_reward_ad.png`를 배경 이미지로 깔고 그 위에 `I18n.t(key)`(`data-i18n` 속성) 텍스트를 렌더링하세요!
   - 단, `ko`/`ja`/`zh-TW` 등 각 언어에서 줄바꿈 깨짐(`overflow`)이 없도록 CSS `clamp()` 폰트 크기와 `word-break: keep-all`을 적용하고, 시스템 폰트 스택(`'Pretendard', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans TC', system-ui, sans-serif`)을 지정하세요.
3. **국가권별 스마트 소셜 로그인 정렬:**
   - 한국어(`ko`) 선택 시에는 **카카오 → 네이버 → Google → Apple → 게스트** 순으로 상단 배치하고, 해외 언어(`en`, `ja`, `zh-TW`, `es`) 선택 시에는 글로벌 표준인 **Google → Apple → 게스트**를 최상단에 우선 배치(카카오·네이버는 하단 보조 배치 또는 접기)하여 글로벌 유저 친화적 UX를 제공하세요.

---

> **안티그래비티(Antigravity) 필수 에셋 지침**
> 안티그래비티 자체 이미지 생성 기능을 사용하지 말고, 반드시 본 프로젝트의 `./assets/` 폴더에 포함된 PNG 에셋 31종을 그대로 로드하여 화면과 3D 텍스처에 적용하세요.

---

## 1. 전체 에셋 디렉토리 구조 (`./assets/` — 총 31개 PNG 완벽 수록)

### A. 고해상도 화면 레퍼런스 & 배경 스테이지 (`./assets/screens/` — 9종)
1. `assets/screens/ui_01_login_title.png` : 타이틀 비주얼 레퍼런스 (**주의:** 레퍼런스 그림 좌측의 예시 ID/PW 박스는 구현하지 말고, 배경 `bg_neo_syndicate_stage.png` + 우측 `char_luna.png` 위에 `assets/sprites_login/` 5종 소셜 버튼만 배치하세요!)
2. `assets/screens/ui_02_character_select.png` : 3인 캐릭터 선택 화면 레퍼런스 (카이 / 루나 / 아리아 스탯 및 스킬 비교 UI)
3. `assets/screens/ui_03_song_select_lobby.png` : 곡 목록 및 난이도(EASY / NORMAL / HARD / EXTREME) 선택 로비 화면 레퍼런스
4. `assets/screens/gameplay_00_base.png` : 기본 3인칭 비하인드 러닝 뷰 및 HUD 기준 레퍼런스
5. `assets/screens/gameplay_01_easy.png` : EASY 난이도 플레이 화면 레퍼런스
6. `assets/screens/gameplay_02_normal_branch.png` : NORMAL 난이도 & 실시간 Y자 갈림길(`STANDARD 1x` vs `RUSH 2x`) 분기 화면 레퍼런스
7. `assets/screens/gameplay_03_hard_fever.png` : HARD/EXTREME 난이도 & `MAX FEVER OVERDRIVE x4` 폭주 클라이맥스 레퍼런스
8. `assets/screens/ui_04_result_clear.png` : 스테이지 클리어 `S+ RANK` 결과 및 스코어보드/보상 화면 레퍼런스
9. `assets/screens/bg_neo_syndicate_stage.png` : **[핵심 실사용 배경]** UI/텍스트가 없는 순수 '네오 신디케이트' 야경 배경 (인게임 스카이박스 및 로그인/로비 배경으로 직접 사용!)

### B. 캐릭터 단독 원화 (`./assets/characters/` — 3종)
- `assets/characters/char_luna.png` : 기본 캐릭터 '루나(Luna)' 원화 (밸런스/피버 특화, 핑크 어쿠스틱 스틱 쌍검)
- `assets/characters/char_kai.png` : 플레이어블 캐릭터 '카이(Kai)' 원화 (판정 완화 & 실드 특화, 시안 사운드 건틀릿)
- `assets/characters/char_aria.png` : 플레이어블 캐릭터 '아리아(Aria)' 원화 (고속 콤보 점수 배율 특화, 골드 홀로그램 소닉 블레이드)

### C. 무가입 원터치 소셜 로그인 버튼 (`./assets/sprites_login/` — 5종, 투명 `RGBA`)
- `assets/sprites_login/login_01_kakao.png` : 카카오 1초 시작 버튼
- `assets/sprites_login/login_02_naver.png` : 네이버 1초 시작 버튼
- `assets/sprites_login/login_03_google.png` : 구글 로그인 버튼
- `assets/sprites_login/login_04_apple.png` : 애플 로그인 버튼
- `assets/sprites_login/login_05_guest.png` : 게스트 즉시 플레이 버튼

### D. 인게임 투명 배경(`RGBA`) 스프라이트 에셋 (`./assets/sprites_transparent/` — 14종)
- `assets/sprites_transparent/note_tap_orb.png` : 황금빛 탭 노트 오브
- `assets/sprites_transparent/note_swipe_cyan.png` : 좌측 화살표(`<<<`) 시안 네온 스와이프 타일
- `assets/sprites_transparent/note_swipe_magenta.png` : 우측 화살표(`>>>`) 마젠타 네온 스와이프 타일
- `assets/sprites_transparent/btn_tap.png` / `assets/sprites_transparent/btn_swipe.png` : 우측 하단 터치 액션 버튼
- `assets/sprites_transparent/btn_left.png` / `assets/sprites_transparent/btn_right.png` : 좌측 하단 차선 및 갈림길 이동 버튼
- `assets/sprites_transparent/judge_perfect.png` / `assets/sprites_transparent/judge_great.png` / `assets/sprites_transparent/judge_miss.png` / `assets/sprites_transparent/judge_fever.png` : 노트 타격 시 팝업되는 네온 판정 텍스트
- `assets/sprites_transparent/rank_s_plus.png` / `assets/sprites_transparent/rank_a.png` : 결과 화면 랭크 엠블럼
- `assets/sprites_transparent/vfx_stick_slash.png` : 노트를 베어낼 때 출력되는 네온 스틱 검기 이펙트

---

## 2. 화면 흐름(Scene Flow) 구현 명세

1. **Scene 1 - 원터치 소셜 로그인 & 타이틀 (ID/비번 입력창 없음!)**
   - 배경에 `bg_neo_syndicate_stage.png`와 우측 `char_luna.png`를 배치하고, 좌측에 `./assets/sprites_login/`의 **카카오·네이버·구글·애플·게스트 5버튼**만 배치 (클릭 시 자동 계정 생성 후 캐릭터 선택 화면 진입).
2. **Scene 2 - 캐릭터 선택 (`ui_02_character_select.png` 기반)**
   - 3명의 러너 카드 배치 (`char_kai.png`, `char_luna.png`, `char_aria.png`):
     - **카이(Kai):** HP +30%, 판정 범위 +15% 완화 (초보자 추천)
     - **루나(Luna):** 피버 지속시간 +3초, 피버 중 자동 HP 회복 강화 (밸런스형)
     - **아리아(Aria):** 콤보 보너스 점수 +25%, Rush 갈림길 배율 2.5배 (고득점 랭커용)
3. **Scene 3 - 곡 & 난이도 선택 로비 + 30인 주간 통합 랭킹 모달 (`ui_03_song_select_lobby.png` 기반)**
   - 기본 내장 Web Audio API 신스 트랙 4곡 제공 (`Galaxy Chase` BPM 132, `Neon Pulse` BPM 124, `Silent City Break` BPM 142, `Cyber Overdrive` BPM 156) + 사용자 MP3 업로드 모드 지원.
   - 난이도 탭 선택 (`EASY`, `NORMAL`, `HARD`, `EXTREME`) 및 우측 상단 `[WEEKLY RANKING]` 버튼 클릭 시 4대 소셜 배지가 표시되는 30인 소그룹 리더보드 모달 제공.
4. **Scene 4 - 난이도별 3D 인게임 플레이 (`gameplay_01_easy.png` ~ `gameplay_03_hard_fever.png` 기반)**
   - **EASY:** 완만한 곡선 시안 트랙, 정박 위주 `note_tap_orb.png` 배치.
   - **NORMAL:** 곡선 + 중반부 실시간 Y자 갈림길(`STANDARD 1x` 시안 루트 vs `RUSH 2x` 마젠타 루트) 등장.
   - **HARD / EXTREME:** 고속 롤러코스터 트랙, 엇박/연타 + 스와이프 타일(`note_swipe_cyan.png`, `note_swipe_magenta.png`) 고밀도 배치, 피버 발동 시 화면 네온 이펙트 극대화.
5. **Scene 5 - 클리어 결과 및 랭킹 자동 갱신 (`ui_04_result_clear.png` 기반)**
   - 선택한 캐릭터 원화 표시, 최종 점수, 최대 콤보, PERFECT/GREAT/MISS 집계, `rank_s_plus.png` / `rank_a.png` 배지 출력, 주간 랭킹 순위 상승 알림 표시, `[RETRY]` 및 `[SONG SELECT]` 버튼 제공.


---

## [추가 수록] 다국어(i18n) 전용 언어팩 & 무문자 프레임 에셋 목록
- `./locales/i18n.js` : 로컬 `file://` 환경에서도 CORS 없이 즉시 동작하는 5개 국어(`ko`, `en`, `ja`, `zh-TW`, `es`) 번역 사전 및 자동 감지/전환 헬퍼 스크립트
- `./locales/translations.json` : 추후 앱 빌드/서버 분리 시 활용 가능한 표준 JSON 다국어 리소스
- `./assets/sprites_i18n_frames/icon_lang_globe.png` : 상단 언어 전환 드롭다운용 지구본 네온 아이콘 (`RGBA`)
- `./assets/sprites_i18n_frames/social_bar_kakao_blank.png` / `social_bar_naver_blank.png` / `social_bar_google_blank.png` / `social_bar_apple_blank.png` / `social_bar_guest_blank.png` : 다국어 텍스트 오버레이용 무문자 소셜 로그인 바 5종 (`RGBA`)
- `./assets/sprites_i18n_frames/btn_frame_primary.png` / `btn_frame_secondary.png` / `btn_frame_reward_ad.png` : 다국어 텍스트 오버레이용 무문자 액션 버튼 프레임 3종 (`RGBA`)
