/**
 * Query - 쿼리 스트링 파라미터 처리 클래스
 */
export class Query {
  constructor(context) {
    const url = new URL(context.request.url);
    this.searchParams = this._wrapSearchParams(url.searchParams);
  }

  /**
   * URLSearchParams를 SafeSearchParams로 래핑 (내부용)
   */
  _wrapSearchParams(searchParams) {
    return {
      _searchParams: searchParams,
      get: (name, raw = false) => {
        const value = searchParams.get(name);
        if (value === null || value === undefined) return null;
        if (raw) return value;
        return this._escapeHtml(String(value));
      },
      getAll: (name, raw = false) => {
        const values = searchParams.getAll(name);
        if (raw) return values;
        return values.map(v => this._escapeHtml(String(v)));
      },
      has: (name) => searchParams.has(name),
      toObject: (raw = false) => {
        const obj = {};
        for (const [key, value] of searchParams.entries()) {
          obj[key] = raw ? value : this._escapeHtml(String(value));
        }
        return obj;
      },
      _raw: searchParams // 원본 접근용
    };
  }

  /**
   * HTML 이스케이프 (XSS 방지)
   */
  _escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 쿼리 파라미터 값 가져오기 (XSS 이스케이프 적용)
   * @param {string} name - 파라미터명
   * @param {any} defaultValue - 값이 없을 경우 반환할 기본값
   */
  get(name, defaultValue = null) {
    const value = this.searchParams.get(name, false);
    return (value === null || value === undefined || value === '') ? defaultValue : value;
  }

  /**
   * 쿼리 파라미터 원본 값 가져오기 (XSS 이스케이프 없이)
   * @param {string} name - 파라미터명
   * @param {any} defaultValue - 값이 없을 경우 반환할 기본값
   */
  getRaw(name, defaultValue = null) {
    const value = this.searchParams.get(name, true);
    return (value === null || value === undefined || value === '') ? defaultValue : value;
  }

  /**
   * 쿼리 파라미터 배열로 값 가져오기
   * @param {string} name - 파라미터명
   */
  getAll(name) {
    return this.searchParams.getAll(name, false);
  }

  /**
   * 쿼리 파라미터 존재 여부 확인
   * @param {string} name - 파라미터명
   */
  has(name) {
    return this.searchParams.has(name);
  }

  /**
   * 모든 쿼리 파라미터를 객체로 변환 (XSS 이스케이프 적용)
   */
  toObject() {
    return this.searchParams.toObject(false);
  }

  /**
   * 특정 파라미터만 가져오기 (XSS 이스케이프 적용)
   * @param {...string} fields - 가져올 파라미터명들
   */
  only(...fields) {
    const result = {};
    fields.forEach(field => {
      const value = this.searchParams.get(field, false);
      if (value !== null && value !== undefined) {
        result[field] = value;
      }
    });
    return result;
  }

  /**
   * 특정 파라미터만 가져오기 (원본, XSS 이스케이프 없이)
   * @param {...string} fields - 가져올 파라미터명들
   */
  onlyRaw(...fields) {
    const result = {};
    fields.forEach(field => {
      const value = this.searchParams.get(field, true);
      if (value !== null && value !== undefined) {
        result[field] = value;
      }
    });
    return result;
  }

  /**
   * 특정 파라미터 제외하고 가져오기 (XSS 이스케이프 적용)
   * @param {...string} fields - 제외할 파라미터명들
   */
  except(...fields) {
    const data = this.searchParams.toObject(false);
    fields.forEach(field => delete data[field]);
    return data;
  }
}
