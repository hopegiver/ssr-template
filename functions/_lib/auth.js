/**
 * Auth - JWT 기반 인증 시스템
 * - 세션 없이 JWT + HttpOnly 쿠키 사용
 * - 사용자 데이터를 JWT payload에 저장
 */

const JWT_COOKIE_NAME = 'auth_token';
const JWT_EXPIRY = 60 * 60 * 24 * 7; // 7일

export class Auth {
  constructor(context) {
    this.request = context.request;
    this.context = context;
    this.env = context.env;
    this.data = {};
    this.isAuthenticated = false;
    this.userId = null;
    this.savedCookie = null; // 마지막으로 생성된 쿠키 저장
  }

  /**
   * JWT Secret 가져오기
   */
  getSecret() {
    return this.env.JWT_SECRET;
  }

  /**
   * JWT 토큰 생성
   */
  async createToken(payload) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + JWT_EXPIRY
    };

    const encoder = new TextEncoder();
    const headerBase64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadBase64 = this.base64UrlEncode(JSON.stringify(jwtPayload));
    const signatureInput = `${headerBase64}.${payloadBase64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.getSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signatureInput)
    );

    const signatureBase64 = this.base64UrlEncode(signature);
    return `${signatureInput}.${signatureBase64}`;
  }

  /**
   * JWT 토큰 검증
   */
  async verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerBase64, payloadBase64, signatureBase64] = parts;
      const signatureInput = `${headerBase64}.${payloadBase64}`;

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.getSecret()),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signature = this.base64UrlDecode(signatureBase64);
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signature,
        encoder.encode(signatureInput)
      );

      if (!isValid) return null;

      const payload = JSON.parse(
        new TextDecoder().decode(this.base64UrlDecode(payloadBase64))
      );

      // 만료 확인
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) return null;

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * 인증 확인 (실패시 바로 리턴)
   */
  async isAuth() {
    const cookies = this.parseCookies();
    const token = cookies[JWT_COOKIE_NAME];

    if (!token) {
      return false;
    }

    const payload = await this.verifyToken(token);
    if (!payload) {
      return false;
    }

    // 인증 성공: 데이터 로드
    this.isAuthenticated = true;
    this.userId = payload.userId;
    this.data = payload.data || {};

    return true;
  }

  /**
   * 데이터 설정
   */
  setData(key, value) {
    this.data[key] = value;
    return this;
  }

  /**
   * 데이터 가져오기
   */
  getData(key) {
    return this.data[key];
  }

  /**
   * 모든 데이터 가져오기
   */
  getAllData() {
    return this.data;
  }

  /**
   * 사용자 ID 설정
   */
  setUserId(userId) {
    this.userId = userId;
    return this;
  }

  /**
   * 사용자 저장 (로그인/회원가입)
   * - JWT 생성 및 쿠키 설정
   * - userId와 setData로 저장된 데이터 사용
   */
  async save() {
    this.isAuthenticated = true;

    const payload = {
      userId: this.userId,
      data: this.data
    };

    const token = await this.createToken(payload);
    this.savedCookie = this.createCookie(token);
    return this.savedCookie;
  }

  /**
   * 사용자 삭제 (로그아웃)
   */
  delete() {
    this.userId = null;
    this.data = {};
    this.isAuthenticated = false;
    this.savedCookie = this.deleteCookie();
    return this.savedCookie;
  }

  /**
   * 사용자 ID 가져오기
   */
  getUserId() {
    return this.userId;
  }

  /**
   * 로그인 처리
   * - Ajax 요청이면 JSON 응답, 일반 요청이면 리다이렉트
   * - JWT 생성, 쿠키 설정 자동 처리
   */
  async login(redirectUrl) {
    // JWT 생성 및 저장
    const cookie = await this.save();

    // Ajax 요청 확인 (fetch API나 XMLHttpRequest 사용 시)
    const isAjax = this.request.headers.get('X-Requested-With') === 'XMLHttpRequest' ||
                   this.request.headers.get('Accept')?.includes('application/json');

    if (isAjax) {
      // Ajax 요청: JSON 응답
      const response = new Response(JSON.stringify({
        success: true,
        message: '로그인 성공! 리다이렉트 중...',
        redirect: redirectUrl
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        }
      });

      // 쿠키 설정
      response.headers.set('Set-Cookie', `${cookie.name}=${cookie.value}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookie.maxAge}; Path=${cookie.path}`);

      return response;
    } else {
      // 일반 폼 제출: 리다이렉트
      return this.redirect(redirectUrl, cookie);
    }
  }

  /**
   * 리다이렉트 응답 생성
   * - cookie가 없으면 savedCookie 사용
   */
  redirect(url, cookie = null) {
    const headers = {
      'Location': url
    };

    const cookieToUse = cookie || this.savedCookie;
    if (cookieToUse) {
      headers['Set-Cookie'] = `${cookieToUse.name}=${cookieToUse.value}; HttpOnly; Secure; SameSite=Strict; Max-Age=${cookieToUse.maxAge}; Path=${cookieToUse.path}`;
    }

    return new Response(null, {
      status: 302,
      headers
    });
  }

  /**
   * 쿠키 생성
   */
  createCookie(token) {
    return {
      name: JWT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: JWT_EXPIRY,
      path: '/'
    };
  }

  /**
   * 쿠키 삭제
   */
  deleteCookie() {
    return {
      name: JWT_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 0,
      path: '/'
    };
  }

  /**
   * 쿠키 파싱
   */
  parseCookies() {
    const cookieHeader = this.request.headers.get('Cookie');
    if (!cookieHeader) return {};

    return Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        return [name, rest.join('=')];
      })
    );
  }

  /**
   * Base64 URL 인코딩
   */
  base64UrlEncode(data) {
    let base64;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64 URL 디코딩
   */
  base64UrlDecode(base64) {
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4 === 0 ? 0 : 4 - (base64.length % 4);
    base64 += '='.repeat(padding);
    const binary = atob(base64);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
}
