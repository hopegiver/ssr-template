import { layout } from '../templates/layout/main.js';
import { body } from '../templates/mypage/dashboard.js';

// GET 요청 - 대시보드 페이지
// 미들웨어에서 이미 인증 체크했으므로 바로 렌더링
export async function onRequestGet(context) {
  const auth = context.data.auth;

  // 인증된 사용자 데이터 가져오기
  const data = {
    title: 'Dashboard',
    description: '환영합니다!',
    userId: auth.getUserId(),
    username: auth.getData('username'),
    role: auth.getData('role'),
    email: auth.getData('email')
  };

  return context.data.renderPage(layout, body, data);
}
