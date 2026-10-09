const { sql, query, withTransaction } = require('./database');
const crypto = require('crypto');

const DRINK_ID_OFFSET = 100000;
const TABLE_STATUS_TO_SQL = {
  available: 'Trống',
  occupied: 'Đang sử dụng',
  reserved: 'Chờ',
  maintenance: 'Bảo trì'
};
const INVOICE_STATUS_TO_SQL = {
  paid: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  serving: 'Chờ thanh toán',
  cancelled: 'Đã hủy',
  'Đã thanh toán': 'Đã thanh toán',
  'Chờ thanh toán': 'Chờ thanh toán',
  'Đang phục vụ': 'Chờ thanh toán',
  'Hủy': 'Đã hủy'
};

function tableStatusFromSql(status) {
  return ({
    'Trống': 'available',
    'Đang sử dụng': 'occupied',
    'Chờ': 'reserved',
    'Bảo trì': 'maintenance'
  })[status] || 'available';
}

function invoiceStatusFromSql(status) {
  return ({
    'Đã thanh toán': 'paid',
    'Chờ thanh toán': 'pending',
    'Đã hủy': 'cancelled'
  })[status] || 'pending';
}

function sqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function tableRecord(row) {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    status: tableStatusFromSql(row.sqlStatus),
    area: row.area || 'Trong nhà',
    zone: row.area || 'Trong nhà',
    type: row.type
  };
}

async function listTables() {
  const result = await query(`
    SELECT b.MaBan AS id,b.TenBan AS name,b.SucChua AS capacity,
      b.TrangThai AS sqlStatus,b.LoaiBan AS type,v.TenViTri AS area
    FROM dbo.BAN b
    LEFT JOIN dbo.VI_TRI_BAN v ON v.MaViTri=b.MaViTri
    ORDER BY b.MaBan
  `);
  return result.recordset.map(tableRecord);
}

async function getTable(id) {
  const result = await query(`
    SELECT b.MaBan AS id,b.TenBan AS name,b.SucChua AS capacity,
      b.TrangThai AS sqlStatus,b.LoaiBan AS type,v.TenViTri AS area
    FROM dbo.BAN b
    LEFT JOIN dbo.VI_TRI_BAN v ON v.MaViTri=b.MaViTri
    WHERE b.MaBan=@id
  `, { id: Number(id) });
  return result.recordset[0] ? tableRecord(result.recordset[0]) : null;
}

async function ensureLocation(name) {
  const result = await query(`
    IF EXISTS (SELECT 1 FROM dbo.VI_TRI_BAN WHERE TenViTri=@name)
      SELECT TOP 1 MaViTri AS id FROM dbo.VI_TRI_BAN WHERE TenViTri=@name ORDER BY MaViTri;
    ELSE
    BEGIN
      INSERT INTO dbo.VI_TRI_BAN(TenViTri) VALUES(@name);
      SELECT CONVERT(int,SCOPE_IDENTITY()) AS id;
    END
  `, { name: name || 'Trong nhà' });
  return result.recordset[0].id;
}

async function createTable(data) {
  const locationId = await ensureLocation(data.area || data.zone);
  const result = await query(`
    INSERT INTO dbo.BAN(TenBan,SucChua,MaViTri,TrangThai,LoaiBan)
    OUTPUT INSERTED.MaBan AS id
    VALUES(@name,@capacity,@locationId,@status,@type)
  `, {
    name: data.name,
    capacity: Number(data.capacity || 4),
    locationId,
    status: TABLE_STATUS_TO_SQL[data.status] || 'Trống',
    type: data.type === 'VIP' ? 'VIP' : 'Thường'
  });
  return getTable(result.recordset[0].id);
}

async function updateTable(id, data) {
  const current = await getTable(id);
  if (!current) return null;
  const locationId = await ensureLocation(data.area || data.zone || current.area);
  await query(`
    UPDATE dbo.BAN SET TenBan=@name,SucChua=@capacity,MaViTri=@locationId,
      TrangThai=@status,LoaiBan=@type WHERE MaBan=@id
  `, {
    id: Number(id),
    name: data.name || current.name,
    capacity: Number(data.capacity || current.capacity),
    locationId,
    status: TABLE_STATUS_TO_SQL[data.status] || TABLE_STATUS_TO_SQL[current.status],
    type: data.type === 'VIP' || current.type === 'VIP' ? 'VIP' : 'Thường'
  });
  return getTable(id);
}

async function deleteTable(id) {
  const current = await getTable(id);
  if (!current) return null;
  await query('DELETE FROM dbo.BAN WHERE MaBan=@id', { id: Number(id) });
  return current;
}

function menuRecord(row) {
  return {
    id: row.id,
    sourceId: row.sourceId,
    source: row.source,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    status: row.sqlStatus === 'Còn bán' ? 'available' : 'unavailable'
  };
}

const MENU_SELECT = `
  SELECT MaMon AS sourceId,MaMon AS id,'MON_AN' AS source,TenMon AS name,
    N'Món ăn' AS category,DonGia AS price,TrangThai AS sqlStatus
  FROM dbo.MON_AN
  UNION ALL
  SELECT MaDoUong AS sourceId,MaDoUong+${DRINK_ID_OFFSET} AS id,'DO_UONG' AS source,
    TenDoUong AS name,N'Đồ uống' AS category,DonGia AS price,TrangThai AS sqlStatus
  FROM dbo.DO_UONG
`;

async function listMenu() {
  const result = await query(`${MENU_SELECT} ORDER BY category,name`);
  return result.recordset.map(menuRecord);
}

