/**
 * Form - 폼 유효성 검사 및 자동 속성 적용
 */
export class Form {
  constructor(formId = 'form1') {
    this.formId = formId;
    this.rules = {};
    this.data = {};
    this.errors = {};
    this.formData = null; // SafeFormData instance
  }

  /**
   * Context에서 FormData를 로드하고 SafeFormData로 래핑
   * @param {Object} context - Cloudflare Pages context
   */
  async load(context) {
    if (context.request.method === 'POST') {
      const rawFormData = await context.request.formData();
      this.formData = this._wrapFormData(rawFormData);
    }
    return this;
  }

  /**
   * FormData를 SafeFormData로 래핑 (내부용)
   */
  _wrapFormData(rawFormData) {
    return {
      _formData: rawFormData,
      get: (name, raw = false) => {
        const value = rawFormData.get(name);
        if (value === null || value === undefined) return null;
        if (raw) return value;
        return this._escapeHtml(String(value));
      },
      getAll: (name, raw = false) => {
        const values = rawFormData.getAll(name);
        if (raw) return values;
        return values.map(v => this._escapeHtml(String(v)));
      },
      has: (name) => rawFormData.has(name),
      toObject: (raw = false) => {
        const obj = {};
        for (const [key, value] of rawFormData.entries()) {
          obj[key] = raw ? value : this._escapeHtml(String(value));
        }
        return obj;
      },
      _raw: rawFormData // 원본 접근용
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
   * FormData에서 안전하게 값 가져오기
   * @param {string} name - 필드명
   * @param {any} defaultValue - 값이 없을 경우 반환할 기본값
   */
  get(name, defaultValue = null) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const value = this.formData.get(name, false);
    return (value === null || value === undefined || value === '') ? defaultValue : value;
  }

  /**
   * FormData에서 원본 값 가져오기 (XSS 이스케이프 없이)
   * @param {string} name - 필드명
   * @param {any} defaultValue - 값이 없을 경우 반환할 기본값
   */
  getRaw(name, defaultValue = null) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const value = this.formData.get(name, true);
    return (value === null || value === undefined || value === '') ? defaultValue : value;
  }

