export const body = `
<div class="page-content">
    <div class="row justify-content-center">
        <div class="col-md-6">
            <h1>{{ title }}</h1>

            {% if error %}
            <div class="alert alert-danger" role="alert">
                {{ description }}
            </div>
            {% else %}
            <p>{{ description }}</p>
            {% endif %}

            <form id="loginForm" method="POST" class="needs-validation" novalidate>
                <div class="mb-3">
                    <label for="username" class="form-label">사용자 이름</label>
                    <input type="text" class="form-control" id="username" name="username">
                </div>
                <div class="mb-3">
                    <label for="password" class="form-label">비밀번호</label>
                    <input type="password" class="form-control" id="password" name="password">
                </div>
                <button type="submit" class="btn btn-dark">로그인</button>
            </form>
            {{ formScript }}
        </div>
    </div>
</div>`;