function menuSource(id) {
  const numericId = Number(id);
  return numericId >= DRINK_ID_OFFSET
    ? { table: 'DO_UONG', id: numericId - DRINK_ID_OFFSET, name: 'TenDoUong', category: 'Đồ uống' }
    : { table: 'MON_AN', id: numericId, name: 'TenMon', category: 'Món ăn' };
}

async function getMenuItem(id) {
  const source = menuSource(id);
  const result = await query(`
    SELECT ${source.id === Number(id) ? 'MaMon' : 'MaDoUong'} AS sourceId,
      ${source.id === Number(id) ? 'MaMon' : 'MaDoUong'} AS rawId,
      '${source.table}' AS source,${source.name} AS name,DonGia AS price,TrangThai AS sqlStatus
    FROM dbo.${source.table}
    WHERE ${source.table === 'MON_AN' ? 'MaMon' : 'MaDoUong'}=@id
  `, { id: source.id });
  const row = result.recordset[0];
  if (!row) return null;
  return menuRecord({
    ...row,
    id: source.table === 'DO_UONG' ? row.rawId + DRINK_ID_OFFSET : row.rawId,
    category: source.category
  });
}

async function createMenuItem(data) {
  const isDrink = data.category === 'Đồ uống';
  const table = isDrink ? 'DO_UONG' : 'MON_AN';
  const nameColumn = isDrink ? 'TenDoUong' : 'TenMon';
  const idColumn = isDrink ? 'MaDoUong' : 'MaMon';
  const sqlStatus = data.status === 'unavailable' ? (isDrink ? 'Hết hàng' : 'Hết món') : 'Còn bán';
  const result = await query(`
    INSERT INTO dbo.${table}(${nameColumn},DonGia,TrangThai)
    OUTPUT INSERTED.${idColumn} AS id
    VALUES(@name,@price,@status)
  `, { name: data.name, price: Number(data.price || 0), status: sqlStatus });
  const id = result.recordset[0].id + (isDrink ? DRINK_ID_OFFSET : 0);
  return getMenuItem(id);
}

async function updateMenuItem(id, data) {
  const current = await getMenuItem(id);
  if (!current) return null;
  const source = menuSource(id);
  const nameColumn = source.table === 'DO_UONG' ? 'TenDoUong' : 'TenMon';
  const sqlStatus = data.status === 'unavailable'
    ? (source.table === 'DO_UONG' ? 'Hết hàng' : 'Hết món')
    : 'Còn bán';
  await query(`
    UPDATE dbo.${source.table} SET ${nameColumn}=@name,DonGia=@price,TrangThai=@status
    WHERE ${source.table === 'DO_UONG' ? 'MaDoUong' : 'MaMon'}=@id
  `, {
    id: source.id,
    name: data.name || current.name,
    price: Number(data.price ?? current.price),
    status: data.status ? sqlStatus : (current.status === 'available' ? 'Còn bán' : source.table === 'DO_UONG' ? 'Hết hàng' : 'Hết món')
  });
  return getMenuItem(id);
}

async function deleteMenuItem(id) {
  const current = await getMenuItem(id);
  if (!current) return null;
  const source = menuSource(id);
  await query(`DELETE FROM dbo.${source.table} WHERE ${source.table === 'DO_UONG' ? 'MaDoUong' : 'MaMon'}=@id`, { id: source.id });
  return current;
}

async function listCustomers() {
  const result = await query(`
    SELECT MaKH AS id,HoTen AS name,SoDienThoai AS phone,Email AS email,
      DiaChi AS address,HangThanhVien AS membership,DiemTichLuy AS points
    FROM dbo.KHACH_HANG ORDER BY MaKH
  `);
  return result.recordset;
}

async function getCustomer(id) {
  const result = await query('SELECT MaKH AS id,HoTen AS name,SoDienThoai AS phone,Email AS email,DiaChi AS address,HangThanhVien AS membership,DiemTichLuy AS points FROM dbo.KHACH_HANG WHERE MaKH=@id', { id: Number(id) });
  return result.recordset[0] || null;
}

async function createCustomer(data) {
  const result = await query(`
    INSERT INTO dbo.KHACH_HANG(HoTen,SoDienThoai,Email,DiaChi)
    OUTPUT INSERTED.MaKH AS id
    VALUES(@name,@phone,@email,@address)
  `, { name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null });
  return getCustomer(result.recordset[0].id);
}

async function updateCustomer(id, data) {
  const current = await getCustomer(id);
  if (!current) return null;
  await query(`
    UPDATE dbo.KHACH_HANG SET HoTen=@name,SoDienThoai=@phone,Email=@email,DiaChi=@address
    WHERE MaKH=@id
  `, {
    id: Number(id),
    name: data.name || current.name,
    phone: data.phone ?? current.phone,
    email: data.email ?? current.email,
    address: data.address ?? current.address
  });
  return getCustomer(id);
}

async function deleteCustomer(id) {
  const current = await getCustomer(id);
  if (!current) return null;
  await query('DELETE FROM dbo.KHACH_HANG WHERE MaKH=@id', { id: Number(id) });
  return current;
}

async function listLoyaltyCards() {
  const result = await query(`
    SELECT MaKH AS id,MaTheHoiVien AS code,HoTen AS name,SoDienThoai AS phone,
      Email AS email,DiaChi AS address,HangThanhVien AS membership,
      DiemTichLuy AS points,NgayTao AS createdAt
    FROM dbo.KHACH_HANG WHERE MaTheHoiVien IS NOT NULL ORDER BY NgayTao DESC,MaKH DESC
  `);
  return result.recordset;
}

async function getLoyaltyCard(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const result = await query(`
    SELECT MaKH AS id,MaTheHoiVien AS code,HoTen AS name,SoDienThoai AS phone,
      Email AS email,DiaChi AS address,HangThanhVien AS membership,
      DiemTichLuy AS points,NgayTao AS createdAt
    FROM dbo.KHACH_HANG WHERE MaTheHoiVien=@code
  `, { code: normalizedCode });
  return result.recordset[0] || null;
}

