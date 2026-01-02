# Security Guide - XSS 방지

## 1. 안전한 입력 처리

### FormData 처리

`SafeFormData`를 사용하면 자동으로 XSS 이스케이프가 적용됩니다:

```javascript
import { getSafeFormData } from '../lib/input.js';

export async function onRequestPost(context) {
  // 안전한 FormData 가져오기
  const formData = await getSafeFormData(context.request);

  // 자동으로 이스케이프된 값
  const name = formData.get('name');  // XSS 안전
  const email = formData.get('email');  // XSS 안전

  // 원본 값이 필요한 경우 (예: 비밀번호)
  const password = formData.get('password', true);  // raw = true

  // 객체로 변환
  const data = formData.toObject();  // 모든 값이 이스케이프됨

  return context.data.renderPage(layout, body, {
    title: 'Result',
    name,  // 안전하게 출력 가능
    email  // 안전하게 출력 가능
  });
}
```

### URL 쿼리 파라미터 처리

`SafeURLSearchParams`를 사용하면 쿼리 파라미터도 자동으로 이스케이프됩니다:

```javascript
import { getSafeParams } from '../lib/input.js';

export async function onRequestGet(context) {
  // 안전한 쿼리 파라미터 가져오기
  const params = getSafeParams(context.request);

  // 자동으로 이스케이프된 값
  const searchQuery = params.get('q');  // XSS 안전
  const page = params.get('page');  // XSS 안전

  // 객체로 변환
  const allParams = params.toObject();  // 모든 값이 이스케이프됨

  return context.data.renderPage(layout, body, {
    title: 'Search Results',
    query: searchQuery,  // 안전하게 출력 가능
    ...allParams
  });
}
```

## 2. 사용 예시

### 검색 페이지

```javascript
import { getSafeParams } from '../lib/input.js';

export async function onRequestGet(context) {
  const params = getSafeParams(context.request);
  const searchQuery = params.get('q') || '';

  // searchQuery는 이미 이스케이프되어 있어서 안전
  return context.data.renderPage(layout, body, {
    title: 'Search',
    query: searchQuery  // <script>alert('xss')</script> → &lt;script&gt;...
  });
}
```

### 폼 제출 처리

```javascript
import { getSafeFormData } from '../lib/input.js';

export async function onRequestPost(context) {
  const formData = await getSafeFormData(context.request);

  // 서버 측 검증
  if (!form.validate(formData.formData)) {  // 원본 FormData 사용
    const errors = form.getErrors();
    return context.data.renderJSON({ success: false, errors }, 400);
  }

  // 안전한 값 가져오기
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');

  // 비밀번호는 raw로 가져오기 (해싱할 예정이므로)
  const password = formData.get('password', true);

  // 데이터베이스 저장 등...
  await userDao.createUser({
    name,  // 이미 이스케이프됨
    email,
    passwordHash: await hashPassword(password)
  });

  return context.data.renderJSON({ success: true });
}
```

### 로그인 페이지 (원본 값 필요)

```javascript
import { getSafeFormData } from '../lib/input.js';
import { AuthDao } from '../services/AuthDao.js';

export async function onRequestPost(context) {
  const formData = await getSafeFormData(context.request);

  // 비밀번호는 raw로 가져오기 (검증용)
  const username = formData.get('username', true);  // raw
  const password = formData.get('password', true);  // raw

  const authDao = new AuthDao(context.env);
  const user = await authDao.login(username, password);

  if (!user) {
    return context.data.renderJSON({
      success: false,
      message: '로그인 실패'
    }, 401);
  }

  // 로그인 성공
  const auth = new Auth(context);
  auth.setUserId(user.id);
  auth.setData('username', user.username);  // DB에서 온 데이터

  return await auth.login('/mypage/dashboard');
}
```

## 3. API 참고

### SafeFormData

| 메서드 | 설명 | 예시 |
|--------|------|------|
| `get(name, raw?)` | 단일 값 가져오기 | `formData.get('name')` |
| `getAll(name, raw?)` | 모든 값 가져오기 | `formData.getAll('tags')` |
| `toObject(raw?)` | 객체로 변환 | `formData.toObject()` |
| `has(name)` | 필드 존재 여부 | `formData.has('email')` |

### SafeURLSearchParams

| 메서드 | 설명 | 예시 |
|--------|------|------|
| `get(name, raw?)` | 단일 파라미터 가져오기 | `params.get('q')` |
| `getAll(name, raw?)` | 모든 파라미터 가져오기 | `params.getAll('filter')` |
| `toObject(raw?)` | 객체로 변환 | `params.toObject()` |
| `has(name)` | 파라미터 존재 여부 | `params.has('page')` |

### raw 파라미터

- `raw = false` (기본값): 자동 이스케이프 적용
- `raw = true`: 원본 값 반환 (비밀번호, 해시값 등에 사용)

## 4. 보안 체크리스트

- [x] FormData는 `getSafeFormData()` 사용
- [x] URL 파라미터는 `getSafeParams()` 사용
- [x] 비밀번호/해시값은 `raw=true` 사용
- [x] 클라이언트 측 에러 메시지는 `textContent` 사용
- [ ] JWT Secret이 환경 변수에 안전하게 저장
- [ ] HTTPS 사용 (프로덕션)
- [ ] CSP 헤더 설정 고려

## 5. 추가 보안 권장사항

1. **HTTPS 사용**: 프로덕션에서는 항상 HTTPS 사용
2. **CSP 헤더**: Content Security Policy 헤더 설정
3. **Rate Limiting**: 무차별 대입 공격 방지
4. **CSRF 보호**: 중요한 작업에는 CSRF 토큰 사용
5. **비밀번호 해싱**: bcrypt/argon2 사용 (SHA-256 대신)
