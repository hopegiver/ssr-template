export const body = `
<div class="page-content">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    
    {% if features %}
    <h2>주요 기능</h2>
    <ul>
        {% for feature in features %}
        <li>{{ feature }}</li>
        {% endfor %}
    </ul>
    {% endif %}
    
    <p>Cloudflare Pages와 Functions를 활용한 서버사이드 렌더링 템플릿입니다.</p>
</div>`;