function generateLoyaltyCode() {
  const letters = `${String.fromCharCode(65 + crypto.randomInt(0, 26))}${String.fromCharCode(65 + crypto.randomInt(0, 26))}`;
  const digits = Array.from({ length: 10 }, () => crypto.randomInt(0, 10)).join('');
  return `${letters}-${digits}`;
}

async function createLoyaltyCard(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new Error('Customer name is required to register a loyalty card.');
  return withTransaction(async (transactionQuery) => {
    const phone = String(data.phone || '').trim() || null;
    const existingCustomer = phone
      ? await transactionQuery('SELECT TOP 1 MaKH AS id,MaTheHoiVien AS code FROM dbo.KHACH_HANG WHERE SoDienThoai=@phone ORDER BY MaKH', { phone })
      : { recordset: [] };
    if (existingCustomer.recordset[0]?.code) throw new Error('This phone number already has a loyalty card.');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateLoyaltyCode();
      try {
        if (existingCustomer.recordset[0]) {
          const existing = await transactionQuery(`
            UPDATE dbo.KHACH_HANG SET HoTen=@name,Email=@email,DiaChi=@address,MaTheHoiVien=@code
            OUTPUT INSERTED.MaKH AS id
            WHERE MaKH=@id AND MaTheHoiVien IS NULL;
          `, {
            id: existingCustomer.recordset[0].id,
            name, phone, email: String(data.email || '').trim() || null,
            address: String(data.address || '').trim() || null, code
          });
          if (existing.recordset[0]) return { id: existing.recordset[0].id, code, name, phone, email: data.email || null, address: data.address || null, points: 0 };
        }
        const inserted = await transactionQuery(`
          INSERT INTO dbo.KHACH_HANG(HoTen,SoDienThoai,Email,DiaChi,MaTheHoiVien)
          OUTPUT INSERTED.MaKH AS id
          VALUES(@name,@phone,@email,@address,@code)
        `, {
          name,
          phone: String(data.phone || '').trim() || null,
          email: String(data.email || '').trim() || null,
          address: String(data.address || '').trim() || null,
          code
        });
        return { id: inserted.recordset[0].id, code, name, phone: data.phone || null, email: data.email || null, address: data.address || null, points: 0 };
      } catch (error) {
        if (error.number !== 2601 && error.number !== 2627) throw error;
      }
    }
    throw new Error('Could not generate a unique loyalty card code. Please try again.');
  });
}

async function listEmployees() {
  const result = await query(`
    SELECT MaNV AS id,MaNhanVien AS employeeCode,HoTen AS name,ChucVu AS position,
      TenDangNhap AS username,VaiTro AS role,TrangThai AS sqlStatus,Email AS email,
      SoDienThoai AS phone,DiaChi AS address,NgaySinh AS birthDate,GioiTinh AS gender,
      NgayVaoLam AS hireDate
    FROM dbo.NHAN_VIEN ORDER BY MaNV
  `);
  return result.recordset.map((employee) => ({
    ...employee,
    status: employee.sqlStatus === 'Nghỉ việc' ? 'off' : 'active'
  }));
}

async function getEmployee(id) {
  const result = await query(`
    SELECT MaNV AS id,MaNhanVien AS employeeCode,HoTen AS name,ChucVu AS position,
      TenDangNhap AS username,VaiTro AS role,TrangThai AS sqlStatus,Email AS email,
      SoDienThoai AS phone,DiaChi AS address,NgaySinh AS birthDate,GioiTinh AS gender,
      NgayVaoLam AS hireDate
    FROM dbo.NHAN_VIEN WHERE MaNV=@id
  `, { id: Number(id) });
  const employee = result.recordset[0];
  return employee ? { ...employee, status: employee.sqlStatus === 'Nghỉ việc' ? 'off' : 'active' } : null;
}

async function createEmployee(data) {
  const name = String(data.name || '').trim();
  if (!name) throw new Error('Employee name is required.');
  const username = String(data.username || '').trim() || null;
  const password = String(data.password || '').trim() || null;
  if (Boolean(username) !== Boolean(password)) throw new Error('Enter both username and initial password to create a login.');
  if (password && password.length < 4) throw new Error('Initial password must contain at least 4 characters.');
  const birthDate = data.birthDate ? sqlDate(data.birthDate) : null;
  const hireDate = data.hireDate ? sqlDate(data.hireDate) : null;
  if ((data.birthDate && !birthDate) || (data.hireDate && !hireDate)) throw new Error('Employee dates are invalid.');
  const created = await withTransaction(async (transactionQuery) => {
    const result = await transactionQuery(`
      INSERT INTO dbo.NHAN_VIEN(HoTen,ChucVu,TrangThai,VaiTro,Email,SoDienThoai,DiaChi,NgaySinh,GioiTinh,NgayVaoLam,TenDangNhap,MatKhau)
      OUTPUT INSERTED.MaNV AS id
      VALUES(@name,@position,@status,'EMPLOYEE',@email,@phone,@address,@birthDate,@gender,@hireDate,@username,@password)
    `, {
      name,
      position: String(data.position || 'Nhân viên').trim(),
      status: data.status === 'off' ? 'Nghỉ việc' : 'Rảnh',
      email: String(data.email || '').trim() || null,
      phone: String(data.phone || '').trim() || null,
      address: String(data.address || '').trim() || null,
      birthDate, gender: String(data.gender || '').trim() || null, hireDate, username, password
    });
    const id = result.recordset[0].id;
    await transactionQuery("UPDATE dbo.NHAN_VIEN SET MaNhanVien=@code WHERE MaNV=@id", {
      id, code: `NV-${String(id).padStart(4, '0')}`
    });
    return id;
  });
  return getEmployee(created);
}

