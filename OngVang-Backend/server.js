const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const database = require('./database');
const repository = require('./repository');

const app = express();
const PORT = process.env.PORT || 3001;
const WEB_ROOT = path.join(__dirname, '..', 'OngVang-Web');
const sessions = new Map();

app.use(cors());
app.use(express.json());

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function requireAdmin(req, res, next) {
  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ message: 'Please sign in again to continue.' });
  }
  if (String(session.role).toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  req.user = session;
  return next();
}

function registerEntityRoutes(basePath, label, methods) {
  app.get(basePath, asyncRoute(async (req, res) => res.json(await methods.list())));
  app.get(`${basePath}/:id`, asyncRoute(async (req, res) => {
    const entity = await methods.get(req.params.id);
    if (!entity) return res.status(404).json({ message: `${label} not found` });
    return res.json(entity);
  }));
  app.post(basePath, asyncRoute(async (req, res) => {
    const entity = await methods.create(req.body || {});
    return res.status(201).json(entity);
  }));
  app.put(`${basePath}/:id`, asyncRoute(async (req, res) => {
    const entity = await methods.update(req.params.id, req.body || {});
    if (!entity) return res.status(404).json({ message: `${label} not found` });
    return res.json(entity);
  }));
  app.delete(`${basePath}/:id`, asyncRoute(async (req, res) => {
    const entity = await methods.remove(req.params.id);
    if (!entity) return res.status(404).json({ message: `${label} not found` });
    return res.json({ message: `${label} deleted`, data: entity });
  }));
}

app.get('/api/health', asyncRoute(async (req, res) => {
  const result = await database.query('SELECT DB_NAME() AS databaseName');
  res.json({
    status: 'ok',
    service: 'OngVang API',
    database: result.recordset[0].databaseName,
    timestamp: new Date().toISOString()
  });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { username, password } = req.body || {};
  const user = await repository.login(username, password);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu không đúng.'
    });
  }
  const token = crypto.randomUUID();
  sessions.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
  return res.json({ success: true, token, user });
}));

registerEntityRoutes('/api/tables', 'Table', {
  list: repository.listTables,
  get: repository.getTable,
  create: repository.createTable,
  update: repository.updateTable,
  remove: repository.deleteTable
});
registerEntityRoutes('/api/menu', 'Menu item', {
  list: repository.listMenu,
  get: repository.getMenuItem,
  create: repository.createMenuItem,
  update: repository.updateMenuItem,
  remove: repository.deleteMenuItem
});
registerEntityRoutes('/api/customers', 'Customer', {
  list: repository.listCustomers,
  get: repository.getCustomer,
  create: repository.createCustomer,
  update: repository.updateCustomer,
  remove: repository.deleteCustomer
});
app.get('/api/loyalty-cards', asyncRoute(async (req, res) => res.json(await repository.listLoyaltyCards())));
app.get('/api/loyalty-cards/:code', asyncRoute(async (req, res) => {
  const card = await repository.getLoyaltyCard(req.params.code);
  if (!card) return res.status(404).json({ message: 'Loyalty card code not found.' });
  return res.json(card);
}));
app.post('/api/loyalty-cards', asyncRoute(async (req, res) => res.status(201).json(await repository.createLoyaltyCard(req.body || {}))));
app.use('/api/employees', requireAdmin);
registerEntityRoutes('/api/employees', 'Employee', {
  list: repository.listEmployees,
  get: repository.getEmployee,
  create: repository.createEmployee,
  update: repository.updateEmployee,
  remove: repository.deleteEmployee
});
app.get('/api/vouchers/validate', asyncRoute(async (req, res) => {
  const voucher = await repository.validateVoucher(req.query.code, Number(req.query.subtotal));
  res.json(voucher);
}));
registerEntityRoutes('/api/vouchers', 'Voucher', {
  list: repository.listVouchers,
  get: repository.getVoucher,
  create: repository.createVoucher,
  update: repository.updateVoucher,
  remove: repository.deleteVoucher
});
registerEntityRoutes('/api/invoices', 'Invoice', {
  list: repository.listInvoices,
  get: repository.getInvoice,
  create: repository.createInvoice,
  update: repository.updateInvoice,
  remove: repository.deleteInvoice
});
registerEntityRoutes('/api/bookings', 'Booking', {
  list: repository.listBookings,
  get: repository.getBooking,
  create: repository.createBooking,
  update: repository.updateBooking,
  remove: repository.deleteBooking
});

app.get('/api/orders', asyncRoute(async (req, res) => res.json(await repository.getOrders())));
app.get('/api/orders/:id', asyncRoute(async (req, res) => {
  const order = await repository.getInvoice(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.json(order);
}));
app.post('/api/orders', asyncRoute(async (req, res) => res.status(201).json(await repository.createInvoice(req.body || {}))));
app.put('/api/orders/:id', asyncRoute(async (req, res) => {
  const order = await repository.updateInvoice(req.params.id, req.body || {});
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.json(order);
}));
app.delete('/api/orders/:id', asyncRoute(async (req, res) => {
  const order = await repository.deleteInvoice(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  return res.json({ message: 'Order deleted', data: order });
}));

app.get('/api/dashboard', asyncRoute(async (req, res) => res.json(await repository.getDashboard())));

// Serve the web app and API from one origin so clients never need a hard-coded
// localhost address (and HTTPS deployments can proxy both through one domain).
app.use(express.static(WEB_ROOT));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

app.use((error, req, res, next) => {
  const status = error.statusCode || (error.code === 'EREQUEST' ? 400 : 500);
  if (status >= 500) console.error('API request failed:', error.code || error.name);
  res.status(status).json({
    message: status >= 500 ? 'Database request failed.' : error.message
  });
});

async function start() {
  try {
    const schema = await fs.readFile(path.join(__dirname, 'data', 'schema.sql'), 'utf8');
    const pool = await database.getPool();
    const batches = schema.split(/^\s*GO\s*$/im).filter((batch) => batch.trim());
    for (const batch of batches) {
      await pool.request().batch(batch);
    }
    const currentDatabase = await database.query('SELECT DB_NAME() AS databaseName');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`OngVang API connected to ${currentDatabase.recordset[0].databaseName} on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start API with SQL database:', error.code || error.name, error.message);
    process.exitCode = 1;
  }
}

start();
