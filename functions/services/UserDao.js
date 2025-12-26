import { Database } from '../lib/database.js';

/**
 * User DAO
 * 사용자 CRUD 및 관련 비즈니스 로직
 */
export class UserDao {
  constructor(env) {
    this.db = new Database(env);
  }

  /**
   * 사용자명으로 사용자 조회
   */
  async getUserByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    return await this.db.queryOne(sql, [username]);
  }

  /**
   * 이메일로 사용자 조회
   */
  async getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    return await this.db.queryOne(sql, [email]);
  }

  /**
   * 사용자 ID로 조회
   */
  async getUserById(userId) {
    const sql = 'SELECT * FROM users WHERE id = ? LIMIT 1';
    return await this.db.queryOne(sql, [userId]);
  }

  /**
   * 모든 사용자 조회 (페이지네이션)
   */
  async getAllUsers(limit = 50, offset = 0) {
    const sql = 'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
    return await this.db.query(sql, [limit, offset]);
  }

  /**
   * 새 사용자 생성
   */
  async createUser(userData) {
    const { username, email, passwordHash, role = 'user' } = userData;

    // 중복 체크
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.getUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // 사용자 생성
    await this.db.insert('users', {
      username,
      email,
      password_hash: passwordHash,
      role,
      created_at: new Date().toISOString()
    });

    return await this.getUserByUsername(username);
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId, updates) {
    const allowedFields = ['email', 'role'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // updated_at 추가
    filteredUpdates.updated_at = new Date().toISOString();

    await this.db.update('users', filteredUpdates, { id: userId });

    return await this.getUserById(userId);
  }

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(userId, newPasswordHash) {
    await this.db.update('users', {
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString()
    }, { id: userId });
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(userId) {
    await this.db.delete('users', { id: userId });
  }

  /**
   * 사용자 수 조회
   */
  async getUserCount() {
    const sql = 'SELECT COUNT(*) as count FROM users';
    const result = await this.db.queryOne(sql);
    return result.count;
  }
}