async function updateEmployee(id, data) {
  const current = await getEmployee(id);
  if (!current) return null;
  const birthDate = data.birthDate === '' || data.birthDate === null ? null : data.birthDate === undefined ? current.birthDate : sqlDate(data.birthDate);
  const hireDate = data.hireDate === '' || data.hireDate === null ? null : data.hireDate === undefined ? current.hireDate : sqlDate(data.hireDate);
  if ((data.birthDate && !birthDate) || (data.hireDate && !hireDate)) throw new Error('Employee dates are invalid.');
  const username = data.username === undefined ? current.username : String(data.username || '').trim() || null;
  const password = String(data.password || '').trim();
  if (username && !current.username && !password) throw new Error('An initial password is required when adding a login.');
  if (password && password.length < 4) throw new Error('Password must contain at least 4 characters.');
  await query(`
    UPDATE dbo.NHAN_VIEN SET HoTen=@name,ChucVu=@position,TrangThai=@status,
      Email=@email,SoDienThoai=@phone,DiaChi=@address,NgaySinh=@birthDate,
      GioiTinh=@gender,NgayVaoLam=@hireDate,TenDangNhap=@username,
      MatKhau=CASE WHEN @password IS NULL THEN MatKhau ELSE @password END
    WHERE MaNV=@id
  `, {
    id: Number(id),
    name: data.name || current.name,
    position: data.position || current.position,
    status: data.status === 'off' ? 'Nghỉ việc' : 'Rảnh',
    email: data.email ?? current.email ?? null,
    phone: data.phone ?? current.phone ?? null,
    address: data.address ?? current.address ?? null,
    birthDate, hireDate,
    gender: data.gender ?? current.gender ?? null,
    username,
    password: password || null
  });
  return getEmployee(id);
}

async function deleteEmployee(id) {
  const current = await getEmployee(id);
  if (!current) return null;
  await query('DELETE FROM dbo.NHAN_VIEN WHERE MaNV=@id', { id: Number(id) });
  return current;
}

async function listVouchers() {
  const result = await query(`
    SELECT MaVoucher AS id,MaCode AS code,TenVoucher AS name,LoaiGiam AS sqlType,
      GiaTriGiam AS discountValue,DonToiThieu AS minimumOrder,GiamToiDa AS maximumDiscount,
      SoLuong AS quantity,NgayBatDau AS startsAt,NgayKetThuc AS endsAt,TrangThai AS sqlStatus
    FROM dbo.VOUCHER ORDER BY MaVoucher
  `);
  return result.recordset.map((voucher) => ({
    ...voucher,
    discountType: voucher.sqlType === 'Phần trăm' ? 'percent' : 'fixed',
    status: voucher.sqlStatus === 'Hoạt động' ? 'active' : 'inactive'
  }));
}

async function getVoucher(id) {
  const vouchers = await listVouchers();
  return vouchers.find((voucher) => voucher.id === Number(id)) || null;
}

async function createVoucher(data) {
  const isPercent = data.discountType === 'percent';
  const code = normalizeVoucherCode(data.code);
  const value = Number(data.discountValue);
  const minimumOrder = Number(data.minimumOrder || 0);
  const maximumDiscount = data.maximumDiscount === '' || data.maximumDiscount === null || data.maximumDiscount === undefined ? null : Number(data.maximumDiscount);
  const quantity = Number(data.quantity || 0);
  const startsAt = sqlDate(data.startsAt);
  const endsAt = sqlDate(data.endsAt);
  if (!data.name?.trim() || !/^[A-Z0-9_-]{2,30}$/.test(code)) throw voucherError('Tên và mã voucher hợp lệ là bắt buộc.');
  if (!(value > 0) || (isPercent && value > 100) || (!isPercent && data.discountType !== 'fixed')) throw voucherError('Giá trị giảm không hợp lệ.');
  if (!Number.isFinite(minimumOrder) || minimumOrder < 0 || (maximumDiscount !== null && (!Number.isFinite(maximumDiscount) || maximumDiscount < 0)) || !Number.isInteger(quantity) || quantity < 1) throw voucherError('Điều kiện và số lượt sử dụng không hợp lệ.');
  if (!startsAt || !endsAt || startsAt > endsAt) throw voucherError('Khoảng thời gian voucher không hợp lệ.');
  const result = await query(`
    INSERT INTO dbo.VOUCHER(MaCode,TenVoucher,LoaiGiam,GiaTriGiam,DonToiThieu,GiamToiDa,SoLuong,NgayBatDau,NgayKetThuc,TrangThai)
    OUTPUT INSERTED.MaVoucher AS id
    VALUES(@code,@name,@type,@value,@minimum,@maximum,@quantity,@startsAt,@endsAt,@status)
  `, {
    code,
    name: data.name.trim(),
    type: isPercent ? 'Phần trăm' : 'Tiền mặt',
    value,
    minimum: minimumOrder,
    maximum: maximumDiscount,
    quantity,
    startsAt,
    endsAt,
    status: data.status === 'inactive' ? 'Ngưng' : 'Hoạt động'
  });
  return getVoucher(result.recordset[0].id);
}

