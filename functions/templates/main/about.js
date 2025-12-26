export const body = `
<div class="page-content">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    
    <h2>프로젝트 정보</h2>
    <p><strong>기술 스택:</strong> {{ techStack }}</p>
    <p><strong>개발 기간:</strong> {{ period }}</p>
    <p><strong>개발자:</strong> {{ developer }}</p>
    
    <h2>기능 소개</h2>
    <p>이 프로젝트는 Cloudflare Pages의 Functions를 활용하여 파일 기반 라우팅과 서버사이드 렌더링을 구현합니다.</p>
    
    {% if team %}
    <h2>팀 소개</h2>
    {% for member in team %}
    <div style="margin-bottom: 1rem;">
        <strong>{{ member.name }}</strong> - {{ member.role }}
    </div>
    {% endfor %}
    {% endif %}
</div>`;