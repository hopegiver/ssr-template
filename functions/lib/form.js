/**
 * Form - 폼 유효성 검사 및 자동 속성 적용
 */
export class Form {
  constructor(formId = 'form') {
    this.formId = formId;
    this.rules = {};
    this.data = {};
    this.errors = {};
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
   * @param {FormData} formData - 제출된 폼 데이터
   * @returns {boolean} - 검증 통과 여부
   */
  validate(formData) {
    this.errors = {};
    let isValid = true;

    for (const [fieldName, ruleList] of Object.entries(this.rules)) {
      const value = formData.get(fieldName) || '';

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
    if (rule === 'required' && !value.trim()) {
      return `${fieldName}은(는) 필수 항목입니다.`;
    }

    if (rule === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return '올바른 이메일 주소를 입력해주세요.';
      }
    }

    if (rule.startsWith('minLength:')) {
      const minLength = parseInt(rule.split(':')[1]);
      if (value.length < minLength) {
        return `최소 ${minLength}자 이상 입력해주세요.`;
      }
    }

    if (rule.startsWith('maxLength:')) {
      const maxLength = parseInt(rule.split(':')[1]);
      if (value.length > maxLength) {
        return `최대 ${maxLength}자까지 입력 가능합니다.`;
      }
    }

    if (rule.startsWith('min:')) {
      const min = parseFloat(rule.split(':')[1]);
      if (parseFloat(value) < min) {
        return `${min} 이상의 값을 입력해주세요.`;
      }
    }

    if (rule.startsWith('max:')) {
      const max = parseFloat(rule.split(':')[1]);
      if (parseFloat(value) > max) {
        return `${max} 이하의 값을 입력해주세요.`;
      }
    }

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
              const errorMessages = Object.values(result.errors).join('<br>');
              alert.innerHTML = errorMessages;
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