async function updateVoucher(id, data) {
  const current = await getVoucher(id);
  if (!current) return null;
  const code = normalizeVoucherCode(data.code || current.code);
  const discountType = data.discountType || current.discountType;
  const discountValue = Number(data.discountValue ?? current.discountValue);
  const minimumOrder = Number(data.minimumOrder ?? current.minimumOrder ?? 0);
  const maximumDiscount = data.maximumDiscount === '' || data.maximumDiscount === null
    ? null
    : data.maximumDiscount === undefined ? current.maximumDiscount : Number(data.maximumDiscount);
  const quantity = Number(data.quantity ?? current.quantity ?? 0);
  const startsAt = sqlDate(data.startsAt ?? current.startsAt);
  const endsAt = sqlDate(data.endsAt ?? current.endsAt);
  if (!data.name?.trim() || !/^[A-Z0-9_-]{2,30}$/.test(code)) throw voucherError('Tên và mã voucher hợp lệ là bắt buộc.');
  if (!(discountValue > 0) || (discountType === 'percent' && discountValue > 100) || !['percent', 'fixed'].includes(discountType)) throw voucherError('Giá trị giảm không hợp lệ.');
  if (!Number.isFinite(minimumOrder) || minimumOrder < 0 || (maximumDiscount !== null && (!Number.isFinite(Number(maximumDiscount)) || Number(maximumDiscount) < 0)) || !Number.isInteger(quantity) || quantity < 1) throw voucherError('Điều kiện và số lượt sử dụng không hợp lệ.');
  if (!startsAt || !endsAt || startsAt > endsAt) throw voucherError('Khoảng thời gian voucher không hợp lệ.');
  await query(`
    UPDATE dbo.VOUCHER SET MaCode=@code,TenVoucher=@name,LoaiGiam=@type,GiaTriGiam=@value,
      DonToiThieu=@minimum,GiamToiDa=@maximum,SoLuong=@quantity,
      NgayBatDau=@startsAt,NgayKetThuc=@endsAt,TrangThai=@status WHERE MaVoucher=@id
  `, {
    id: Number(id),
    code,
    name: data.name.trim(),
    type: discountType === 'percent' ? 'Phần trăm' : 'Tiền mặt',
    value: discountValue,
    minimum: minimumOrder,
    maximum: maximumDiscount,
    quantity,
    startsAt,
    endsAt,
    status: data.status === 'inactive' ? 'Ngưng' : 'Hoạt động'
  });
  return getVoucher(id);
}

function normalizeVoucherCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 30);
}

function voucherError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function findVoucherByCode(execute, code, lock = false) {
  const hint = lock ? ' WITH (UPDLOCK,HOLDLOCK)' : '';
  const result = await execute(`
    SELECT TOP 1 MaVoucher AS id,MaCode AS code,TenVoucher AS name,LoaiGiam AS sqlType,
      GiaTriGiam AS discountValue,DonToiThieu AS minimumOrder,GiamToiDa AS maximumDiscount,
      SoLuong AS quantity,NgayBatDau AS startsAt,NgayKetThuc AS endsAt,TrangThai AS sqlStatus,
      CASE WHEN CAST(GETDATE() AS date) BETWEEN NgayBatDau AND NgayKetThuc THEN 1 ELSE 0 END AS inDateRange
    FROM dbo.VOUCHER${hint} WHERE MaCode=@code
  `, { code: normalizeVoucherCode(code) });
  return result.recordset[0] || null;
}

function calculateVoucher(voucher, subtotal) {
  const amount = Number(subtotal);
  if (!voucher) throw voucherError('Không tìm thấy mã voucher.');
  if (voucher.sqlStatus !== 'Hoạt động' || !voucher.inDateRange) throw voucherError('Voucher chưa có hiệu lực hoặc đã hết hạn.');
  if (Number(voucher.quantity) <= 0) throw voucherError('Voucher đã hết lượt sử dụng.');
  if (!Number.isFinite(amount) || amount < Number(voucher.minimumOrder || 0)) throw voucherError(`Hóa đơn chưa đạt mức tối thiểu ${Number(voucher.minimumOrder || 0).toLocaleString('vi-VN')}đ.`);
  let discount = voucher.sqlType === 'Phần trăm'
    ? amount * Number(voucher.discountValue) / 100
    : Number(voucher.discountValue);
  if (voucher.maximumDiscount !== null && voucher.maximumDiscount !== undefined) {
    discount = Math.min(discount, Number(voucher.maximumDiscount));
  }
  discount = Math.min(Math.max(Math.round(discount), 0), amount);
  return { discount, total: amount - discount };
}

async function validateVoucher(code, subtotal) {
  const voucher = await findVoucherByCode(query, code);
  const { discount, total } = calculateVoucher(voucher, subtotal);
  return {
    id: voucher.id,
    code: voucher.code,
    name: voucher.name,
    discountType: voucher.sqlType === 'Phần trăm' ? 'percent' : 'fixed',
    discountValue: Number(voucher.discountValue),
    minimumOrder: Number(voucher.minimumOrder || 0),
    maximumDiscount: voucher.maximumDiscount === null ? null : Number(voucher.maximumDiscount),
    quantity: Number(voucher.quantity),
    discount,
    total
  };
}

async function deleteVoucher(id) {
  const current = await getVoucher(id);
  if (!current) return null;
  await query('DELETE FROM dbo.VOUCHER WHERE MaVoucher=@id', { id: Number(id) });
  return current;
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    invoiceCode: row.invoiceCode,
    orderId: row.id,
    customer: row.customer || 'Khách lẻ',
    customerName: row.customer || 'Khách lẻ',
    customerId: row.customerId,
    table: row.table,
    tableId: row.tableId,
    orderType: row.orderType,
    employee: row.employeeCode || (row.employeeId ? `NV-${String(row.employeeId).padStart(2, '0')}` : 'NV-01'),
    employeeId: row.employeeId,
    date: row.date,
    createdAt: row.createdAt,
    paymentMethod: row.paymentMethod,
    subtotal: Number(row.subtotal ?? row.total ?? 0),
    discount: Number(row.discount || 0),
    voucherCode: row.voucherCode || null,
    total: Number(row.total || 0),
    status: invoiceStatusFromSql(row.sqlStatus),
    items: row.detailId ? [{
      name: row.itemName,
      qty: row.quantity,
      price: Number(row.price || 0),
      category: row.itemCategory
    }] : []
  };
}

