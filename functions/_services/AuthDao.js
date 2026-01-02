import { UserDao } from './UserDao.js';

/**
 * Auth DAO
 * 인증 관련 비즈니스 로직 (비밀번호 검증, 해싱 등)
 */
export class AuthDao {
  constructor(env) {
    this.userDao = new UserDao(env);
    this.env = env;
  }

  /**
   * 비밀번호 해싱 (SHA-256)
   * 프로덕션에서는 bcrypt나 argon2 사용 권장
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 비밀번호 검증
   */
  async verifyPassword(password, hash) {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  /**
   * 로그인 시도
   * @returns {Object|null} 성공 시 사용자 객체, 실패 시 null
   */
  async login(username, password) {
    const user = await this.userDao.getUserByUsername(username);

    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // 비밀번호 해시는 제외하고 반환
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 회원가입
   */
  async register(userData) {
    const { username, email, password, role } = userData;

    // 비밀번호 해싱
    const passwordHash = await this.hashPassword(password);

    // 사용자 생성
    const user = await this.userDao.createUser({
      username,
      email,
      passwordHash,
      role: role || 'user'
    });

    // 비밀번호 해시 제외하고 반환
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.userDao.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await this.userDao.updatePassword(userId, newPasswordHash);
  }

  /**
   * 비밀번호 재설정 (이메일 인증 후)
   */
  async resetPassword(userId, newPassword) {
    const newPasswordHash = await this.hashPassword(newPassword);
    await this.userDao.updatePassword(userId, newPasswordHash);
  }
}
