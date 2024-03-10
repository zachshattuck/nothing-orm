# `nothing-orm`

Typed wrappers for `mysql2` functions. Depends on `mysql2@>3`.

### Installation

```
  npm i nothing-orm mysql2
```

### Usage:
```ts
  import nothing from 'nothing-orm'
  import mysql2 from 'mysql2'

  // Connect to database
  const conn = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
  })

  type TableNameMap = {
    user: User
    session: Session
  }

  // Generate typed functions  
  const { getOneBy, createOne } = nothing<TableNameMap>('mydb')

  // Gets a User from `mydb.user` where `username` = 'test_user'
  // Type will be `User | null`
  const user = getOneBy(conn, 'user', 'username', 'test_user')

  // `ResultSetHeader`
  const result = createOne(conn, 'user', {
    // `Partial<User>`
    ...
  })
```