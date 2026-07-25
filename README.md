# GIJO Smart MD Studio (마크다운 MD 전용 문서 작성기) 📝

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-33.x-47848F.svg)

> **GIJO Smart MD Studio**는 워드(MS Word)처럼 편리하게 문서와 스크린샷 이미지를 작성하고, 클릭 한 번으로 이미지가 내장(Base64)된 단일 마크다운(.md) 파일로 변환/수출해 주는 전용 웹 & 데스크톱 애플리케이션입니다.

---

## 🌟 주요 특징 및 기능

- 📄 **MS Word 스타일 문서 편집 (`[워드 문서 모드]`)**: A4 용지 스타일의 레이아웃에서 여백과 서식을 보며 편안하게 작성
- 📋 **클립보드 스크린샷 붙여넣기 (`Ctrl + V`)**: 화면 캡처 후 `Ctrl + V` 누르면 **Base64 이미지로 자동 변환 및 즉시 문서 삽입**
- 🖼 **이미지 드래그 & 드롭 지원**: 컴퓨터 내 사진 파일 드래그 앤 드롭 삽입
- 💾 **1클릭 복사 & 다운로드**:
  - `[MD 복사]`: 마크다운 전체 내용 클립보드 복사 (LLM / ChatGPT / Claude / GitHub 전송용)
  - `[.md 다운로드]`: 이미지가 내장된 단일 `.md` 파일 다운로드
- 🎨 **프리미엄 테마 & 자동 저장**: 다크 모드 / 라이트 모드 전환 및 브라우저/앱 자동 저장 기능
- 🖥 **웹 & 데스크톱 앱 겸용**: 브라우저(Web) 및 Electron 데스크톱 앱(Desktop App) 지원

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

---

## 📁 프로젝트 구조

```
gijo-smart-md-studio/
├── index.html        # 메인 웹 UI 및 툴바
├── main.js           # Electron 메인 프로세스
├── package.json      # 프로젝트 설정 및 의존성
├── css/
│   └── style.css     # 프리미엄 디자인 시스템 및 워드 용지 레이아웃
└── js/
    ├── app.js        # 에디터 로직, Ctrl+V 이미지 처리, 저장
    └── templates.js  # 기술 문서 템플릿 모음
```

---

## 📄 라이선스

MIT License © 2026 GIJO
