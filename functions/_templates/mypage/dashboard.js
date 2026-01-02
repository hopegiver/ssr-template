export const body = `
<div class="page-content">
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>

    <div class="card mt-4">
        <div class="card-header">
            <h2>사용자 정보</h2>
        </div>
        <div class="card-body">
            <p><strong>사용자 ID:</strong> {{ userId }}</p>
            <p><strong>사용자 이름:</strong> {{ username }}</p>
            <p><strong>역할:</strong> {{ role }}</p>
            <p><strong>이메일:</strong> {{ email }}</p>
        </div>
    </div>

    <div class="mt-4">
        <a href="/main/logout" class="btn btn-secondary">로그아웃</a>
    </div>
</div>`;
