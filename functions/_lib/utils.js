/**
 * Utils - 유용한 유틸리티 함수 모음
 */

/**
 * HTML 이스케이프 함수 (XSS 방지)
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * SafeFormData - FormData 래퍼
 * 자동으로 XSS 이스케이프를 적용하는 FormData 래퍼 클래스
 */
export class SafeFormData {
  constructor(formData) {
    this.formData = formData;
  }

  get(name, raw = false) {
    const value = this.formData.get(name);
    if (value === null || value === undefined) return null;
    if (raw) return value;
    return escapeHtml(String(value));
  }

  getAll(name, raw = false) {
    const values = this.formData.getAll(name);
    if (raw) return values;
    return values.map(v => escapeHtml(String(v)));
  }

  has(name) {
    return this.formData.has(name);
  }

  toObject(raw = false) {
    const obj = {};
    for (const [key, value] of this.formData.entries()) {
      obj[key] = raw ? value : escapeHtml(String(value));
    }
    return obj;
  }
}

/**
 * SafeURLSearchParams - URLSearchParams 래퍼
 * 자동으로 XSS 이스케이프를 적용하는 URLSearchParams 래퍼 클래스
 */
export class SafeURLSearchParams {
  constructor(searchParams) {
    this.searchParams = searchParams;
  }

  get(name, raw = false) {
    const value = this.searchParams.get(name);
    if (value === null || value === undefined) return null;
    if (raw) return value;
    return escapeHtml(String(value));
  }

  getAll(name, raw = false) {
    const values = this.searchParams.getAll(name);
    if (raw) return values;
    return values.map(v => escapeHtml(String(v)));
  }

  has(name) {
    return this.searchParams.has(name);
  }

  toObject(raw = false) {
    const obj = {};
    for (const [key, value] of this.searchParams.entries()) {
      obj[key] = raw ? value : escapeHtml(String(value));
    }
    return obj;
  }
}

/**
 * 헬퍼 함수: 안전한 FormData 생성
 */
export async function getSafeFormData(request) {
  const formData = await request.formData();
  return new SafeFormData(formData);
}

/**
 * 헬퍼 함수: 안전한 쿼리 파라미터 가져오기
 */
export function getSafeParams(requestOrUrl) {
  const url = requestOrUrl instanceof URL ? requestOrUrl : new URL(requestOrUrl.url);
  return new SafeURLSearchParams(url.searchParams);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date, format = 'datetime') {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options = {
    date: { year: 'numeric', month: '2-digit', day: '2-digit' },
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    },
    time: { hour: '2-digit', minute: '2-digit' }
  };

  return d.toLocaleString('ko-KR', options[format]);
}

/**
 * 문자열 자르기 (말줄임표 추가)
 */
export function truncate(str, maxLength, suffix = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 랜덤 문자열 생성
 */
export function randomString(length = 16, charset = 'alphanumeric') {
  const charsets = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef'
  };

  const chars = charsets[charset] || charset;
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * 페이지네이션 정보 계산
 */
export function paginate(totalItems, currentPage = 1, itemsPerPage = 10) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    offset,
    limit: itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
}
