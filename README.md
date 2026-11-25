# 리듬 스틱 대쉬 (Rhythm Stick Dash)

순수 **HTML5 + CSS3 + Vanilla JavaScript + Three.js (CDN) + Web Audio API** 기반으로 별도 빌드/번들러 없이 즉시 실행되는 3D 사이버펑크 리듬 러너 게임입니다.

## 주요 기능 (`SPEC.md` v5 기준 100% 구현)

- **원터치 5종 소셜 로그인 (`js/auth-ranking.js`)**: 아이디/비밀번호 입력창 없이 카카오·네이버·Google·Apple·게스트 5버튼 원터치 자동 인증(`LocalAuthAdapter` 및 향후 Supabase/Firebase 연동용 `CloudAuthAdapter` 분리)
- **5개 국어 실시간 전환 (`locales/i18n.js`, `js/i18n-ext.js`)**: `ko`, `en`, `ja`, `zh-TW`, `es` 기기 언어 자동 감지, 우측 상단 지구본 드롭다운 실시간 전환, 무문자 프레임(`sprites_i18n_frames`) 텍스트 오버레이, 국가권별 소셜 로그인 자동 정렬
- **3인 캐릭터 고유 스킬 시스템 (`js/game3d.js`, `js/app.js`)**: 카이(실드·판정 완화), 루나(피버 지속·HP 회복), 아리아(콤보 배율·RUSH 2.5x)
- **Web Audio 실시간 신스 4곡 & 사용자 MP3 자동 채보 (`js/audio-synth.js`)**: `Galaxy Chase`, `Neon Pulse`, `Silent City Break`, `Cyber Overdrive` + 로컬 오디오 파일 업로드 온셋(Onset) 피크 자동 노트 생성
- **Three.js 3D 곡선 네온 하이웨이 & Y자 갈림길 (`js/game3d.js`)**: `EASY / NORMAL / HARD / EXTREME` 난이도별 트랙 곡률, 실시간 `STANDARD 1x` vs `RUSH 2x` 갈림길 분기, `MAX FEVER OVERDRIVE x4`, 30인 주간 소셜 통합 리더보드 및 실시간 고스트 대결

## 실행 방법

1. `실행하기_StartGame.bat` 실행 또는 프로젝트 루트에서 정적 서버 실행:
   ```bash
   python -m http.server 8080
   ```
2. 브라우저에서 `http://localhost:8080` 접속 (`file://` 직접 열기 시에도 캔버스 폴백 텍스처로 동작)
