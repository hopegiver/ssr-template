import { Auth } from '../_lib/auth.js';

// 로그아웃 처리
export async function onRequestGet(context) {
  const auth = new Auth(context);

  // 쿠키 삭제 및 리다이렉트
  auth.delete();
  return auth.redirect('/');
}
