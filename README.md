# SSR Template

Cloudflare Pages를 활용한 서버사이드 렌더링 템플릿

## 구조

```
├── functions/              # Cloudflare Functions (라우트)
│   ├── lib/               # 공통 라이브러리
│   │   └── template.js    # 템플릿 엔진 및 헬퍼
│   ├── templates/         # 템플릿 파일들
│   │   ├── layout/        # 레이아웃 템플릿
│   │   │   └── main.js    # 메인 레이아웃
│   │   ├── index.js       # 홈 페이지 템플릿
│   │   ├── about.js       # 소개 페이지 템플릿
│   │   └── contact.js     # 연락처 페이지 템플릿
│   ├── index.js           # 홈 페이지 라우트
│   ├── about.js           # 소개 페이지 라우트
│   └── contact.js         # 연락처 페이지 라우트
├── css/                   # 스타일시트
│   └── base.css           # 기본 CSS
├── images/                # 이미지 파일들
└── README.md
```

## 특징

- **파일 기반 라우팅**: Cloudflare Functions를 활용한 자동 라우팅
- **간단한 템플릿 엔진**: 변수 치환, 조건부 렌더링, 반복 지원
- **레이아웃 시스템**: 공통 레이아웃과 개별 페이지 템플릿 분리
- **서버사이드 렌더링**: 모든 페이지가 서버에서 렌더링됨

## 배포

1. Cloudflare Pages에 프로젝트 연결
2. 빌드 설정: 없음 (정적 파일과 Functions만 사용)
3. 출력 디렉터리: 루트 디렉터리

## 개발

로컬 개발을 위해서는 Wrangler를 사용할 수 있습니다:

```bash
npx wrangler pages dev .
```

## 템플릿 문법

- 변수: `{{ variableName }}`
- 조건: `{% if condition %} ... {% endif %}`
- 반복: `{% for item in items %} ... {% endfor %}`