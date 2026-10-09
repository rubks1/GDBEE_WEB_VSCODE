const users = [
  { id: 1, username: 'admin', password: '123456', role: 'admin', name: 'Quản lý' },
  { id: 2, username: 'employee', password: '123456', role: 'employee', name: 'Nhân viên' }
];

const tables = [
  { id: 1, name: 'Bàn 01', status: 'available', capacity: 4, area: 'Trong nhà', type: 'Thường' },
  { id: 2, name: 'Bàn 02', status: 'available', capacity: 6, area: 'Trong nhà', type: 'Thường' },
  { id: 3, name: 'Bàn 03', status: 'occupied', capacity: 8, area: 'Trong nhà', type: 'Thường' },
  { id: 4, name: 'Bàn 04', status: 'reserved', capacity: 4, area: 'Trong nhà', type: 'Thường' },
  { id: 5, name: 'Bàn 05', status: 'available', capacity: 2, area: 'Trong nhà', type: 'Thường' },
  { id: 6, name: 'Bàn 06', status: 'maintenance', capacity: 8, area: 'Trong nhà', type: 'Thường' },
  { id: 7, name: 'Bàn 07', status: 'available', capacity: 6, area: 'Sân vườn', type: 'Thường' },
  { id: 8, name: 'Bàn 08', status: 'reserved', capacity: 4, area: 'Sân vườn', type: 'Thường' },
  { id: 9, name: 'Bàn 09', status: 'occupied', capacity: 10, area: 'Sân vườn', type: 'Thường' }
];

const menu = [
  { id: 1, name: 'Phở bò', category: 'Món ăn', price: 55000, status: 'available' },
  { id: 2, name: 'Cơm gà', category: 'Món ăn', price: 65000, status: 'available' },
  { id: 3, name: 'Salad', category: 'Món ăn', price: 48000, status: 'available' },
  { id: 4, name: 'Trà đào', category: 'Đồ uống', price: 30000, status: 'available' },
  { id: 5, name: 'Mojito', category: 'Đồ uống', price: 45000, status: 'available' }
];

const customers = [
  { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', email: 'a@gmail.com', address: 'Hà Nội' },
  { id: 2, name: 'Trần Thị B', phone: '0907654321', email: 'b@gmail.com', address: 'Đà Nẵng' },
  { id: 3, name: 'Lê Hoàng C', phone: '0988123456', email: 'c@gmail.com', address: 'TP.HCM' }
];

const employees = [
  { id: 1, name: 'Nguyễn Hoàng', position: 'Quản lý', status: 'active', username: 'admin' },
  { id: 2, name: 'Phạm Huyền', position: 'Thu ngân', status: 'active', username: 'cashier' },
  { id: 3, name: 'Đỗ Thanh', position: 'Phục vụ', status: 'off', username: 'server' }
];

const orders = [
  { id: 1, tableId: 2, customerId: 1, employeeId: 2, status: 'paid', total: 1620000, createdAt: '2026-09-30T15:30:00Z' },
  { id: 2, tableId: 7, customerId: 2, employeeId: 3, status: 'pending', total: 980000, createdAt: '2026-09-30T16:10:00Z' },
  { id: 3, tableId: 12, customerId: 3, employeeId: 1, status: 'serving', total: 2340000, createdAt: '2026-09-30T17:45:00Z' }
];

const vouchers = [
  { id: 1, code: 'WELCOME10', name: 'Chào mừng 10%', discountType: 'percent', discountValue: 10 },
  { id: 2, code: 'VIP20', name: 'VIP 200k', discountType: 'fixed', discountValue: 200000 },
  { id: 3, code: 'DINNER5', name: 'Giảm 5%', discountType: 'percent', discountValue: 5 }
];

const invoices = [
  { id: 1, orderId: 1, invoiceCode: 'HD-1001', customerName: 'Nguyễn Văn A', table: 'Bàn 02', date: '30/09/2026', employee: 'NV-02', total: 1620000, status: 'paid' },
  { id: 2, orderId: 2, invoiceCode: 'HD-1002', customerName: 'Trần Thị B', table: 'Bàn 07', date: '29/09/2026', employee: 'NV-03', total: 980000, status: 'pending' },
  { id: 3, orderId: 3, invoiceCode: 'HD-1003', customerName: 'Lê Hoàng C', table: 'Bàn 09', date: '28/09/2026', employee: 'NV-01', total: 2340000, status: 'serving' }
];

const bookings = [];

module.exports = {
  users,
  tables,
  menu,
  customers,
  employees,
  orders,
  vouchers,
  invoices,
  bookings
};