const INVOICE_SELECT = `
  SELECT h.MaHoaDon AS id,h.MaHoaDonCode AS invoiceCode,h.MaKH AS customerId,
    kh.HoTen AS customer,b.TenBan AS [table],h.MaBan AS tableId,
    CASE WHEN h.MaBan IS NULL THEN N'Mang đi' ELSE N'Dùng tại bàn' END AS orderType,
    h.MaNV AS employeeId,
    nv.MaNhanVien AS employeeCode,CONVERT(char(10),CAST(COALESCE(h.NgayThanhToan,h.NgayTao) AS date),103) AS date,
    h.NgayTao AS createdAt,h.PhuongThucThanhToan AS paymentMethod,
    h.TongTien AS subtotal,h.TienGiam AS discount,h.MaVoucherCode AS voucherCode,
    h.ThanhTien AS total,h.TrangThai AS sqlStatus,d.MaCTHD AS detailId,
    COALESCE(m.TenMon,du.TenDoUong) AS itemName,d.SoLuong AS quantity,
    d.DonGia AS price,CASE WHEN d.MaDoUong IS NOT NULL THEN N'Đồ uống' ELSE N'Món ăn' END AS itemCategory
  FROM dbo.HOA_DON h
  LEFT JOIN dbo.KHACH_HANG kh ON kh.MaKH=h.MaKH
  LEFT JOIN dbo.BAN b ON b.MaBan=h.MaBan
  LEFT JOIN dbo.NHAN_VIEN nv ON nv.MaNV=h.MaNV
  LEFT JOIN dbo.CHI_TIET_HOA_DON d ON d.MaHoaDon=h.MaHoaDon
  LEFT JOIN dbo.MON_AN m ON m.MaMon=d.MaMon
  LEFT JOIN dbo.DO_UONG du ON du.MaDoUong=d.MaDoUong
`;

async function listInvoices() {
  const result = await query(`${INVOICE_SELECT} ORDER BY h.MaHoaDon DESC,d.MaCTHD`);
  const invoices = new Map();
  result.recordset.forEach((row) => {
    if (!invoices.has(row.id)) invoices.set(row.id, mapInvoiceRow(row));
    else if (row.detailId) invoices.get(row.id).items.push(mapInvoiceRow(row).items[0]);
  });
  return [...invoices.values()];
}

async function getInvoice(id) {
  const invoices = await listInvoices();
  return invoices.find((invoice) => invoice.id === Number(id) || invoice.invoiceCode === String(id)) || null;
}

async function resolveCustomer(transactionQuery, name, loyaltyCode) {
  if (loyaltyCode) {
    const code = String(loyaltyCode).trim().toUpperCase();
    const member = await transactionQuery('SELECT TOP 1 MaKH AS id FROM dbo.KHACH_HANG WHERE MaTheHoiVien=@code', { code });
    if (!member.recordset[0]) throw new Error('Loyalty card code was not found.');
    return member.recordset[0].id;
  }
  const customerName = name || 'Khách lẻ';
  const existing = await transactionQuery('SELECT TOP 1 MaKH AS id FROM dbo.KHACH_HANG WHERE HoTen=@name ORDER BY MaKH', { name: customerName });
  if (existing.recordset[0]) return existing.recordset[0].id;
  const inserted = await transactionQuery('INSERT INTO dbo.KHACH_HANG(HoTen) OUTPUT INSERTED.MaKH AS id VALUES(@name)', { name: customerName });
  return inserted.recordset[0].id;
}

async function resolveEmployee(transactionQuery, employeeCode) {
  const requestedNumber = Number(String(employeeCode || '').match(/\d+/)?.[0]);
  let employee = null;
  if (employeeCode) {
    const result = await transactionQuery(`
      SELECT TOP 1 MaNV AS id FROM dbo.NHAN_VIEN
      WHERE MaNhanVien=@code OR (@number>0 AND MaNV=@number)
      ORDER BY MaNV
    `, { code: employeeCode, number: requestedNumber || 0 });
    employee = result.recordset[0];
  }
  if (employee) return employee.id;
  const fallback = await transactionQuery(`SELECT TOP 1 MaNV AS id FROM dbo.NHAN_VIEN WHERE TrangThai<>N'Nghỉ việc' ORDER BY MaNV`);
  if (!fallback.recordset[0]) throw new Error('No active employee is available for the invoice.');
  return fallback.recordset[0].id;
}

