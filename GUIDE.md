# PagesKit 개발 가이드

Cloudflare Pages 전용 경량 SSR 프레임워크

## 목차

- [프로젝트 구조](#프로젝트-구조)
- [핵심 구성요소](#핵심-구성요소)
- [빠른 시작](#빠른-시작)
- [_lib 활용](#lib-활용)
- [_services 활용](#services-활용)
- [_templates 활용](#templates-활용)
- [환경 변수 & 배포](#환경-변수--배포)

---

## 프로젝트 구조

```
functions/
├── _middleware.js          # 글로벌 미들웨어
├── index.js                # 홈 (/)
├── main/                   # 공개 페이지 (/main/*)
│   └── _middleware.js?     # 폴더별 미들웨어 (선택)
├── mypage/                 # 인증 필요 (/mypage/*)
│   └── _middleware.js      # 인증 가드
├── _lib/                   # 🔧 핵심 라이브러리 (라우트 제외)
│   ├── auth.js             # JWT 인증
│   ├── database.js         # DB 추상화
│   ├── form.js             # 폼 검증 + XSS 보호
│   ├── query.js            # 쿼리 파라미터 + XSS 보호
│   ├── template.js         # LiquidJS 렌더링
│   └── utils.js            # 유틸리티
├── _services/              # 📦 데이터 접근 계층 (라우트 제외)
│   ├── UserDao.js          # 사용자 CRUD
│   └── AuthDao.js          # 인증 로직
└── _templates/             # 🎨 템플릿 파일 (라우트 제외)
    ├── layout/main.js      # 레이아웃
    ├── main/*.js           # 페이지별 템플릿
    └── index.js
```

**⚠️ 언더스코어(`_`) 폴더**: Cloudflare Pages에서 라우트로 노출되지 않습니다.

---

## 핵심 구성요소

### 1️⃣ 라우트 (Controller)
파일 경로 = URL 경로
- `functions/index.js` → `/`
- `functions/main/about.js` → `/main/about`
- HTTP 메서드별 핸들러: `onRequestGet`, `onRequestPost`

### 2️⃣ _lib (라이브러리)
재사용 가능한 핵심 기능
- **Form**: 폼 검증 + XSS 보호
- **Query**: 쿼리 파라미터 + XSS 보호
- **Auth**: JWT + HttpOnly 쿠키
- **Database**: D1 추상화 (쿼리 헬퍼)
- **Template**: LiquidJS 렌더링

### 3️⃣ _services (데이터 계층)
DAO 패턴으로 비즈니스 로직 분리
- **UserDao**: 사용자 CRUD
- **AuthDao**: 비밀번호 검증, 로그인 처리

### 4️⃣ _templates (뷰)
LiquidJS 템플릿 (JavaScript 문자열)
- **layout**: 공통 레이아웃
- **페이지별 body**: 페이지 고유 콘텐츠

### 5️⃣ 미들웨어
요청 전처리 및 `context.data` 공유
- **글로벌**: `functions/_middleware.js`
- **폴더별**: `functions/mypage/_middleware.js`

---

## 빠른 시작

### 정적 페이지 만들기

**1단계**: 템플릿 작성 (`functions/_templates/example.js`)
```javascript
export const body = `
<h1>{{ title }}</h1>
<p>{{ description }}</p>
`;
```

**2단계**: 라우트 작성 (`functions/example.js`)
```javascript
import { layout } from './_templates/layout/main.js';
import { body } from './_templates/example.js';

export async function onRequest(context) {
  return context.data.renderPage(layout, body, {
    title: 'Example',
    description: '간단한 페이지'
  });
}
```

### 데이터베이스 조회 페이지

```javascript
import { UserDao } from './_services/UserDao.js';

export async function onRequestGet(context) {
  const userDao = new UserDao(context.env);
  const users = await userDao.getAllUsers(10, 0);

  return context.data.renderPage(layout, body, { users });
}
```

### JSON API

```javascript
export async function onRequestGet(context) {
  return context.data.renderJSON({
    success: true,
    data: { message: 'Hello' }
  });
}
```

---

## _lib 활용

### Form - 폼 검증 + XSS 보호

```javascript
import { Form } from './_lib/form.js';

export async function onRequestPost(context) {
  const form = new Form('myForm');
  await form.load(context);

  form.setRules({
    username: ['required', 'alphanumeric', 'minLength:3'],
    email: ['required', 'email'],
    password: ['required', 'minLength:8']
  });

  if (!form.validate()) {
    return form.failResponse(); // 400 JSON 자동 응답
  }

  // XSS 이스케이프 자동 적용
  const username = form.get('username');
  const password = form.getRaw('password'); // raw (해싱용)
  const userData = form.only('username', 'email'); // 선택적 추출

  // 처리...
  return context.data.renderJSON({ success: true });
}
```

**주요 메소드**:
- `load(context)` - FormData 로드
- `get(name, default)` - XSS 보호된 값
- `getRaw(name, default)` - 원본 값 (비밀번호, API 키)
- `getFile(name)` - 파일
- `only(...fields)` / `except(...fields)` - 선택적 추출
- `validate()` - 검증 실행
- `failResponse()` - JSON 에러 응답

**검증 규칙**: `required`, `email`, `url`, `numeric`, `alpha`, `alphanumeric`, `minLength:N`, `maxLength:N`, `min:N`, `max:N`, `confirmed:field`, `in:a,b,c`, `pattern:regex`

### Query - 쿼리 파라미터 + XSS 보호

```javascript
import { Query } from './_lib/query.js';

export async function onRequestGet(context) {
  const query = new Query(context);

  const search = query.get('search');          // XSS 이스케이프
  const category = query.get('category', 'all'); // 기본값
  const page = parseInt(query.get('page', '1'));
  const tags = query.getAll('tags');           // ?tags=a&tags=b
  const filters = query.only('status', 'type'); // 선택적 추출
}
```

**주요 메소드**: `get(name, default)`, `getRaw(name, default)`, `getAll(name)`, `has(name)`, `only(...fields)`, `except(...fields)`, `toObject()`

### Auth - JWT 인증

**로그인**:

```javascript
import { Auth } from './_lib/auth.js';
import { AuthDao } from './_services/AuthDao.js';

export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const username = formData.get('username');
  const password = formData.get('password');

  const authDao = new AuthDao(context.env);
  const user = await authDao.login(username, password);

  if (user) {
    const auth = new Auth(context);
    auth.setUserId(user.id);
    auth.setData('username', user.username);
    auth.setData('role', user.role);

    // Ajax/일반 폼 자동 감지, 쿠키 자동 설정
    return await auth.login('/mypage/dashboard');
  }

  return context.data.renderJSON({ success: false, message: '로그인 실패' }, 401);
}
```

**로그아웃**:
```javascript
import { Auth } from './_lib/auth.js';

export async function onRequestGet(context) {
  const auth = new Auth(context);
  auth.delete();
  return auth.redirect('/');
}
```

**인증 정보 사용**:
```javascript
export async function onRequestGet(context) {
  const { auth } = context.data;
  const userId = auth.getUserId();
  const username = auth.getData('username');

  return context.data.renderPage(layout, body, { userId, username });
}
```

**주요 메소드**: `isAuth()`, `setUserId()`, `setData(key, value)`, `getData(key)`, `login(url)`, `delete()`, `redirect(url)`

### Database - D1 추상화

```javascript
import { Database } from './_lib/database.js';

export async function onRequest(context) {
  const db = new Database(context.env);

  // 단일 행
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [123]);

  // 여러 행
  const users = await db.query('SELECT * FROM users LIMIT ?', [10]);

  // 삽입
  await db.insert('users', { username: 'john', email: 'john@example.com' });

  // 수정
  await db.update('users', { email: 'new@example.com' }, { id: 123 });

  // 삭제
  await db.delete('users', { id: 123 });
}
```

### Utils - 유틸리티

```javascript
import { formatDate, truncate, randomString, escapeHtml } from './_lib/utils.js';

const formatted = formatDate(new Date()); // 2025-01-02 14:30:00
const short = truncate('Long text...', 10); // Long text...
const token = randomString(32); // 랜덤 문자열
const safe = escapeHtml('<script>alert("xss")</script>'); // &lt;script&gt;...
```

---

## _services 활용

DAO 패턴으로 데이터 계층 분리. 라우트는 컨트롤러 역할만, 비즈니스 로직은 서비스에서.

### UserDao - 사용자 CRUD

```javascript
import { UserDao } from './_services/UserDao.js';

export async function onRequestGet(context) {
  const userDao = new UserDao(context.env);

  // 사용자 조회
  const user = await userDao.getUserById(123);
  const users = await userDao.getAllUsers(50, 0); // limit, offset

  // 사용자 생성
  const newUser = await userDao.createUser({
    username: 'john',
    email: 'john@example.com',
    passwordHash: 'hashed_password',
    role: 'user'
  });

  // 수정/삭제
  await userDao.updateUser(123, { email: 'new@example.com' });
  await userDao.updatePassword(123, 'new_hashed_password');
  await userDao.deleteUser(123);
}
```

**제공 메소드**: `getUserById()`, `getUserByUsername()`, `getUserByEmail()`, `getAllUsers()`, `createUser()`, `updateUser()`, `updatePassword()`, `deleteUser()`, `getUserCount()`

### AuthDao - 인증 로직

```javascript
import { AuthDao } from './_services/AuthDao.js';

export async function onRequestPost(context) {
  const authDao = new AuthDao(context.env);

  // 로그인 (비밀번호 자동 검증)
  const user = await authDao.login('username', 'password');
  if (user) {
    // 로그인 성공
  }

  // 회원가입
  const newUser = await authDao.register('john', 'john@example.com', 'password123');
}
```

**제공 메소드**: `login(username, password)`, `register(username, email, password)`

### 커스텀 DAO 만들기

```javascript
// functions/_services/ProductDao.js
import { Database } from '../_lib/database.js';

export class ProductDao {
  constructor(env) {
    this.db = new Database(env);
  }

  async getProductById(id) {
    return await this.db.queryOne('SELECT * FROM products WHERE id = ?', [id]);
  }

  async getAllProducts(limit = 50, offset = 0) {
    return await this.db.query('SELECT * FROM products LIMIT ? OFFSET ?', [limit, offset]);
  }
}
```

---

## _templates 활용

### 템플릿 작성 패턴

**레이아웃** (`functions/_templates/layout/main.js`):
```javascript
export const layout = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {{ body }}  <!-- 페이지 콘텐츠가 여기 삽입됨 -->
</body>
</html>
`;
```

**페이지 템플릿** (`functions/_templates/products/list.js`):
```javascript
export const body = `
<h1>{{ title }}</h1>
<ul>
{% for product in products %}
  <li>{{ product.name }} - ${{ product.price }}</li>
{% endfor %}
</ul>
`;
```

**라우트에서 사용**:
```javascript
import { layout } from './_templates/layout/main.js';
import { body } from './_templates/products/list.js';

export async function onRequestGet(context) {
  const products = await productDao.getAllProducts();
  return context.data.renderPage(layout, body, { title: 'Products', products });
}
```

### LiquidJS 문법

**변수**: `{{ variable }}`
**조건**: `{% if condition %} ... {% else %} ... {% endif %}`
**반복**: `{% for item in items %} ... {% endfor %}`
**필터**: `{{ text | escape }}`, `{{ date | date: "%Y-%m-%d" }}`

**자동 제공 변수**: `isAuthenticated`, `username`, `body`

---

## 환경 변수 & 배포

### 로컬 개발

`.dev.vars` 파일 생성 (Git 제외):
```bash
JWT_SECRET=your-secret-key-here
```

```bash
npm install
npx wrangler pages dev .
# http://localhost:8788
```

### Cloudflare Pages 배포

1. **Git 연결**: Cloudflare Pages 대시보드 → "Create a project"
2. **빌드 설정**: Build command: (none), Output: `.`
3. **환경 변수**: Settings → Environment variables → `JWT_SECRET` 추가
4. **배포**: `main` 브랜치 푸시 → 자동 배포

### 코드에서 환경 변수 사용

```javascript
export async function onRequest(context) {
  const secret = context.env.JWT_SECRET;
  const db = context.env.DB; // D1 데이터베이스
}
```

---

## 핵심 패턴

### context.data 패턴 (필수)

미들웨어는 **반드시** `context.data` 사용:

```javascript
// functions/_middleware.js
export async function onRequest(context) {
  context.data = context.data || {};
  context.data.auth = new Auth(context);
  context.data.renderPage = (layout, body, data) => _renderPage(layout, body, data, context);
  return context.next();
}

// 라우트에서
const { auth } = context.data;
return context.data.renderPage(layout, body, data);
```

### 폴더별 인증 가드

```javascript
// functions/mypage/_middleware.js
export async function onRequest(context) {
  if (!context.data.auth.isAuthenticated) {
    return context.data.auth.redirect('/main/login');
  }
  return context.next();
}
```

### 전체 예제 - CRUD 페이지

```javascript
// functions/products/list.js
import { layout } from '../_templates/layout/main.js';
import { body } from '../_templates/products/list.js';
import { ProductDao } from '../_services/ProductDao.js';
import { Query } from '../_lib/query.js';

export async function onRequestGet(context) {
  const query = new Query(context);
  const page = parseInt(query.get('page', '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const productDao = new ProductDao(context.env);
  const products = await productDao.getAllProducts(limit, offset);

  return context.data.renderPage(layout, body, {
    title: 'Products',
    products,
    page
  });
}
```

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| `context.renderPage is not a function` | 미들웨어에서 `context.data.renderPage` 사용 |
| 로그인 안 됨 | `.dev.vars` 확인, `context.data.auth` 사용 확인 |
| 템플릿 렌더링 안 됨 | LiquidJS 문법 오류 확인, 콘솔 로그 확인 |
| 폼 검증 안 됨 | 폼 ID 일치 확인, `formScript` 포함 확인 |

---

## 참고 자료

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [LiquidJS](https://liquidjs.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

**PagesKit** - Cloudflare Pages 전용 경량 SSR 프레임워크 | MIT License
