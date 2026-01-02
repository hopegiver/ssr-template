# Form 클래스 사용 가이드

## 기본 사용법 (새로운 방식)

```javascript
import { Form } from '../lib/form.js';

export async function onRequestPost(context) {
  const form = new Form('myForm');

  // 1. Context에서 FormData 로드 (자동으로 XSS 이스케이프 적용)
  await form.load(context);

  // 2. 검증 규칙 설정
  form.setRules({
    username: ['required', 'minLength:3'],
    email: ['required', 'email'],
    password: ['required', 'minLength:8']
  });

  // 3. 검증 실행 (load()를 사용했으면 파라미터 생략 가능)
  if (!form.validate()) {
    return renderJSON({
      success: false,
      errors: form.getErrors()
    }, 400);
  }

  // 4. 안전하게 값 가져오기 (자동 XSS 이스케이프)
  const username = form.get('username');  // XSS 이스케이프 적용됨
  const email = form.get('email');
  const password = form.get('password', true);  // raw=true: 비밀번호는 이스케이프 안함

  // 5. 객체로 변환
  const safeData = form.toObject();  // 모든 필드 이스케이프
  const rawData = form.toObject(true);  // 원본 데이터

  // 데이터 처리...
}
```

## 기존 방식 (하위 호환성 유지)

```javascript
export async function onRequestPost(context) {
  const form = new Form('myForm');

  form.setRules({
    username: ['required', 'minLength:3']
  });

  // 직접 FormData 전달
  const formData = await context.request.formData();

  if (!form.validate(formData)) {
    return renderJSON({
      success: false,
      errors: form.getErrors()
    }, 400);
  }

  // 이 경우 수동으로 SafeFormData 사용 필요
  const username = formData.get('username');
}
```

## 주요 메소드

### `async load(context)`
- Context에서 FormData를 로드하고 내부적으로 SafeFormData로 래핑
- POST 요청일 때만 처리
- 체이닝 가능: `await form.load(context).setRules(...)`

### `get(name, raw = false)`
- 필드 값을 안전하게 가져오기
- `raw=false`: XSS 이스케이프 적용 (기본값)
- `raw=true`: 원본 값 (비밀번호, 파일 등)

### `getAll(name, raw = false)`
- 배열 형태로 값 가져오기 (checkbox 등)

### `has(name)`
- 필드 존재 여부 확인

### `toObject(raw = false)`
- 모든 필드를 객체로 변환
- `raw=false`: 모든 값 이스케이프
- `raw=true`: 원본 데이터

### `validate(formData = null)`
- FormData 검증
- `formData` 생략 시 `load()`로 로드된 데이터 사용

### `setRules(rules)`
- 검증 규칙 설정

### `setData(data)`
- 수정 페이지용 기존 데이터 설정

### `getErrors()`
- 검증 에러 객체 반환

### `getScript(useAjax = false)`
- 클라이언트 측 자동 적용 스크립트 생성

## XSS 방지 예시

```javascript
// 사용자가 "<script>alert('XSS')</script>" 입력
const username = form.get('username');
// 결과: "&lt;script&gt;alert('XSS')&lt;/script&gt;"
// 템플릿에 안전하게 출력 가능

// 비밀번호는 raw로 가져오기
const password = form.get('password', true);
// 결과: 원본 그대로 (해싱을 위해)
```

## 체이닝 예시

```javascript
const form = new Form('form1');

await form.load(context);

form.setRules({
  name: ['required'],
  email: ['required', 'email']
});

if (!form.validate()) {
  // 에러 처리
}

// 또는 한 줄로:
const form = await new Form('form1').load(context);
form.setRules({ ... });
```
