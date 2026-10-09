const path = require('path');
const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

const requiredSettings = ['SQL_SERVER', 'SQL_DATABASE', 'SQL_USER', 'SQL_PASSWORD'];
const missingSettings = requiredSettings.filter((key) => !process.env[key]);
if (missingSettings.length) {
  throw new Error(`Missing SQL configuration: ${missingSettings.join(', ')}`);
}

const config = {
  server: process.env.SQL_SERVER,
  port: Number(process.env.SQL_PORT || 1433),
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true'
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

function bindInputs(request, params = {}) {
  Object.entries(params).forEach(([name, value]) => request.input(name, value));
  return request;
}

async function query(statement, params = {}) {
  const pool = await getPool();
  return bindInputs(pool.request(), params).query(statement);
}

async function withTransaction(callback) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  const transactionQuery = (statement, params = {}) =>
    bindInputs(transaction.request(), params).query(statement);

  try {
    const result = await callback(transactionQuery);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = { sql, getPool, query, withTransaction };