  /**
   * FormData에서 배열로 값 가져오기
   */
  getAll(name) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    return this.formData.getAll(name, false);
  }

  /**
   * 파일 필드 가져오기
   * @param {string} name - 파일 필드명
   * @returns {File|null}
   */
  getFile(name) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const file = this.formData._raw.get(name);
    return (file instanceof File && file.size > 0) ? file : null;
  }

  /**
   * 여러 파일 가져오기
   * @param {string} name - 파일 필드명
   * @returns {File[]}
   */
  getFiles(name) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const files = this.formData._raw.getAll(name);
    return files.filter(file => file instanceof File && file.size > 0);
  }

  /**
   * FormData 필드 존재 여부 확인
   */
  has(name) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    return this.formData.has(name);
  }

  /**
   * FormData를 객체로 변환
   */
  toObject() {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    return this.formData.toObject(false);
  }

  /**
   * 특정 필드만 가져오기 (XSS 이스케이프 적용)
   * @param {...string} fields - 가져올 필드명들
   */
  only(...fields) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const result = {};
    fields.forEach(field => {
      const value = this.formData.get(field, false);
      if (value !== null && value !== undefined) {
        result[field] = value;
      }
    });
    return result;
  }

  /**
   * 특정 필드만 가져오기 (원본, XSS 이스케이프 없이)
   * @param {...string} fields - 가져올 필드명들
   */
  onlyRaw(...fields) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const result = {};
    fields.forEach(field => {
      const value = this.formData.get(field, true);
      if (value !== null && value !== undefined) {
        result[field] = value;
      }
    });
    return result;
  }

  /**
   * 특정 필드 제외하고 가져오기 (XSS 이스케이프 적용)
   * @param {...string} fields - 제외할 필드명들
   */
  except(...fields) {
    if (!this.formData) {
      throw new Error('FormData가 로드되지 않았습니다. load(context)를 먼저 호출하세요.');
    }
    const data = this.formData.toObject(false);
    fields.forEach(field => delete data[field]);
    return data;
  }

  /**
   * 검증 규칙 설정
   * @param {Object} rules - { fieldName: ['required', 'email', 'minLength:2'] }
   */
  setRules(rules) {
    this.rules = rules;
    return this;
  }

  /**
   * 폼 데이터 설정 (수정 페이지용)
   * @param {Object} data - { fieldName: value }
   */
  setData(data) {
    this.data = data;
    return this;
  }

  /**
   * 서버 측 검증
   * @param {FormData} formData - 제출된 폼 데이터 (선택적, load()를 사용했다면 생략 가능)
   * @returns {boolean} - 검증 통과 여부
   */
  validate(formData = null) {
    this.errors = {};
    let isValid = true;

    // formData 파라미터가 있으면 사용, 없으면 load()로 로드된 것 사용
    const targetFormData = formData || this.formData?._raw;

    if (!targetFormData) {
      throw new Error('FormData가 제공되지 않았습니다. validate(formData) 또는 load(context)를 먼저 호출하세요.');
    }

    for (const [fieldName, ruleList] of Object.entries(this.rules)) {
      const value = targetFormData.get(fieldName) || '';

      for (const rule of ruleList) {
        const error = this.validateRule(fieldName, value, rule);
        if (error) {
          this.errors[fieldName] = error;
          isValid = false;
          break;
        }
      }
    }

    return isValid;
  }

  /**
   * 개별 규칙 검증
   */
  validateRule(fieldName, value, rule) {
    // required - 필수 입력
    if (rule === 'required' && !value.trim()) {
      return `${fieldName}은(는) 필수 항목입니다.`;
    }

    // email - 이메일 형식
    if (rule === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return '올바른 이메일 주소를 입력해주세요.';
      }
    }

    // url - URL 형식
    if (rule === 'url' && value) {
      try {
        new URL(value);
      } catch {
        return '올바른 URL을 입력해주세요.';
      }
    }

    // numeric - 숫자만
    if (rule === 'numeric' && value) {
      if (!/^\d+$/.test(value)) {
        return '숫자만 입력 가능합니다.';
      }
    }

    // alpha - 알파벳만
    if (rule === 'alpha' && value) {
      if (!/^[a-zA-Z]+$/.test(value)) {
        return '알파벳만 입력 가능합니다.';
      }
    }

    // alphanumeric - 알파벳+숫자만
    if (rule === 'alphanumeric' && value) {
      if (!/^[a-zA-Z0-9]+$/.test(value)) {
        return '알파벳과 숫자만 입력 가능합니다.';
      }
    }

    // confirmed - 확인 필드 일치 (예: password_confirmation)
    if (rule.startsWith('confirmed:')) {
      const confirmFieldName = rule.split(':')[1];
      const confirmValue = this.formData?._raw.get(confirmFieldName) || '';
      if (value !== confirmValue) {
        return '입력한 값이 일치하지 않습니다.';
      }
    }

    // minLength - 최소 길이
    if (rule.startsWith('minLength:')) {
      const minLength = parseInt(rule.split(':')[1]);
      if (value.length < minLength) {
        return `최소 ${minLength}자 이상 입력해주세요.`;
      }
    }

    // maxLength - 최대 길이
    if (rule.startsWith('maxLength:')) {
      const maxLength = parseInt(rule.split(':')[1]);
      if (value.length > maxLength) {
        return `최대 ${maxLength}자까지 입력 가능합니다.`;
      }
    }

    // min - 최소값
    if (rule.startsWith('min:')) {
      const min = parseFloat(rule.split(':')[1]);
      if (parseFloat(value) < min) {
        return `${min} 이상의 값을 입력해주세요.`;
      }
    }

    // max - 최대값
    if (rule.startsWith('max:')) {
      const max = parseFloat(rule.split(':')[1]);
      if (parseFloat(value) > max) {
        return `${max} 이하의 값을 입력해주세요.`;
      }
    }

    // in - 허용 값 목록
    if (rule.startsWith('in:')) {
      const allowedValues = rule.split(':')[1].split(',');
      if (!allowedValues.includes(value)) {
        return `허용된 값: ${allowedValues.join(', ')}`;
      }
    }

    // pattern - 정규식 패턴
    if (rule.startsWith('pattern:')) {
      const pattern = rule.split(':')[1];
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        return '올바른 형식으로 입력해주세요.';
      }
    }

    return null;
  }

  /**
   * 검증 에러 가져오기
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 검증 실패 시 JSON 응답 생성
   * @param {number} statusCode - HTTP 상태 코드 (기본값: 400)
   * @returns {Response}
   */
  failResponse(statusCode = 400) {
    return new Response(JSON.stringify({
      success: false,
      errors: this.errors
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  /**
   * 클라이언트 측 자동 적용 스크립트 생성
   * @param {boolean} useAjax - Ajax 제출 사용 여부 (기본값: false)
   * @returns {string} - 인라인 스크립트
   */
  getScript(useAjax = false) {
    const rulesJSON = JSON.stringify(this.rules);
    const dataJSON = JSON.stringify(this.data);

    return `<script>
(function() {
  const formId = '${this.formId}';
  const rules = ${rulesJSON};
  const data = ${dataJSON};
  const useAjax = ${useAjax};

  document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById(formId);
    if (!form) return;

    // 규칙에 따라 HTML5 속성 자동 적용
    Object.entries(rules).forEach(([fieldName, ruleList]) => {
      const input = form.querySelector('[name="' + fieldName + '"]');
      if (!input) return;

      ruleList.forEach(rule => {
        if (rule === 'required') {
          input.required = true;
        }
        if (rule === 'email') {
          input.type = 'email';
        }
        if (rule.startsWith('minLength:')) {
          input.minLength = parseInt(rule.split(':')[1]);
        }
        if (rule.startsWith('maxLength:')) {
          input.maxLength = parseInt(rule.split(':')[1]);
        }
        if (rule.startsWith('min:')) {
          input.min = rule.split(':')[1];
        }
        if (rule.startsWith('max:')) {
          input.max = rule.split(':')[1];
        }
        if (rule.startsWith('pattern:')) {
          input.pattern = rule.split(':')[1];
        }
      });

      // 기존 데이터 세팅 (수정 페이지용)
      if (data[fieldName] !== undefined) {
        input.value = data[fieldName];
      }
    });

    // Ajax 제출 처리
    if (useAjax) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = '전송 중...';
        }

        try {
          const formData = new FormData(form);
          const response = await fetch(form.action || window.location.href, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            // 리다이렉트가 있으면 이동
            if (result.redirect) {
              window.location.href = result.redirect;
              return;
            }

            // 성공 메시지 표시
            const alert = document.createElement('div');
            alert.className = 'alert alert-success';
            alert.textContent = result.message;
            form.insertAdjacentElement('beforebegin', alert);

            // 폼 초기화
            form.reset();

            // 3초 후 메시지 제거
            setTimeout(() => alert.remove(), 3000);
          } else {
            // 에러 메시지 표시
            const alert = document.createElement('div');
            alert.className = 'alert alert-danger';

            if (result.errors) {
              // XSS 방지: textContent 사용하여 HTML 이스케이프
              const errorMessages = Object.values(result.errors).join('\\n');
              alert.textContent = errorMessages;
              // 줄바꿈을 위해 white-space 스타일 적용
              alert.style.whiteSpace = 'pre-line';
            } else {
              alert.textContent = result.message || '오류가 발생했습니다.';
            }

            form.insertAdjacentElement('beforebegin', alert);

            // 3초 후 메시지 제거
            setTimeout(() => alert.remove(), 3000);
          }
        } catch (error) {
          console.error('Form submission error:', error);
          const alert = document.createElement('div');
          alert.className = 'alert alert-danger';
          alert.textContent = '폼 제출 중 오류가 발생했습니다.';
          form.insertAdjacentElement('beforebegin', alert);

          setTimeout(() => alert.remove(), 3000);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
          }
        }
      });
    }
  });
})();
</script>`;
  }
}
