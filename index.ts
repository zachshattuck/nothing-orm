import { Connection, ResultSetHeader, RowDataPacket } from "mysql2";

export interface TableNameMap {
  [table: string]: any
}

export function init<M extends TableNameMap>(database: string) {


  /**
   * Get a single row of type T where the given column matches the given value
   */
  async function getOneBy
  <T extends keyof M, O extends M[T], C extends keyof O, V extends O[C] = O[C]>
  (
    conn: Connection,
    /** Table, not including database name. */
    table: T,
    column: C,
    value: V
  ) {

    return new Promise<O | undefined>((resolve, reject) => {

      conn.query<RowDataPacket[]>(
        'SELECT * FROM ??.?? WHERE ?? = ?',
        [database, table, column, value],
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          let item = result[0]
          resolve(item as O | undefined)
        }
      )

    })

  }


  /**
   * Get all rows of type T where the given column matches the given value(s).  
   */
  async function getManyBy
  <T extends keyof M, O extends M[T], C extends keyof O, V extends O[C] = O[C]>
  (
    conn: Connection,
    /** Table, not including database name. */
    table: T,
    column: C,
    value: V | V[]
  ) {

    const isArray = Array.isArray(value)
    if(isArray && value.length === 0) {
      return []
    }

    const query = isArray
      ? 'SELECT * FROM ??.?? WHERE ?? IN (?)'
      : 'SELECT * FROM ??.?? WHERE ?? = ?'

    return new Promise<O[]>((resolve, reject) => {

      conn.query<RowDataPacket[]>(
        query,
        [database, table, column, value],
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve(result as O[])
        }
      )

    })

  }

  /**
   * Get all rows of the given table, limited to 100.
   */
  async function getAll
  <T extends keyof M, O extends M[T]>
  (
    conn: Connection,
    /** Table, not including database name. */
    table: T,
  ) {

    const query = 'SELECT * FROM ??.?? LIMIT 100'

    return new Promise<O[]>((resolve, reject) => {

      conn.query<RowDataPacket[]>(
        query,
        [database, table],
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve(result as O[])
        }
      )

    })

  }

  /**
   * Get all rows of type T where the given columns have the given values,
   * joined by ANDs
   */
  async function getManyWhere
  <T extends keyof M, O extends M[T]>
  (
    conn: Connection,
    /** Table, not including database name. */
    table: T,
    options: Partial<O>,
    joinByOr = false
  ) {

    let query = 'SELECT * FROM ??.??'
    const conditions: string[] = []
    const args: any[] = [database, table]
    const joinBit = joinByOr ? ' OR ' : ' AND '


    // Push conditions onto array, checking if each param is an array or not
    for(let [column, value] of Object.entries(options)) {
      if(Array.isArray(value)) {
        // I'm deciding that nothing in any of the arrays means nothing would match
        if(value.length === 0) return []

        conditions.push('(?? IN (?))')
        args.push(column, value)
        continue
      }

      conditions.push('(?? = ?)')
      args.push(column, value)
    }

    // This syntax only adds a WHERE if there were actually params provided.
    query = [query, conditions.join(joinBit)].join(' WHERE ')

    return new Promise<O[]>((resolve, reject) => {

      conn.query<RowDataPacket[]>(
        query,
        args,
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve(result as O[])
        }
      )

    })

  }


  /**
   * Deletes all rows of type T where the given column matches the given value(s)
   */
  async function deleteBy
  <T extends keyof M, O extends M[T], C extends keyof O, V extends O[C] = O[C]>
  (
    conn: Connection,
    /** Table, not including database name. */
    table: T,
    column: C,
    value: V | V[]
  ) {

    // Idk what would happen in this case, so better safe than sorry
    if(value === undefined) {
      return
    }

    const isArray = Array.isArray(value)
    if(isArray && value.length === 0) {
      return []
    }

    const query = isArray
      ? 'DELETE FROM ??.?? WHERE ?? IN (?)'
      : 'DELETE * FROM ??.?? WHERE ?? = ?'

    return new Promise<void>((resolve, reject) => {

      conn.query(
        query,
        [database, table, column, value],
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve()
        }
      )

    })
  }


  /**
   * Create a single row with the given fields
   */
  async function createOne
  <T extends keyof M, O extends M[T]>
  (
    conn: Connection,
    table: T,
    obj: Partial<O>
  ) {

    let query = `INSERT INTO ??.??`
    let params: any[] = [database, table]
    if(Object.keys(obj).length > 0) {
      query += ' SET ?'
      params.push(obj)
    }

    return new Promise<ResultSetHeader>((resolve, reject) => {

      conn.query<ResultSetHeader>(
        query,
        params,
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve(result)
        }
      )

    })
  }

  /**
   * Wrap a promise and immediately fetch the created row(s)
   */
  async function andGet
  <T extends keyof M, O extends M[T]>
  (
    conn: Connection,
    table: T,
    _result: Promise<ResultSetHeader | ResultSetHeader[]>
  ) {

    // First, wait for result
    const result = await _result

    const ids: any[] = []

    if(Array.isArray(result)) {
      result.forEach(({ insertId }) => {
        ids.push(insertId)
      })
    } else {
      ids.push(result.insertId)
    }

    if(ids.length === 0) {
      return []
    }

    let query = 'SELECT * FROM ??.?? WHERE id IN (?)'

    return new Promise<O[]>((resolve, reject) => {

      conn.query<RowDataPacket[]>(
        query,
        [database, table, ids],
        (err, result) => {
          if(err) {
            reject(err.message)
            return
          }
          resolve(result as O[])
        }
      )

    })

  }



  return {
    getOneBy,
    getManyBy,
    getAll,
    getManyWhere,
    deleteBy,
    createOne,
    andGet
  }
}