async function createInvoice(data) {
  return withTransaction(async (transactionQuery) => {
    const customerId = await resolveCustomer(transactionQuery, data.customerName || data.customer, data.customerCode || data.loyaltyCode);

    const tableValue = data.table ?? data.tableName ?? data.tableId ?? data.tableCode;
    let tableId = null;

    if (tableValue !== null && tableValue !== undefined && String(tableValue).trim() !== '') {
      const normalizedValue = String(tableValue).trim();
      if (/^\d+$/.test(normalizedValue)) {
        tableId = Number(normalizedValue);
      } else {
        const tableResult = await transactionQuery(`
          SELECT TOP 1 MaBan AS id FROM dbo.BAN
          WHERE TenBan=@name OR CAST(MaBan AS varchar(10))=@name
          ORDER BY MaBan
        `, { name: normalizedValue });
        tableId = tableResult.recordset[0]?.id || null;
      }
    }

    const isTakeaway = data.orderType === 'Mang đi' || data.orderType === 'takeaway';
    if ((tableId === null || Number.isNaN(Number(tableId))) && !isTakeaway) {
      throw new Error('Table is required for invoice creation.');
    }

    const employeeId = await resolveEmployee(transactionQuery, data.employee || 'NV-01');
    const invoiceDate = sqlDate(data.date);
    const code = String(data.invoiceCode || data.code || `HD-${Date.now().toString().slice(-8)}`).slice(0, 30);
    const status = INVOICE_STATUS_TO_SQL[data.status] || 'Chờ thanh toán';
    const subtotal = Math.max(Number(data.subtotal ?? data.total ?? 0), 0);
    let discount = 0;
    let voucherCode = null;
    if (data.voucherCode) {
      const voucher = await findVoucherByCode(transactionQuery, data.voucherCode, true);
      const calculation = calculateVoucher(voucher, subtotal);
      discount = calculation.discount;
      voucherCode = voucher.code;
      await transactionQuery('UPDATE dbo.VOUCHER SET SoLuong=SoLuong-1 WHERE MaVoucher=@id AND SoLuong>0', { id: voucher.id });
    }
    const total = subtotal - discount;
    const header = await transactionQuery(`
      INSERT INTO dbo.HOA_DON(MaKH,MaBan,MaNV,NgayDat,NgayThanhToan,PhuongThucThanhToan,SoNguoi,TongTien,TienGiam,PhiDatBan,ThanhTien,TrangThai,MaHoaDonCode,MaVoucherCode)
      VALUES(@customerId,@tableId,@employeeId,@invoiceDate,
        CASE WHEN @status=N'Đã thanh toán' THEN SYSDATETIME() ELSE NULL END,
        @paymentMethod,NULL,@subtotal,@discount,0,@total,@status,@code,@voucherCode);
      SELECT CONVERT(int,SCOPE_IDENTITY()) AS id;
    `, {
      customerId,
      tableId,
      employeeId,
      invoiceDate,
      status,
      paymentMethod: data.paymentMethod || null,
      subtotal,
      discount,
      total,
      code,
      voucherCode
    });
    const invoiceId = header.recordset[0].id;

    for (const item of data.items || []) {
      const isDrink = item.category === 'Đồ uống';
      const product = await transactionQuery(isDrink
        ? 'SELECT TOP 1 MaDoUong AS id FROM dbo.DO_UONG WHERE TenDoUong=@name'
        : 'SELECT TOP 1 MaMon AS id FROM dbo.MON_AN WHERE TenMon=@name', { name: item.name });
      if (!product.recordset[0]) throw new Error(`Product not found in SQL: ${item.name}`);
      await transactionQuery(`
        INSERT INTO dbo.CHI_TIET_HOA_DON(MaHoaDon,MaMon,MaDoUong,SoLuong,DonGia)
        VALUES(@invoiceId,@foodId,@drinkId,@quantity,@price)
      `, {
        invoiceId,
        foodId: isDrink ? null : product.recordset[0].id,
        drinkId: isDrink ? product.recordset[0].id : null,
        quantity: Math.max(Number(item.qty || 1), 1),
        price: Math.max(Number(item.price || 0), 0)
      });
    }

    return invoiceId;
  }).then(getInvoice);
}

async function updateInvoice(id, data) {
  const current = await getInvoice(id);
  if (!current) return null;
  const status = INVOICE_STATUS_TO_SQL[data.status] || INVOICE_STATUS_TO_SQL[current.status] || 'Chờ thanh toán';
  const sqlId = current.id;
  await query(`
    UPDATE dbo.HOA_DON SET TrangThai=@status,
      NgayThanhToan=CASE WHEN @status=N'Đã thanh toán' THEN COALESCE(NgayThanhToan,SYSDATETIME()) ELSE NULL END,
      PhuongThucThanhToan=COALESCE(@paymentMethod,PhuongThucThanhToan)
    WHERE MaHoaDon=@id
  `, { id: sqlId, status, paymentMethod: data.paymentMethod || current.paymentMethod || null });
  if (status === 'Đã hủy' && current.status !== 'cancelled' && current.voucherCode) {
    await query('UPDATE dbo.VOUCHER SET SoLuong=SoLuong+1 WHERE MaCode=@code', { code: current.voucherCode });
  }
  return getInvoice(sqlId);
}

async function deleteInvoice(id) {
  const current = await getInvoice(id);
  if (!current) return null;
  await withTransaction(async (transactionQuery) => {
    await transactionQuery('DELETE FROM dbo.CHI_TIET_HOA_DON WHERE MaHoaDon=@id', { id: current.id });
    await transactionQuery('DELETE FROM dbo.HOA_DON WHERE MaHoaDon=@id', { id: current.id });
  });
  return current;
}

async function listBookings() {
  const result = await query(`
    SELECT d.MaDatBan AS id,d.TenKhachHang AS customer,b.TenBan AS [table],
      CONVERT(char(10),d.NgayDat,23) AS date,CONVERT(char(5),d.GioDat,108) AS time,
      d.SoNguoi AS guests,d.TrangThai AS sqlStatus
    FROM dbo.DAT_BAN d JOIN dbo.BAN b ON b.MaBan=d.MaBan
    ORDER BY d.NgayDat DESC,d.GioDat DESC
  `);
  return result.recordset.map((booking) => ({
    ...booking,
    status: booking.sqlStatus === 'Đã hủy' ? 'cancelled' : 'confirmed'
  }));
}

async function getBooking(id) {
  const bookings = await listBookings();
  return bookings.find((booking) => booking.id === Number(id)) || null;
}

