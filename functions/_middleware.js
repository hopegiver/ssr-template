import { Auth } from './lib/auth.js';
import { renderPage as _renderPage, renderJSON as _renderJSON } from './lib/template.js';

/**
 * 글로벌 미들웨어
 * 모든 요청에 대해 실행됨
 */
export async function onRequest(context) {
  console.log('[Middleware] Global middleware executed');

  // 모든 context에 auth 인스턴스 추가
  context.data = context.data || {};
  context.data.auth = new Auth(context);

  // 인증 상태 확인 (선택적)
  await context.data.auth.isAuth();

  // context.data에 renderPage, renderJSON 헬퍼 추가
  context.data.renderPage = (layout, body, data = {}) => {
    return _renderPage(layout, body, data, context);
  };

  context.data.renderJSON = (data, status = 200) => {
    return _renderJSON(data, status);
  };

  console.log('[Middleware] Helpers added to context.data');

  // 다음 핸들러로 전달
  return context.next();
}

/**
 * 인증이 필요한 경로 보호 미들웨어
 * 특정 폴더에 적용하려면: functions/protected/_middleware.js
 */
export async function requireAuth(context) {
  const auth = context.auth || new Auth(context);

  if (!await auth.isAuth()) {
    return auth.redirect('/login');
  }

  // 인증 성공 시 context에 auth 추가
  context.auth = auth;
  return context.next();
}
