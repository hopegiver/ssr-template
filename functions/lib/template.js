import { Liquid } from 'liquidjs';

// LiquidJS 엔진 초기화
const liquid = new Liquid({
  strictFilters: false, // 존재하지 않는 변수에 대해 엄격하지 않게 처리
  strictVariables: false,
  outputEscape: 'escape', // XSS 방지: 모든 출력을 자동으로 HTML 이스케이프
});

// 템플릿 렌더링 함수
export async function renderTemplate(template, data = {}) {
  return await liquid.parseAndRender(template, data);
}

// 페이지 생성 함수
export async function createPage(layout, body, data = {}) {
  // 먼저 body 템플릿을 렌더링
  const renderedBody = await renderTemplate(body, data);

  // 그다음 layout에 body를 포함하여 렌더링
  const pageData = {
    ...data,
    body: renderedBody
  };

  return await renderTemplate(layout, pageData);
}

// HTML Response 생성 헬퍼
export function createResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

// JSON 렌더링 헬퍼
export function renderJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

// 페이지 렌더링 헬퍼 (에러 처리 포함)
export async function renderPage(layout, body, data = {}, context = null) {
  try {
    // context가 있으면 인증 상태 자동 추가
    if (context?.data?.auth) {
      data.isAuthenticated = context.data.auth.isAuthenticated;
      data.username = context.data.auth.getData('username');
    }

    const html = await createPage(layout, body, data);
    return createResponse(html);
  } catch (error) {
    console.error('Page render error:', error);
    return createResponse(`<h1>500 - Internal Server Error</h1>`, 500);
  }
}