# SSR Template 개발 가이드

Cloudflare Pages Functions 기반 서버사이드 렌더링(SSR) 템플릿 개발 가이드입니다.

## 목차

- [프로젝트 구조](#프로젝트-구조)
- [핵심 개념](#핵심-개념)
- [페이지 작성하기](#페이지-작성하기)
- [폼 검증](#폼-검증)
- [사용자 인증](#사용자-인증)
- [미들웨어 시스템](#미들웨어-시스템)
- [템플릿 문법](#템플릿-문법)
- [환경 변수](#환경-변수)
- [배포](#배포)

---

## 프로젝트 구조

```
ssr-template/
├── functions/              # Cloudflare Pages Functions
│   ├── _middleware.js      # 글로벌 미들웨어
│   ├── index.js            # 홈 페이지 (/)
│   ├── main/               # 메인 페이지
│   │   ├── about.js        # About 페이지 (/main/about)
│   │   ├── contact.js      # Contact 페이지 (/main/contact)
│   │   ├── login.js        # 로그인 페이지 (/main/login)
│   │   └── logout.js       # 로그아웃 (/main/logout)
│   ├── mypage/             # 인증 필요 페이지
│   │   ├── _middleware.js  # 인증 체크 미들웨어
│   │   └── dashboard.js    # 대시보드 (/mypage/dashboard)
│   ├── lib/                # 라이브러리
│   │   ├── template.js     # 템플릿 렌더링
│   │   ├── form.js         # 폼 검증
│   │   └── auth.js         # JWT 인증
│   └── templates/          # 템플릿 파일
│       ├── layout/
│       │   └── main.js     # 메인 레이아웃
│       ├── main/
│       │   ├── about.js
│       │   ├── contact.js
│       │   └── login.js
│       ├── mypage/
│       │   └── dashboard.js
│       └── index.js
├── public/                 # 정적 파일
│   └── css/
│       └── base.css
├── .dev.vars               # 로컬 환경 변수
├── wrangler.toml           # Cloudflare 설정
└── package.json
```

---

## 핵심 개념

### 1. 파일 기반 라우팅

Cloudflare Pages Functions는 파일 경로가 URL이 됩니다:

- `functions/index.js` → `/`
- `functions/main/about.js` → `/main/about`
- `functions/main/contact.js` → `/main/contact`
- `functions/mypage/dashboard.js` → `/mypage/dashboard`

### 2. Context 객체

모든 요청 핸들러는 `context` 객체를 받습니다:

```javascript
export async function onRequest(context) {
  // context.request - 요청 객체
  // context.env - 환경 변수
  // context.data.auth - 인증 객체 (미들웨어에서 추가)
  // context.data.renderPage() - 페이지 렌더링 (미들웨어에서 추가)
  // context.data.renderJSON() - JSON 응답 (미들웨어에서 추가)
}
```

**⚠️ 중요**: Cloudflare Pages에서 미들웨어가 데이터를 전달하려면 반드시 `context.data`를 사용해야 합니다. `context` 객체에 직접 속성을 추가하면 핸들러에 전달되지 않습니다.

### 3. HTTP 메서드 분리

GET/POST 요청을 별도 함수로 처리:

```javascript
// GET 요청
export async function onRequestGet(context) {
  // ...
}

// POST 요청
export async function onRequestPost(context) {
  // ...
}
```

---

## 페이지 작성하기

### 기본 페이지

**1. 템플릿 생성** (`functions/templates/example.js`):

```javascript
export const body = `
<div class="page-content">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
</div>`;
```

**2. 핸들러 작성** (`functions/example.js`):

```javascript
import { layout } from './templates/layout/main.js';
import { body } from './templates/example.js';

export async function onRequest(context) {
  const data = {
    title: 'Example Page',
    description: '예제 페이지입니다.'
  };

  return context.data.renderPage(layout, body, data);
}
```

### JSON API 엔드포인트

```javascript
export async function onRequestGet(context) {
  const data = {
    success: true,
    message: 'Hello, World!'
  };

  return context.data.renderJSON(data);
}
```

---

## 폼 검증 (Form 클래스)

### 기본 사용법

```javascript
import { Form } from './lib/form.js';

export async function onRequestPost(context) {
  const form = new Form('myForm');
  await form.load(context); // FormData 로드

  form.setRules({
    username: ['required', 'alphanumeric', 'minLength:3'],
    email: ['required', 'email'],
    password: ['required', 'minLength:8']
  });

  if (!form.validate()) {
    return form.failResponse(); // 자동으로 400 JSON 응답
  }

  // 안전하게 데이터 가져오기 (XSS 이스케이프 자동 적용)
  const username = form.get('username');
  const email = form.get('email');
  const password = form.getRaw('password'); // 비밀번호는 raw (해싱용)

  // 특정 필드만 추출
  const userData = form.only('username', 'email');

  // 데이터 처리...
  return context.data.renderJSON({ success: true });
}
```

### 주요 메소드

- `await form.load(context)` - FormData 로드
- `form.get(name, defaultValue)` - 값 가져오기 (XSS 이스케이프)
- `form.getRaw(name, defaultValue)` - 원본 값 (비밀번호, API 키 등)
- `form.getFile(name)` - 파일 가져오기
- `form.only(...fields)` - 특정 필드만 추출
- `form.except(...fields)` - 특정 필드 제외
- `form.validate()` - 검증 실행
- `form.failResponse()` - 검증 실패 시 JSON 응답

### 검증 규칙

| 규칙 | 설명 | 예제 |
|------|------|------|
| `required` | 필수 입력 | `['required']` |
| `email` | 이메일 형식 | `['email']` |
| `url` | URL 형식 | `['url']` |
| `numeric` | 숫자만 | `['numeric']` |
| `alpha` | 알파벳만 | `['alpha']` |
| `alphanumeric` | 알파벳+숫자 | `['alphanumeric']` |
| `minLength:N` | 최소 길이 | `['minLength:3']` |
| `maxLength:N` | 최대 길이 | `['maxLength:50']` |
| `min:N` | 최소값 | `['min:18']` |
| `max:N` | 최대값 | `['max:100']` |
| `confirmed:field` | 필드 일치 확인 | `['confirmed:password_confirmation']` |
| `in:a,b,c` | 허용 값 목록 | `['in:male,female,other']` |
| `pattern:regex` | 정규식 패턴 | `['pattern:^010-\\d{4}-\\d{4}$']` |

### 파일 업로드

```javascript
const file = form.getFile('avatar');
if (file) {
  console.log(file.name, file.size, file.type);
  // 파일 처리...
}
```

---

## 쿼리 파라미터 (Query 클래스)

### 기본 사용법

```javascript
import { Query } from './lib/query.js';

export async function onRequestGet(context) {
  const query = new Query(context);

  // 쿼리 파라미터 가져오기 (XSS 이스케이프 자동 적용)
  const search = query.get('search');
  const category = query.get('category', 'all'); // 기본값

  // 숫자 변환
  const page = parseInt(query.get('page', '1'));
  const limit = parseInt(query.get('limit', '10'));

  // 불리언 변환
  const active = query.get('active') === 'true';

  // 데이터 조회...
}
```

### 주요 메소드

- `query.get(name, defaultValue)` - 값 가져오기 (XSS 이스케이프)
- `query.getRaw(name, defaultValue)` - 원본 값
- `query.getAll(name)` - 배열로 가져오기 (예: `?tags=a&tags=b`)
- `query.has(name)` - 존재 여부 확인
- `query.only(...fields)` - 특정 파라미터만 추출
- `query.except(...fields)` - 특정 파라미터 제외
- `query.toObject()` - 객체로 변환

### 페이지네이션 예시

```javascript
const page = Math.max(1, parseInt(query.get('page', '1')));
const perPage = Math.max(1, Math.min(parseInt(query.get('per_page', '10')), 100));
const offset = (page - 1) * perPage;

const items = await db.all(
  'SELECT * FROM items LIMIT ? OFFSET ?',
  [perPage, offset]
);
```

### Form vs Query

| 기능 | Form | Query |
|------|------|-------|
| 데이터 소스 | POST FormData | GET Query String |
| 초기화 | `await form.load(context)` | `new Query(context)` |
| XSS 보호 | ✅ | ✅ |
| 검증 | ✅ | ❌ |
| 파일 업로드 | ✅ | ❌ |

---

## 사용자 인증

### JWT + Cookie 기반 인증

**1. 로그인 처리**:

```javascript
import { Auth } from '../lib/auth.js';

export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const username = formData.get('username');
  const password = formData.get('password');

  // 사용자 확인 (DB 조회 등)
  if (username === 'admin' && password === 'password') {
    const auth = new Auth(context);

    // 사용자 데이터 설정
    auth.setUserId('user_123');
    auth.setData('username', username);
    auth.setData('role', 'admin');
    auth.setData('email', 'admin@example.com');

    // 로그인 처리 (JWT 생성, 쿠키 설정, 자동 응답)
    return await auth.login('/mypage/dashboard');
  }

  // 로그인 실패
  return context.data.renderJSON({
    success: false,
    message: '로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.'
  }, 401);
}
```

**💡 `auth.login()` 자동 처리**:
- Ajax 요청 감지: `Accept: application/json` 또는 `X-Requested-With: XMLHttpRequest` 헤더 확인
- Ajax 요청이면 JSON 응답 (`{ success: true, redirect: '/mypage/dashboard' }`)
- 일반 폼 제출이면 302 리다이렉트 응답
- 쿠키 자동 설정 (HttpOnly, Secure, SameSite=Strict)

**2. 로그아웃**:

```javascript
import { Auth } from '../lib/auth.js';

export async function onRequestGet(context) {
  const auth = new Auth(context);

  // 쿠키 삭제 및 리다이렉트
  auth.delete();
  return auth.redirect('/');
}
```

**3. 인증된 사용자 정보 가져오기**:

```javascript
export async function onRequestGet(context) {
  const { auth } = context.data;

  // 미들웨어에서 이미 인증 확인됨
  const userId = auth.getUserId();
  const username = auth.getData('username');
  const role = auth.getData('role');

  return context.data.renderPage(layout, body, {
    title: 'Dashboard',
    userId,
    username,
    role
  });
}
```

### Auth 메서드

| 메서드 | 설명 |
|--------|------|
| `isAuth()` | 인증 상태 확인 (true/false) |
| `setUserId(userId)` | 사용자 ID 설정 |
| `setData(key, value)` | JWT payload에 데이터 저장 |
| `getData(key)` | JWT payload에서 데이터 가져오기 |
| `getAllData()` | 모든 데이터 가져오기 |
| `save()` | JWT 생성 및 쿠키 객체 반환 (내부 데이터 사용) |
| `login(redirectUrl)` | 로그인 처리 (Ajax/일반 폼 자동 감지) |
| `delete()` | 쿠키 삭제 객체 반환 |
| `getUserId()` | 사용자 ID 가져오기 |
| `redirect(url, cookie?)` | 리다이렉트 응답 생성 (cookie 생략 시 savedCookie 사용) |

---

## 미들웨어 시스템

### 글로벌 미들웨어

**`functions/_middleware.js`** - 모든 요청에 적용:

```javascript
import { Auth } from './lib/auth.js';
import { renderPage as _renderPage, renderJSON as _renderJSON } from './lib/template.js';

export async function onRequest(context) {
  console.log('[Middleware] Global middleware executed');

  // ⚠️ 중요: context.data 사용 필수!
  context.data = context.data || {};

  // Auth 인스턴스 생성
  context.data.auth = new Auth(context);
  await context.data.auth.isAuth(); // 인증 상태만 확인

  // 헬퍼 함수 추가
  context.data.renderPage = (layout, body, data = {}) => {
    return _renderPage(layout, body, data, context);
  };

  context.data.renderJSON = (data, status = 200) => {
    return _renderJSON(data, status);
  };

  return context.next();
}
```

**⚠️ 주의사항**:
- 미들웨어에서 핸들러로 데이터를 전달할 때는 **반드시 `context.data`를 사용**해야 합니다
- `context` 객체에 직접 속성을 추가하면 핸들러에 전달되지 않습니다
- `context.data.auth`, `context.data.renderPage` 형태로 접근해야 합니다

### 폴더별 미들웨어

**`functions/mypage/_middleware.js`** - `/mypage/*` 경로에만 적용:

```javascript
export async function onRequest(context) {
  const { auth } = context.data;

  // 인증 체크 (실패 시 리다이렉트)
  if (!auth.isAuthenticated) {
    return auth.redirect('/main/login');
  }

  return context.next();
}
```

### 미들웨어 실행 순서

1. `functions/_middleware.js` (글로벌)
2. `functions/mypage/_middleware.js` (폴더별)
3. `functions/mypage/dashboard.js` (핸들러)

---

## 템플릿 문법

### LiquidJS 사용

**변수 출력**:

```html
<h1>{{ title }}</h1>
<p>{{ description }}</p>
```

**조건문**:

```html
{% if isAuthenticated %}
  <a href="/logout">로그아웃</a>
{% else %}
  <a href="/login">로그인</a>
{% endif %}
```

**반복문**:

```html
{% for item in items %}
  <li>{{ item.name }}</li>
{% endfor %}
```

**레이아웃 + 바디**:

```javascript
// layout에 body가 삽입됨
return context.renderPage(layout, body, data);
```

### 자동 추가되는 변수

모든 페이지에서 자동으로 사용 가능:

- `isAuthenticated` - 인증 여부 (true/false)
- `username` - 로그인한 사용자 이름
- `body` - 페이지 본문 (layout에서 사용)

---

## 환경 변수

### 로컬 개발

**`.dev.vars`** (Git에 커밋하지 않음):

```bash
JWT_SECRET=your-secret-key-change-this-to-a-secure-random-string
```

### 프로덕션

Cloudflare Pages 대시보드에서 설정:

1. Pages 프로젝트 선택
2. Settings → Environment variables
3. `JWT_SECRET` 추가

### 코드에서 사용

```javascript
export async function onRequest(context) {
  const secret = context.env.JWT_SECRET;
  // ...
}
```

---

## 배포

### 로컬 개발

```bash
# 패키지 설치
npm install

# 로컬 서버 실행
npx wrangler pages dev .

# 브라우저에서 http://localhost:8788 접속
```

### Cloudflare Pages 배포

**1. Git 저장소 연결**:

- Cloudflare Pages 대시보드
- "Create a project" → Git 저장소 선택

**2. 빌드 설정**:

```yaml
Build command: (none)
Build output directory: .
Root directory: (leave blank)
```

**3. 환경 변수 설정**:

- Settings → Environment variables
- `JWT_SECRET` 추가

**4. 배포**:

- `main` 브랜치에 푸시하면 자동 배포

---

## 핵심 디자인 패턴

### 1. context.data 패턴 (필수)

Cloudflare Pages에서 미들웨어는 **반드시** `context.data`를 사용해야 합니다:

```javascript
// 미들웨어에서
context.data = context.data || {};
context.data.auth = new Auth(context);
context.data.renderPage = (layout, body, data) => { ... };

// 핸들러에서
const { auth } = context.data;
return context.data.renderPage(layout, body, data);
```

### 2. Auth 간소화 패턴

`auth.login()` 한 줄로 모든 것을 처리:

```javascript
// 이전 (복잡)
const cookie = await auth.save();
if (isAjax) {
  const response = new Response(JSON.stringify({ ... }));
  response.headers.set('Set-Cookie', ...);
  return response;
} else {
  return auth.redirect(url, cookie);
}

// 현재 (간단)
return await auth.login('/mypage/dashboard');
// Ajax/일반 폼 자동 감지, 쿠키 자동 설정, 적절한 응답 반환
```

### 3. Form 자동 제출 패턴

`action` 속성 생략으로 URL 독립적인 폼:

```html
<!-- action 없음 = 현재 URL로 제출 -->
<form id="loginForm" method="POST" class="needs-validation" novalidate>
  <!-- 폼 필드 -->
</form>
{{ formScript }}
```

장점:
- URL 변경에 영향받지 않음
- 같은 템플릿을 여러 경로에서 재사용 가능
- Ajax/일반 폼 동일한 패턴 사용

### 4. Ajax 자동 감지 패턴

Form 클래스와 Auth 클래스가 협력:

**클라이언트** (Form.getScript):
```javascript
fetch(url, {
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: formData
});
```

**서버** (Auth.login):
```javascript
const isAjax = this.request.headers.get('X-Requested-With') === 'XMLHttpRequest' ||
               this.request.headers.get('Accept')?.includes('application/json');

return isAjax ? jsonResponse : redirectResponse;
```

개발자는 단순히 `auth.login(url)`만 호출하면 됩니다!

---

## 개발 패턴 예제

### 1. 간단한 정적 페이지

```javascript
import { layout } from './templates/layout/main.js';
import { body } from './templates/example.js';

export async function onRequest(context) {
  return context.data.renderPage(layout, body, {
    title: 'Example',
    content: 'Hello, World!'
  });
}
```

### 2. Ajax 폼 페이지

```javascript
import { Form } from './lib/form.js';
import { layout } from './templates/layout/main.js';
import { body } from './templates/form.js';

const form = new Form('myForm');
form.setRules({
  name: ['required', 'minLength:2'],
  email: ['required', 'email']
});

export async function onRequestGet(context) {
  return context.data.renderPage(layout, body, {
    title: 'Form',
    formScript: form.getScript(true) // Ajax
  });
}

export async function onRequestPost(context) {
  const formData = await context.request.formData();

  if (!form.validate(formData)) {
    return context.data.renderJSON({
      success: false,
      errors: form.getErrors()
    }, 400);
  }

  // 처리 로직...

  return context.data.renderJSON({ success: true });
}
```

### 3. 인증 필요 페이지

**폴더 구조**:

```
functions/
└── mypage/
    ├── _middleware.js   # 인증 체크
    └── profile.js       # 인증 필요 페이지
```

**핸들러** (`functions/mypage/profile.js`):

```javascript
import { layout } from '../templates/layout/main.js';
import { body } from '../templates/profile.js';

export async function onRequestGet(context) {
  const { auth } = context.data;

  // 미들웨어에서 이미 인증 확인됨
  return context.data.renderPage(layout, body, {
    title: 'Profile',
    username: auth.getData('username'),
    email: auth.getData('email')
  });
}
```

---

## 주의사항

### 보안

1. **JWT Secret 관리**:
   - `.dev.vars`를 Git에 커밋하지 마세요
   - 프로덕션에서는 강력한 랜덤 키 사용

2. **XSS 방지**:
   - 사용자 입력은 항상 검증
   - LiquidJS가 자동으로 이스케이프 처리

3. **CSRF 방지**:
   - SameSite 쿠키 사용 (기본 설정됨)

### 성능

1. **캐싱**:
   - 정적 자산은 `/public`에 배치
   - CDN 자동 캐싱 활용

2. **번들 크기**:
   - 필요한 라이브러리만 import

### 개발 팁

1. **파일 구조**:
   - 비슷한 기능은 같은 폴더에
   - 공통 코드는 `lib/`에

2. **네이밍**:
   - 파일명 = URL 경로
   - 명확하고 일관성 있게

3. **에러 처리**:
   - try-catch로 에러 처리
   - 사용자에게 친절한 메시지

---

## 문제 해결

### context.renderPage is not a function 에러

**원인**: `context` 객체에 직접 속성을 추가했음

**해결**: 미들웨어에서 `context.data` 사용
```javascript
// ❌ 잘못된 방법
context.renderPage = (layout, body, data) => { ... };

// ✅ 올바른 방법
context.data.renderPage = (layout, body, data) => { ... };
```

핸들러에서도 `context.data`로 접근:
```javascript
// ❌ 잘못된 방법
return context.renderPage(layout, body, data);

// ✅ 올바른 방법
return context.data.renderPage(layout, body, data);
```

### 로그인이 안 됨

- `.dev.vars` 파일 확인
- 쿠키가 설정되는지 개발자 도구에서 확인
- 미들웨어가 올바르게 작동하는지 확인
- `context.data.auth`로 접근하는지 확인

### 페이지가 렌더링 안 됨

- 템플릿 문법 오류 확인
- 브라우저 콘솔에서 에러 확인
- `wrangler pages dev` 터미널 로그 확인
- `context.data.renderPage` 사용 여부 확인

### 폼 검증이 작동 안 함

- `formScript`가 템플릿에 포함되었는지 확인
- 폼 ID가 `new Form('id')`와 일치하는지 확인
- 브라우저 콘솔에서 JavaScript 에러 확인
- Ajax 폼인 경우 서버에서 `context.data.renderJSON` 사용 확인

---

## 참고 자료

- [Cloudflare Pages Functions 문서](https://developers.cloudflare.com/pages/functions/)
- [LiquidJS 문서](https://liquidjs.com/)
- [Bootstrap 5 문서](https://getbootstrap.com/docs/5.3/)

---

## 라이선스

MIT License
