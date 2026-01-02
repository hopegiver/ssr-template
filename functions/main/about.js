import { layout } from '../_templates/layout/main.js';
import { body } from '../_templates/main/about.js';

export async function onRequest(context) {
  const data = {
    title: 'About',
    description: '이 프로젝트는 Cloudflare Pages를 활용한 서버사이드 렌더링 템플릿입니다.',
    techStack: 'Cloudflare Pages, Functions, JavaScript, HTML, CSS',
    period: '2025년 12월',
    developer: 'GitHub Copilot',
    team: [
      {
        name: '개발자 1',
        role: 'Frontend Developer'
      },
      {
        name: '개발자 2',
        role: 'Backend Developer'
      }
    ]
  };

  return context.data.renderPage(layout, body, data);
}