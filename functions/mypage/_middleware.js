/**
 * 마이페이지 미들웨어
 * /mypage/* 경로에 대해 인증 체크
 */
export async function onRequest(context) {
  const auth = context.data.auth;

  // 인증 확인
  if (!await auth.isAuth()) {
    return auth.redirect('/main/login');
  }

  // 인증된 경우 다음 핸들러로
  return context.next();
}
