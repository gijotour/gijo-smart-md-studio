# GIJO Smart MD Studio (마크다운 MD 전용 문서 작성기) 📝

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-33.x-47848F.svg)

> **GIJO Smart MD Studio**는 워드(MS Word)처럼 편리하게 문서와 스크린샷 이미지를 작성하고, 클릭 한 번으로 이미지가 내장(Base64)된 단일 마크다운(.md) 파일로 변환/수출해 주는 전용 웹 & 데스크톱 애플리케이션입니다. 모든 라이브러리를 로컬에 내장(vendored)하고 있어 인터넷 연결 없이도 완전히 동작합니다.

---

## 🌟 주요 특징 및 기능

- 📄 **MS Word 스타일 문서 편집 (`[워드 문서 모드]`)**: A4 용지 스타일의 레이아웃에서 여백과 서식을 보며 편안하게 작성
- 📋 **클립보드 스크린샷 붙여넣기 (`Ctrl + V`)**: 화면 캡처 후 `Ctrl + V` 누르면 **자동 압축 후 Base64 이미지로 즉시 문서 삽입** (불투명 이미지는 JPEG로, 투명 배경이 있는 이미지는 PNG로 자동 선택되어 원본 대비 용량이 크게 줄어듭니다)
- 🖼 **이미지 드래그 & 드롭 지원**: 컴퓨터 내 사진 파일 드래그 앤 드롭 삽입 (다중 파일 지원)
- 🗂 **문서함 & 버전 히스토리**: 여러 문서를 사이드바에서 관리(생성/전환/복제/삭제)하고, 편집 중 자동으로 쌓이는 버전 스냅샷을 언제든 복원 가능
- 📤 **다양한 형식으로 내보내기**:
  - `[MD 복사]`: 마크다운 전체 내용 클립보드 복사 (LLM / ChatGPT / Claude / GitHub 전송용)
  - **Markdown (.md)**: 이미지가 내장된 단일 파일
  - **HTML (.html)**: 스타일이 포함된 독립 실행 파일
  - **PDF (.pdf)**: 웹에서는 인쇄 대화상자, 데스크톱 앱에서는 원클릭 저장
  - **Word (.docx)**: 구조(제목/목록/표/이미지)가 보존된 워드 문서 (색상 등 세부 스타일은 단순화됨)
- 🎨 **프리미엄 테마 & 자동 저장**: 다크 모드 / 라이트 모드 전환 및 IndexedDB 기반 자동 저장
- 🖥 **웹 & 데스크톱 앱 겸용**: 브라우저(Web) 및 Electron 데스크톱 앱(Desktop App) 지원, 오프라인에서도 완전히 동작
- ♿ **접근성 & 반응형**: 키보드 포커스 표시, 아이콘 버튼 라벨, 좁은 화면에서도 무너지지 않는 레이아웃

---

## 🛠 설치 및 실행 방법

### 1. 레포지토리 클론 및 패키지 설치
```bash
git clone https://github.com/gijotour/gijo-smart-md-studio.git
cd gijo-smart-md-studio
npm install
```

### 2. 데스크톱 앱 실행 (Electron)
```bash
npm start
```

### 3. 웹 서버 실행 (Browser)
```bash
python -m http.server 8080
```
웹 브라우저에서 `http://localhost:8080` 으로 접속할 수 있습니다.

### 4. 데스크톱 앱 패키징 (배포용 빌드)
```bash
npm run build         # 현재 실행 중인 OS용 빌드
npm run build:win     # Windows (nsis 설치 프로그램)
npm run build:mac     # macOS 전용 빌드 — 반드시 macOS에서 실행해야 함 (dmg)
npm run build:linux   # Linux (AppImage)
```
빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 📁 프로젝트 구조

```
gijo-smart-md-studio/
├── index.html         # 메인 웹 UI 및 툴바
├── main.js             # Electron 메인 프로세스 (메뉴, PDF 내보내기 IPC)
├── preload.js          # Electron 프리로드 스크립트 (contextBridge)
├── package.json        # 프로젝트 설정, 의존성, electron-builder 빌드 설정
├── LICENSE
├── build/
│   ├── icon.svg         # 앱 아이콘 원본
│   └── icon.png         # electron-builder용 아이콘 (1024×1024)
├── icon.png             # 런타임 창 아이콘 (main.js가 참조)
├── css/
│   ├── style.css        # 프리미엄 디자인 시스템 및 워드 용지 레이아웃
│   └── print.css        # 인쇄/PDF/HTML 내보내기용 스타일시트
├── js/
│   ├── app.js            # 에디터 로직, 이미지 압축, UI 이벤트 바인딩
│   ├── templates.js      # 기술 문서 템플릿 모음
│   ├── storage.js        # IndexedDB 문서함 + 버전 히스토리
│   └── export.js         # MD/HTML/PDF/DOCX 내보내기
└── vendor/               # 로컬 내장 라이브러리 (오프라인 동작용, CDN 미사용)
    ├── VERSIONS.md        # 내장 라이브러리 버전/출처/라이선스 기록
    ├── marked/            # 마크다운 파서
    ├── dompurify/         # HTML 살균 (XSS 방지)
    ├── fontawesome/       # 아이콘
    └── html-to-docx/      # Word(.docx) 생성
```

---

## 📄 라이선스

MIT License © 2026 GIJO
