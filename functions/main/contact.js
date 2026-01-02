import { Form } from '../_lib/form.js';
import { layout } from '../_templates/layout/main.js';
import { body } from '../_templates/main/contact.js';

// 폼 검증 규칙 설정 (GET/POST 공통)
const form = new Form('contactForm');
form.setRules({
  name: ['required', 'minLength:2', 'maxLength:50'],
  email: ['required', 'email'],
  message: ['required', 'minLength:10', 'maxLength:1000']
});

// GET 요청 - 연락처 페이지 표시
export async function onRequestGet(context) {
  const data = {
    title: 'Contact',
    description: '궁금한 점이 있으시면 언제든지 연락주세요!',
    email: 'contact@example.com',
    phone: '+82-10-1234-5678',
    address: '서울시 강남구 테헤란로 123',
    social: [
      {
        name: 'GitHub',
        url: 'https://github.com/example',
        handle: '@example'
      },
      {
        name: 'Twitter',
        url: 'https://twitter.com/example',
        handle: '@example'
      }
    ],
    formScript: form.getScript(true) // Ajax 사용
  };

  return context.data.renderPage(layout, body, data);
}

// POST 요청 - 폼 데이터 처리 (Ajax)
export async function onRequestPost(context) {
  const { request } = context;

  try {
    const formData = await request.formData();

    // 서버 측 검증
    if (!form.validate(formData)) {
      const errors = form.getErrors();
      return context.data.renderJSON({ success: false, errors }, 400);
    }

    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');

    // 여기에 실제 폼 처리 로직 추가 (이메일 전송, 데이터베이스 저장 등)
    console.log('Contact form submission:', { name, email, message });

    // 성공 응답
    return context.data.renderJSON({
      success: true,
      message: '메시지가 성공적으로 전송되었습니다! 빠른 시일 내에 답변드리겠습니다.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return context.data.renderJSON({ success: false, message: 'Bad Request' }, 400);
  }
}