import { Auth } from '../_lib/auth.js';
import { Form } from '../_lib/form.js';
import { layout } from '../_templates/layout/main.js';
import { body } from '../_templates/main/login.js';

// 폼 검증 규칙
const form = new Form('loginForm');
form.setRules({
  username: ['required', 'minLength:3', 'maxLength:50'],
  password: ['required', 'minLength:6']
});

// GET 요청 - 로그인 페이지 표시
export async function onRequestGet(context) {
  const data = {
    title: 'Login',
    description: '로그인하여 계속하세요',
    formScript: form.getScript(true) // Ajax 사용
  };

  return context.data.renderPage(layout, body, data);
}

// POST 요청 - 로그인 처리
export async function onRequestPost(context) {
  const { request } = context;

  try {
    const formData = await request.formData();

    // 서버 측 검증
    if (!form.validate(formData)) {
      const errors = form.getErrors();
      return context.data.renderJSON({ success: false, errors }, 400);
    }

    const username = formData.get('username');
    const password = formData.get('password');

    // 실제로는 데이터베이스에서 사용자 확인
    // 여기서는 데모용으로 간단히 처리
    if (username === 'admin' && password === 'password') {
      const auth = new Auth(context);

      // 사용자 데이터 설정
      auth.setUserId('user_123');
      auth.setData('username', username);
      auth.setData('role', 'admin');
      auth.setData('email', 'admin@example.com');

      // 로그인 처리 (JWT 생성, 쿠키 설정, JSON 응답)
      return await auth.login('/mypage/dashboard');
    } else {
      return context.data.renderJSON({
        success: false,
        message: '로그인 실패: 아이디 또는 비밀번호가 올바르지 않습니다.'
      }, 401);
    }

  } catch (error) {
    console.error('Login error:', error);
    return context.data.renderJSON({ success: false, message: '폼 제출 중 오류가 발생했습니다.' }, 400);
  }
}