async function createBooking(data) {
  return withTransaction(async (transactionQuery) => {
    const table = await transactionQuery('SELECT MaBan AS id,SucChua AS capacity,TrangThai AS status,LoaiBan AS type FROM dbo.BAN WHERE TenBan=@name', { name: data.table });
    if (!table.recordset[0]) throw new Error('Table not found.');
    const maxGuests = table.recordset[0].type === 'VIP' ? 10 : 6;
    const guests = Number(data.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > maxGuests) {
      throw new Error(`Guest count must be between 1 and ${maxGuests} for this table type.`);
    }
    if (table.recordset[0].capacity < Number(data.guests)) throw new Error('Guest count exceeds table capacity.');

    const date = sqlDate(data.date);
    if (!date || !data.time) throw new Error('Booking date and time are required.');
    const dateText = String(data.date).slice(0, 10);
    const timeText = String(data.time).slice(0, 5);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (dateText < today || (dateText === today && timeText < currentTime)) {
      throw new Error('Booking date and time cannot be in the past.');
    }
    const conflict = await transactionQuery(`
      SELECT TOP 1 MaDatBan AS id FROM dbo.DAT_BAN WITH (UPDLOCK,HOLDLOCK)
      WHERE MaBan=@tableId AND NgayDat=@date AND TrangThai<>N'Đã hủy'
    `, { tableId: table.recordset[0].id, date, time: data.time });
    if (conflict.recordset[0]) throw new Error('This table is already booked for that time.');

    const customer = data.customer
      ? await transactionQuery('SELECT TOP 1 MaKH AS id FROM dbo.KHACH_HANG WHERE HoTen=@name ORDER BY MaKH', { name: data.customer })
      : { recordset: [] };
    const result = await transactionQuery(`
      INSERT INTO dbo.DAT_BAN(MaBan,MaKH,TenKhachHang,NgayDat,GioDat,SoNguoi,TrangThai)
      OUTPUT INSERTED.MaDatBan AS id
      VALUES(@tableId,@customerId,@customer,@date,@time,@guests,@status)
    `, {
      tableId: table.recordset[0].id,
      customerId: customer.recordset[0]?.id || null,
      customer: data.customer,
      date,
      time: data.time,
      guests: Number(data.guests),
      status: data.status === 'cancelled' ? 'Đã hủy' : 'Đã xác nhận'
    });
    return result.recordset[0].id;
  }).then(getBooking);
}

async function updateBooking(id, data) {
  const current = await getBooking(id);
  if (!current) return null;
  await query('UPDATE dbo.DAT_BAN SET TrangThai=@status WHERE MaDatBan=@id', {
    id: Number(id),
    status: data.status === 'cancelled' ? 'Đã hủy' : 'Đã xác nhận'
  });
  return getBooking(id);
}

async function deleteBooking(id) {
  const current = await getBooking(id);
  if (!current) return null;
  await query('DELETE FROM dbo.DAT_BAN WHERE MaDatBan=@id', { id: Number(id) });
  return current;
}

async function login(username, password) {
  const result = await query(`
    SELECT TOP 1 MaNV AS id,TenDangNhap AS username,HoTen AS name,VaiTro AS role,MatKhau AS storedPassword
    FROM dbo.NHAN_VIEN
    WHERE TenDangNhap=@username AND TrangThai<>N'Nghỉ việc'
    ORDER BY MaNV
  `, { username });
  const employee = result.recordset[0];
  if (!employee || typeof employee.storedPassword !== 'string' || employee.storedPassword !== password) return null;
  const { storedPassword, ...safeUser } = employee;
  return safeUser;
}

async function getDashboard() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM dbo.BAN) AS totalTables,
      (SELECT COUNT(*) FROM dbo.BAN WHERE TrangThai=N'Trống') AS tableAvailable,
      (SELECT COUNT(*) FROM dbo.HOA_DON) AS orderCount,
      (SELECT COUNT(*) FROM dbo.KHACH_HANG) AS customerCount,
      (SELECT COUNT(*) FROM dbo.HOA_DON WHERE TrangThai=N'Chờ thanh toán') AS pendingOrders,
      (SELECT COALESCE(SUM(ThanhTien),0) FROM dbo.HOA_DON WHERE TrangThai=N'Đã thanh toán' AND CAST(NgayThanhToan AS date)=CAST(GETDATE() AS date)) AS revenueToday
  `);
  const summary = await query(`
    SELECT COALESCE(PhuongThucThanhToan,N'Khác') AS method,COALESCE(SUM(ThanhTien),0) AS total
    FROM dbo.HOA_DON
    WHERE TrangThai=N'Đã thanh toán' AND CAST(NgayThanhToan AS date)=CAST(GETDATE() AS date)
    GROUP BY PhuongThucThanhToan
  `);
  const payments = { cash: 0, transfer: 0, card: 0 };
  summary.recordset.forEach((row) => {
    if (/tiền mặt/i.test(row.method)) payments.cash += Number(row.total);
    else if (/chuyển khoản/i.test(row.method)) payments.transfer += Number(row.total);
    else if (/thẻ/i.test(row.method)) payments.card += Number(row.total);
  });
  return { ...result.recordset[0], bestSeller: '', summary: payments };
}

async function getOrders() {
  const invoices = await listInvoices();
  return invoices.map((invoice) => ({
    id: invoice.id,
    tableId: invoice.tableId,
    customerId: invoice.customerId,
    employeeId: invoice.employeeId,
    status: invoice.status,
    total: invoice.total,
    createdAt: invoice.createdAt
  }));
}

module.exports = {
  listTables, getTable, createTable, updateTable, deleteTable,
  listMenu, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem,
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  listLoyaltyCards, getLoyaltyCard, createLoyaltyCard,
  listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  listVouchers, getVoucher, createVoucher, updateVoucher, deleteVoucher, validateVoucher,
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  listBookings, getBooking, createBooking, updateBooking, deleteBooking,
  login, getDashboard, getOrders
};
