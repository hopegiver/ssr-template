export const body = `
<div class="page-content">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
        <div>
            <h2>연락처 정보</h2>
            <p><strong>이메일:</strong> {{ email }}</p>
            <p><strong>전화:</strong> {{ phone }}</p>
            <p><strong>주소:</strong> {{ address }}</p>
            
            {% if social %}
            <h3>소셜 미디어</h3>
            {% for platform in social %}
            <p><strong>{{ platform.name }}:</strong> <a href="{{ platform.url }}">{{ platform.handle }}</a></p>
            {% endfor %}
            {% endif %}
        </div>
        
        <div>
            <h2>문의하기</h2>
            <form id="contactForm" method="POST" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="name" class="form-label">이름</label>
                    <input type="text" class="form-control" id="name" name="name">
                </div>
                <div class="mb-3">
                    <label for="email" class="form-label">이메일</label>
                    <input type="text" class="form-control" id="email" name="email">
                </div>
                <div class="mb-3">
                    <label for="message" class="form-label">메시지</label>
                    <textarea class="form-control" id="message" name="message" rows="4"></textarea>
                </div>
                <button type="submit" class="btn btn-dark">전송</button>
            </form>
            {{ formScript }}
        </div>
    </div>
</div>`;