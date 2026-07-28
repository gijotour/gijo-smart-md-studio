# GIJO Smart MD Studio (마크다운 MD 전용 문서 작성기) 📝

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-33.x-47848F.svg)

> **GIJO Smart MD Studio**는 워드(MS Word)처럼 편리하게 문서와 스크린샷 이미지를 작성하고, 클릭 한 번으로 이미지가 내장(Base64)된 단일 마크다운(.md), HTML, PDF로 변환/수출해 주는 전용 웹 & 데스크톱 애플리케이션입니다.

---

## 🌟 주요 특징 및 신규 추가 기능 (v1.1)

- 📄 **MS Word 스타일 문서 편집 (`[워드 문서 모드]`)**: A4 용지 스타일의 레이아웃에서 여백과 서식을 보며 편안하게 작성
- 📋 **클립보드 스크린샷 붙여넣기 (`Ctrl + V`)**: 화면 캡처 후 `Ctrl + V` 누르면 **Base64 이미지로 자동 변환 및 즉시 문서 삽입**
- 🖼 **이미지 해상도 자동 최적화**: 4K/고해상도 캡처도 원하는 해상도(1200px / 800px / 600px / 원본)로 자동 압축 변환
- 📊 **Mermaid.js 다이어그램 지원**: 순서도(Flowchart), 시퀀스 다이어그램 등의 시각화 차트 자동 렌더링
- 🎨 **코드 구문 하이라이팅 (Highlight.js)**: 다채로운 개발 언어 호환 구문 강조
- 🔍 **찾기 및 바꾸기 (Find & Replace - `Ctrl + F`)**: 문서 내 단어 실시간 검색, 다음/이전 이동, 단일/전체 바꾸기
- 📑 **문서 목차 탐색기 (Outline TOC)**: `# H1`, `## H2`, `### H3` 제목을 자동 추출하여 클릭 한 번으로 원하는 위치로 이동
- 📊 **맞춤형 표 생성기 Modal**: 행(Rows)과 열(Columns)을 지정하여 맞춤 마크다운 표 자동 생성
- 💾 **다양한 내보내기 옵션**:
  - `[MD 복사]`: 마크다운 전체 내용 클립보드 복사 (LLM / ChatGPT / Claude / GitHub 전송용)
  - `[.md 다운로드]`: 이미지가 내장된 단일 `.md` 파일 다운로드
  - `[HTML 내보내기]`: 스타일과 이미지가 포함된 독립 실행형 `.html` 파일 다운로드
  - `[PDF / 인쇄]`: A4 규격 최적화 PDF 저장 및 인쇄 기능
- 🛡️ **포트 충돌 방지 웹 서버 (`npm run web`)**: 다른 서비스(Vite, React, Next.js 등)와 포트 충돌 없이 자동으로 빈 포트(8090, 8091...)를 탐색하여 서버 실행

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

### 3. 웹 서버 실행 (포트 충돌 자동 방지)
```bash
npm run web
# 또는
npm run serve
```
자동으로 포트 중복을 감지하고 사용 가능한 최적 포트(예: `http://localhost:8090`)에서 웹 서버가 즉시 실행됩니다.

---

## 📁 프로젝트 구조

```
gijo-smart-md-studio/
├── index.html        # 메인 웹 UI, 툴바, 모달 및 반응형 요소
├── main.js           # Electron 메인 프로세스
├── server.js         # 포트 충돌 방지 정적 웹 서버
├── package.json      # 프로젝트 설정 및 스크립트
├── css/
│   └── style.css     # 프리미엄 디자인 시스템 및 워드 용지 레이아웃
└── js/
    ├── app.js        # 에디터 로직, Ctrl+V 이미지 처리, 저장 및 신규 기능
    └── templates.js  # 기술 문서 템플릿 모음
```

---

## 📄 라이선스

MIT License © 2026 GIJO
