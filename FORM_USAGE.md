# Form 클래스 사용 가이드

## 기본 사용법

```javascript
import { Form } from '../lib/form.js';

export async function onRequestPost(context) {
  const form = new Form('myForm');

  // 1. Context에서 FormData 로드
  await form.load(context);

  // 2. 검증 규칙 설정
  form.setRules({
    username: ['required', 'alphanumeric', 'minLength:3'],
    email: ['required', 'email'],
    password: ['required', 'minLength:8'],
    password_confirmation: ['required', 'confirmed:password_confirmation']
  });

  // 3. 검증 실패 시 자동 응답
  if (!form.validate()) {
    return form.failResponse();
  }

  // 4. 안전하게 값 가져오기 (자동 XSS 이스케이프)
  const username = form.get('username');
  const email = form.get('email');

  // 5. 비밀번호는 raw로 가져오기 (해싱을 위해)
  const password = form.getRaw('password');

  // 6. 기본값 사용
  const age = form.get('age', 18); // age가 없으면 18 반환

  // 데이터 처리...
}
```

## 주요 메소드

### 데이터 로딩

#### `async load(context)`
Context에서 FormData를 로드하고 내부적으로 SafeFormData로 래핑

```javascript
await form.load(context);
```

### 데이터 가져오기

#### `get(name, defaultValue = null)`
필드 값을 안전하게 가져오기 (XSS 이스케이프 적용)

```javascript
const username = form.get('username');
const age = form.get('age', 18); // 기본값 18
```

#### `getRaw(name, defaultValue = null)`
원본 값 가져오기 (XSS 이스케이프 없이)

```javascript
const password = form.getRaw('password');
```

#### `getAll(name)`
배열 형태로 값 가져오기 (checkbox 등)

```javascript
const hobbies = form.getAll('hobbies');
```

#### `getFile(name)`
파일 필드 가져오기

```javascript
const avatar = form.getFile('avatar');
if (avatar) {
  // File 객체 처리
  console.log(avatar.name, avatar.size, avatar.type);
}
```

#### `getFiles(name)`
여러 파일 가져오기

```javascript
const photos = form.getFiles('photos');
photos.forEach(file => {
  console.log(file.name);
});
```

#### `only(...fields)`
특정 필드만 가져오기 (XSS 이스케이프 적용)

```javascript
const userData = form.only('username', 'email'); // password 제외
```

#### `onlyRaw(...fields)`
특정 필드만 가져오기 (원본, XSS 이스케이프 없이)

```javascript
const credentials = form.onlyRaw('username', 'password');
```

#### `except(...fields)`
특정 필드 제외하고 가져오기

```javascript
const safeData = form.except('_csrf', '_method');
```

#### `toObject()`
모든 필드를 객체로 변환 (XSS 이스케이프 적용)

```javascript
const data = form.toObject();
```

### 검증

#### `setRules(rules)`
검증 규칙 설정

```javascript
form.setRules({
  username: ['required', 'alphanumeric', 'minLength:3'],
  email: ['required', 'email']
});
```

#### `validate(formData = null)`
FormData 검증 (`load()` 사용 시 파라미터 생략 가능)

```javascript
if (!form.validate()) {
  // 검증 실패
}
```

#### `getErrors()`
검증 에러 객체 반환

```javascript
const errors = form.getErrors();
// { username: '최소 3자 이상 입력해주세요.' }
```

#### `failResponse(statusCode = 400)`
검증 실패 시 JSON 응답 자동 생성

```javascript
if (!form.validate()) {
  return form.failResponse();
}
```

### 기타

#### `setData(data)`
수정 페이지용 기존 데이터 설정

```javascript
form.setData({
  username: 'john',
  email: 'john@example.com'
});
```

#### `has(name)`
필드 존재 여부 확인

```javascript
if (form.has('username')) {
  // ...
}
```

#### `getScript(useAjax = false)`
클라이언트 측 자동 적용 스크립트 생성

## 검증 규칙

### 기본 규칙

- `required` - 필수 입력
- `email` - 이메일 형식
- `url` - URL 형식
- `numeric` - 숫자만
- `alpha` - 알파벳만
- `alphanumeric` - 알파벳+숫자만

### 길이 검증

- `minLength:N` - 최소 N자
- `maxLength:N` - 최대 N자

### 값 검증

- `min:N` - 최소값 N
- `max:N` - 최대값 N
- `in:value1,value2,value3` - 허용 값 목록

### 고급 규칙

- `confirmed:fieldName` - 확인 필드 일치 (비밀번호 확인 등)
- `pattern:regex` - 정규식 패턴

### 사용 예시

```javascript
form.setRules({
  username: ['required', 'alphanumeric', 'minLength:3', 'maxLength:20'],
  email: ['required', 'email'],
  age: ['required', 'numeric', 'min:18', 'max:100'],
  website: ['url'],
  password: ['required', 'minLength:8'],
  password_confirmation: ['required', 'confirmed:password_confirmation'],
  gender: ['required', 'in:male,female,other'],
  phone: ['pattern:^010-\\d{4}-\\d{4}$']
});
```

## XSS 방지

### 자동 이스케이프

```javascript
// 사용자가 "<script>alert('XSS')</script>" 입력
const username = form.get('username');
// 결과: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
// 템플릿에 안전하게 출력 가능
```

### 원본 값 필요 시

```javascript
// 비밀번호, 파일 등은 raw로 가져오기
const password = form.getRaw('password');
const data = form.onlyRaw('password', 'api_key');
```

## 실전 예제

### 회원가입

```javascript
export async function onRequestPost(context) {
  const form = new Form('registerForm');
  await form.load(context);

  form.setRules({
    username: ['required', 'alphanumeric', 'minLength:3'],
    email: ['required', 'email'],
    password: ['required', 'minLength:8'],
    password_confirmation: ['required', 'confirmed:password_confirmation'],
    agree: ['required']
  });

  if (!form.validate()) {
    return form.failResponse();
  }

  const userData = form.only('username', 'email');
  const password = form.getRaw('password');

  // 회원가입 처리...
}
```

### 파일 업로드

```javascript
export async function onRequestPost(context) {
  const form = new Form('uploadForm');
  await form.load(context);

  form.setRules({
    title: ['required', 'maxLength:100'],
    description: ['maxLength:500']
  });

  if (!form.validate()) {
    return form.failResponse();
  }

  const file = form.getFile('avatar');
  if (!file) {
    return new Response(JSON.stringify({
      success: false,
      message: '파일을 선택해주세요.'
    }), { status: 400 });
  }

  // 파일 업로드 처리...
}
```

### 프로필 수정

```javascript
export async function onRequestGet(context) {
  const form = new Form('profileForm');

  // 기존 데이터 로드
  const user = await getUserById(userId);
  form.setData({
    username: user.username,
    email: user.email,
    bio: user.bio
  });

  return renderPage(layout, body, {
    form: form.getScript()
  });
}

export async function onRequestPost(context) {
  const form = new Form('profileForm');
  await form.load(context);

  form.setRules({
    username: ['required', 'minLength:3'],
    email: ['required', 'email'],
    bio: ['maxLength:500']
  });

  if (!form.validate()) {
    return form.failResponse();
  }

  const updateData = form.only('username', 'email', 'bio');

  // 업데이트 처리...
}
```
