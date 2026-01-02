/**
 * Database - Cloudflare D1 데이터베이스 핸들러
 * D1 데이터베이스 연결 및 쿼리 실행을 담당하는 클래스
 */
export class Database {
  constructor(env) {
    this.db = env.DB; // Cloudflare D1
  }

  /**
   * 쿼리 실행 (여러 행 반환)
   * @param {string} sql - SQL 쿼리
   * @param {Array} params - 바인딩 파라미터
   * @returns {Promise<Array>} 쿼리 결과 배열
   */
  async query(sql, params = []) {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      return result.results;
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('Database operation failed');
    }
  }

  /**
   * 단일 레코드 조회
   * @param {string} sql - SQL 쿼리
   * @param {Array} params - 바인딩 파라미터
   * @returns {Promise<Object|null>} 쿼리 결과 객체 또는 null
   */
  async queryOne(sql, params = []) {
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error('Database operation failed');
    }
  }

  /**
   * INSERT/UPDATE/DELETE 실행
   * @param {string} sql - SQL 쿼리
   * @param {Array} params - 바인딩 파라미터
   * @returns {Promise<Object>} 실행 결과 (success, meta 등)
   */
  async execute(sql, params = []) {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return result;
    } catch (error) {
      console.error('Database execute error:', error);
      throw new Error('Database operation failed');
    }
  }

  /**
   * 트랜잭션 실행 (배치 작업)
   * @param {Array<{sql: string, params: Array}>} queries - 쿼리 배열
   * @returns {Promise<Array>} 배치 실행 결과
   */
  async transaction(queries) {
    try {
      const batch = queries.map(({ sql, params }) =>
        this.db.prepare(sql).bind(...params)
      );
      return await this.db.batch(batch);
    } catch (error) {
      console.error('Database transaction error:', error);
      throw new Error('Database transaction failed');
    }
  }

  /**
   * INSERT 헬퍼 - 자동으로 INSERT 쿼리 생성 및 실행
   * @param {string} table - 테이블 이름
   * @param {Object} data - 삽입할 데이터 (key-value 객체)
   * @returns {Promise<Object>} 실행 결과
   * @example
   * await db.insert('users', { username: 'john', email: 'john@example.com' });
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    return await this.execute(sql, values);
  }

  /**
   * UPDATE 헬퍼 - 자동으로 UPDATE 쿼리 생성 및 실행
   * @param {string} table - 테이블 이름
   * @param {Object} data - 업데이트할 데이터 (key-value 객체)
   * @param {Object} where - WHERE 조건 (key-value 객체)
   * @returns {Promise<Object>} 실행 결과
   * @example
   * await db.update('users', { email: 'newemail@example.com' }, { id: 1 });
   */
  async update(table, data, where) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = dataKeys.map(key => `${key} = ?`).join(', ');
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return await this.execute(sql, [...dataValues, ...whereValues]);
  }

  /**
   * DELETE 헬퍼 - 자동으로 DELETE 쿼리 생성 및 실행
   * @param {string} table - 테이블 이름
   * @param {Object} where - WHERE 조건 (key-value 객체)
   * @returns {Promise<Object>} 실행 결과
   * @example
   * await db.delete('users', { id: 1 });
   */
  async delete(table, where) {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return await this.execute(sql, whereValues);
  }
}
