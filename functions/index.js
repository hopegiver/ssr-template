import { layout } from './templates/layout/main.js';
import { body } from './templates/index.js';

export async function onRequest(context) {
  const data = {
    title: 'Home',
    description: 'Cloudflare Pages SSR 템플릿에 오신 것을 환영합니다!',
    features: [
      'Cloudflare Pages Functions 기반 SSR',
      '파일 기반 라우팅 시스템',
      '간단한 템플릿 엔진',
      '반응형 디자인'
    ]
  };

  return context.data.renderPage(layout, body, data);
}