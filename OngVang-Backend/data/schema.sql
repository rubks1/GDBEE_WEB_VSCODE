IF OBJECT_ID('dbo.VI_TRI_BAN', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VI_TRI_BAN (
    MaViTri int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VI_TRI_BAN PRIMARY KEY,
    TenViTri nvarchar(100) NOT NULL CONSTRAINT UX_VI_TRI_BAN_TenViTri UNIQUE
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.VI_TRI_BAN WHERE TenViTri = N'Trong nhà')
BEGIN
  INSERT INTO dbo.VI_TRI_BAN(TenViTri) VALUES (N'Trong nhà');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.VI_TRI_BAN WHERE TenViTri = N'Sân vườn')
BEGIN
  INSERT INTO dbo.VI_TRI_BAN(TenViTri) VALUES (N'Sân vườn');
END;
GO

IF OBJECT_ID('dbo.BAN', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.BAN (
    MaBan int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BAN PRIMARY KEY,
    TenBan nvarchar(50) NOT NULL CONSTRAINT UX_BAN_TenBan UNIQUE,
    SucChua int NOT NULL CONSTRAINT CK_BAN_SucChua CHECK (SucChua > 0),
    MaViTri int NULL,
    TrangThai nvarchar(30) NOT NULL CONSTRAINT DF_BAN_TrangThai DEFAULT N'Trống',
    LoaiBan nvarchar(30) NOT NULL CONSTRAINT DF_BAN_LoaiBan DEFAULT N'Thường',
    NgayTao datetime2 NOT NULL CONSTRAINT DF_BAN_NgayTao DEFAULT sysdatetime(),
    CONSTRAINT FK_BAN_VI_TRI FOREIGN KEY (MaViTri) REFERENCES dbo.VI_TRI_BAN(MaViTri)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.BAN)
BEGIN
  DECLARE @TrongNha int = (SELECT TOP 1 MaViTri FROM dbo.VI_TRI_BAN WHERE TenViTri = N'Trong nhà');
  DECLARE @SanVuon int = (SELECT TOP 1 MaViTri FROM dbo.VI_TRI_BAN WHERE TenViTri = N'Sân vườn');

  INSERT INTO dbo.BAN(TenBan, SucChua, MaViTri, TrangThai, LoaiBan)
  VALUES
    (N'Bàn 01', 4, @TrongNha, N'Trống', N'Thường'),
    (N'Bàn 02', 6, @TrongNha, N'Trống', N'Thường'),
    (N'Bàn 03', 8, @TrongNha, N'Đang sử dụng', N'Thường'),
    (N'Bàn 04', 4, @TrongNha, N'Chờ', N'Thường'),
    (N'Bàn 05', 2, @TrongNha, N'Trống', N'Thường'),
    (N'Bàn 06', 8, @TrongNha, N'Bảo trì', N'Thường'),
    (N'Bàn 07', 6, @SanVuon, N'Trống', N'Thường'),
    (N'Bàn 08', 4, @SanVuon, N'Chờ', N'Thường'),
    (N'Bàn 09', 10, @SanVuon, N'Đang sử dụng', N'Thường');
END;
GO

IF OBJECT_ID('dbo.MON_AN', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.MON_AN (
    MaMon int IDENTITY(1,1) NOT NULL CONSTRAINT PK_MON_AN PRIMARY KEY,
    TenMon nvarchar(200) NOT NULL CONSTRAINT UX_MON_AN_TenMon UNIQUE,
    DonViTinh nvarchar(50) NULL,
    DonGia decimal(18,2) NOT NULL CONSTRAINT DF_MON_AN_DonGia DEFAULT 0,
    TrangThai nvarchar(40) NOT NULL CONSTRAINT DF_MON_AN_TrangThai DEFAULT N'Còn bán',
    NgayTao datetime2 NOT NULL CONSTRAINT DF_MON_AN_NgayTao DEFAULT sysdatetime()
  );
END;
GO

IF OBJECT_ID('dbo.DO_UONG', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.DO_UONG (
    MaDoUong int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DO_UONG PRIMARY KEY,
    TenDoUong nvarchar(200) NOT NULL CONSTRAINT UX_DO_UONG_TenDoUong UNIQUE,
    DonViTinh nvarchar(50) NULL,
    DonGia decimal(18,2) NOT NULL CONSTRAINT DF_DO_UONG_DonGia DEFAULT 0,
    TrangThai nvarchar(40) NOT NULL CONSTRAINT DF_DO_UONG_TrangThai DEFAULT N'Còn bán',
    NgayTao datetime2 NOT NULL CONSTRAINT DF_DO_UONG_NgayTao DEFAULT sysdatetime()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.MON_AN)
BEGIN
  INSERT INTO dbo.MON_AN(TenMon, DonViTinh, DonGia, TrangThai)
  VALUES
    (N'Phở bò', N'Bát', 55000, N'Còn bán'),
    (N'Cơm gà', N'Đĩa', 65000, N'Còn bán'),
    (N'Salad', N'Đĩa', 48000, N'Còn bán'),
    (N'Bún chả', N'Đĩa', 70000, N'Còn bán'),
    (N'Bò lúc lắc', N'Đĩa', 160000, N'Còn bán');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DO_UONG)
BEGIN
  INSERT INTO dbo.DO_UONG(TenDoUong, DonViTinh, DonGia, TrangThai)
  VALUES
    (N'Trà đào', N'Ly', 30000, N'Còn bán'),
    (N'Mojito', N'Ly', 45000, N'Còn bán'),
    (N'Coca Cola', N'Lon', 20000, N'Còn bán'),
    (N'Nước suối', N'Chai', 10000, N'Còn bán'),
    (N'Cà phê sữa', N'Ly', 30000, N'Còn bán');
END;
GO

IF OBJECT_ID('dbo.KHACH_HANG', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.KHACH_HANG (
    MaKH int IDENTITY(1,1) NOT NULL CONSTRAINT PK_KHACH_HANG PRIMARY KEY,
    HoTen nvarchar(200) NOT NULL,
    SoDienThoai varchar(20) NULL,
    Email varchar(200) NULL,
    DiaChi nvarchar(300) NULL,
    HangThanhVien nvarchar(50) NOT NULL CONSTRAINT DF_KHACH_HANG_HangThanhVien DEFAULT N'Thường',
    DiemTichLuy int NOT NULL CONSTRAINT DF_KHACH_HANG_DiemTichLuy DEFAULT 0,
    NgayTao datetime2 NOT NULL CONSTRAINT DF_KHACH_HANG_NgayTao DEFAULT sysdatetime()
  );
END;
GO

IF COL_LENGTH('dbo.KHACH_HANG', 'MaTheHoiVien') IS NULL
  ALTER TABLE dbo.KHACH_HANG ADD MaTheHoiVien varchar(13) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.KHACH_HANG') AND name='UX_KHACH_HANG_MaTheHoiVien')
  CREATE UNIQUE INDEX UX_KHACH_HANG_MaTheHoiVien ON dbo.KHACH_HANG(MaTheHoiVien) WHERE MaTheHoiVien IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.KHACH_HANG)
BEGIN
  INSERT INTO dbo.KHACH_HANG(HoTen, SoDienThoai, Email, DiaChi, HangThanhVien, DiemTichLuy)
  VALUES
    (N'Nguyễn Văn A', '0901234567', 'a@gmail.com', N'Hà Nội', N'VIP', 1200),
    (N'Trần Thị B', '0907654321', 'b@gmail.com', N'Đà Nẵng', N'Thường', 450),
    (N'Lê Hoàng C', '0988123456', 'c@gmail.com', N'TP.HCM', N'Gold', 900);
END;
GO

IF OBJECT_ID('dbo.NHAN_VIEN', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.NHAN_VIEN (
    MaNV int IDENTITY(1,1) NOT NULL CONSTRAINT PK_NHAN_VIEN PRIMARY KEY,
    MaNhanVien varchar(30) NULL,
    HoTen nvarchar(200) NOT NULL,
    ChucVu nvarchar(100) NULL,
    TenDangNhap varchar(100) NULL,
    MatKhau varchar(100) NULL,
    VaiTro nvarchar(50) NOT NULL CONSTRAINT DF_NHAN_VIEN_VaiTro DEFAULT N'EMPLOYEE',
    TrangThai nvarchar(60) NOT NULL CONSTRAINT DF_NHAN_VIEN_TrangThai DEFAULT N'Rảnh',
    Email varchar(200) NULL,
    SoDienThoai varchar(20) NULL,
    DiaChi nvarchar(300) NULL,
    NgaySinh date NULL,
    GioiTinh nvarchar(30) NULL,
    NgayVaoLam date NULL,
    NgayTao datetime2 NOT NULL CONSTRAINT DF_NHAN_VIEN_NgayTao DEFAULT sysdatetime(),
    CONSTRAINT UX_NHAN_VIEN_MaNhanVien UNIQUE (MaNhanVien),
    CONSTRAINT UX_NHAN_VIEN_TenDangNhap UNIQUE (TenDangNhap)
  );
END;
GO

IF COL_LENGTH('dbo.NHAN_VIEN', 'SoDienThoai') IS NULL ALTER TABLE dbo.NHAN_VIEN ADD SoDienThoai varchar(20) NULL;
IF COL_LENGTH('dbo.NHAN_VIEN', 'DiaChi') IS NULL ALTER TABLE dbo.NHAN_VIEN ADD DiaChi nvarchar(300) NULL;
IF COL_LENGTH('dbo.NHAN_VIEN', 'NgaySinh') IS NULL ALTER TABLE dbo.NHAN_VIEN ADD NgaySinh date NULL;
IF COL_LENGTH('dbo.NHAN_VIEN', 'GioiTinh') IS NULL ALTER TABLE dbo.NHAN_VIEN ADD GioiTinh nvarchar(30) NULL;
IF COL_LENGTH('dbo.NHAN_VIEN', 'NgayVaoLam') IS NULL ALTER TABLE dbo.NHAN_VIEN ADD NgayVaoLam date NULL;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NHAN_VIEN WHERE TenDangNhap = 'admin')
BEGIN
  INSERT INTO dbo.NHAN_VIEN(MaNhanVien, HoTen, ChucVu, TenDangNhap, MatKhau, VaiTro, TrangThai, Email)
  VALUES
    (N'NV-01', N'Nguyễn Hoàng', N'Quản lý', 'admin', '123456', N'ADMIN', N'Rảnh', 'admin@ongvang.vn'),
    (N'NV-02', N'Phạm Huyền', N'Thu ngân', 'cashier', '123456', N'EMPLOYEE', N'Rảnh', 'cashier@ongvang.vn'),
    (N'NV-03', N'Đỗ Thanh', N'Phục vụ', 'server', '123456', N'EMPLOYEE', N'Nghỉ việc', 'server@ongvang.vn');
END;
GO

IF OBJECT_ID('dbo.VOUCHER', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VOUCHER (
    MaVoucher int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VOUCHER PRIMARY KEY,
    MaCode varchar(30) NOT NULL CONSTRAINT UX_VOUCHER_MaCode UNIQUE,
    TenVoucher nvarchar(200) NOT NULL,
    LoaiGiam nvarchar(50) NOT NULL,
    GiaTriGiam decimal(18,2) NOT NULL,
    DonToiThieu decimal(18,2) NOT NULL CONSTRAINT DF_VOUCHER_DonToiThieu DEFAULT 0,
    GiamToiDa decimal(18,2) NULL,
    SoLuong int NOT NULL CONSTRAINT DF_VOUCHER_SoLuong DEFAULT 0,
    NgayBatDau date NOT NULL CONSTRAINT DF_VOUCHER_NgayBatDau DEFAULT CAST(GETDATE() AS date),
    NgayKetThuc date NOT NULL,
    TrangThai nvarchar(50) NOT NULL CONSTRAINT DF_VOUCHER_TrangThai DEFAULT N'Hoạt động',
    NgayTao datetime2 NOT NULL CONSTRAINT DF_VOUCHER_NgayTao DEFAULT sysdatetime()
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.VOUCHER)
BEGIN
  INSERT INTO dbo.VOUCHER(MaCode, TenVoucher, LoaiGiam, GiaTriGiam, DonToiThieu, GiamToiDa, SoLuong, NgayBatDau, NgayKetThuc, TrangThai)
  VALUES
    (N'WELCOME10', N'Chào mừng 10%', N'Phần trăm', 10, 0, 200000, 100, CAST(GETDATE() AS date), DATEADD(day, 30, CAST(GETDATE() AS date)), N'Hoạt động'),
    (N'VIP20', N'VIP 200k', N'Tiền mặt', 200000, 0, 200000, 50, CAST(GETDATE() AS date), DATEADD(day, 60, CAST(GETDATE() AS date)), N'Hoạt động'),
    (N'DINNER5', N'Giảm 5%', N'Phần trăm', 5, 0, 100000, 75, CAST(GETDATE() AS date), DATEADD(day, 45, CAST(GETDATE() AS date)), N'Hoạt động');
END;
GO

IF OBJECT_ID('dbo.HOA_DON', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.HOA_DON (
    MaHoaDon int IDENTITY(1,1) NOT NULL CONSTRAINT PK_HOA_DON PRIMARY KEY,
    MaKH int NULL,
    MaBan int NULL,
    MaNV int NULL,
    NgayDat date NULL,
    NgayThanhToan datetime2 NULL,
    PhuongThucThanhToan nvarchar(100) NULL,
    SoNguoi int NULL,
    TongTien decimal(18,2) NOT NULL CONSTRAINT DF_HOA_DON_TongTien DEFAULT 0,
    TienGiam decimal(18,2) NOT NULL CONSTRAINT DF_HOA_DON_TienGiam DEFAULT 0,
    PhiDatBan decimal(18,2) NOT NULL CONSTRAINT DF_HOA_DON_PhiDatBan DEFAULT 0,
    ThanhTien decimal(18,2) NOT NULL CONSTRAINT DF_HOA_DON_ThanhTien DEFAULT 0,
    TrangThai nvarchar(60) NOT NULL CONSTRAINT DF_HOA_DON_TrangThai DEFAULT N'Chờ thanh toán',
    MaHoaDonCode varchar(30) NULL,
    MaVoucherCode varchar(30) NULL,
    NgayTao datetime2 NOT NULL CONSTRAINT DF_HOA_DON_NgayTao DEFAULT sysdatetime(),
    CONSTRAINT FK_HOA_DON_KHACH_HANG FOREIGN KEY (MaKH) REFERENCES dbo.KHACH_HANG(MaKH),
    CONSTRAINT FK_HOA_DON_BAN FOREIGN KEY (MaBan) REFERENCES dbo.BAN(MaBan),
    CONSTRAINT FK_HOA_DON_NHAN_VIEN FOREIGN KEY (MaNV) REFERENCES dbo.NHAN_VIEN(MaNV)
  );
END;
GO

IF COL_LENGTH('dbo.HOA_DON', 'MaHoaDonCode') IS NULL
BEGIN
  ALTER TABLE dbo.HOA_DON ADD MaHoaDonCode varchar(30) NULL;
END;
GO

IF COL_LENGTH('dbo.HOA_DON', 'MaVoucherCode') IS NULL
BEGIN
  ALTER TABLE dbo.HOA_DON ADD MaVoucherCode varchar(30) NULL;
END;
GO

IF EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.HOA_DON') AND name = 'MaBan' AND is_nullable = 0
)
BEGIN
  DECLARE @invoiceTableFk sysname;
  SELECT TOP 1 @invoiceTableFk = fk.name
  FROM sys.foreign_keys fk
  INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
  INNER JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
  WHERE fkc.parent_object_id = OBJECT_ID('dbo.HOA_DON') AND c.name = 'MaBan';

  IF @invoiceTableFk IS NOT NULL
  BEGIN
    DECLARE @dropInvoiceTableFkSql nvarchar(4000) = N'ALTER TABLE dbo.HOA_DON DROP CONSTRAINT ' + QUOTENAME(@invoiceTableFk);
    EXEC sp_executesql @dropInvoiceTableFkSql;
  END;

  ALTER TABLE dbo.HOA_DON ALTER COLUMN MaBan int NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_HOA_DON_BAN' AND parent_object_id = OBJECT_ID('dbo.HOA_DON'))
    ALTER TABLE dbo.HOA_DON ADD CONSTRAINT FK_HOA_DON_BAN FOREIGN KEY (MaBan) REFERENCES dbo.BAN(MaBan);
END;
GO

UPDATE dbo.HOA_DON
SET MaHoaDonCode = CONCAT('HD-', RIGHT(CONCAT('000000', CONVERT(varchar(12), MaHoaDon)), 6))
WHERE MaHoaDonCode IS NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.HOA_DON')
    AND name = 'UX_HOA_DON_MaHoaDonCode'
)
BEGIN
  CREATE UNIQUE INDEX UX_HOA_DON_MaHoaDonCode
    ON dbo.HOA_DON(MaHoaDonCode)
    WHERE MaHoaDonCode IS NOT NULL;
END;
GO

IF OBJECT_ID('dbo.CHI_TIET_HOA_DON', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.CHI_TIET_HOA_DON (
    MaCTHD int IDENTITY(1,1) NOT NULL CONSTRAINT PK_CHI_TIET_HOA_DON PRIMARY KEY,
    MaHoaDon int NOT NULL,
    MaMon int NULL,
    MaDoUong int NULL,
    SoLuong int NOT NULL CONSTRAINT DF_CHI_TIET_HOA_DON_SoLuong DEFAULT 1,
    DonGia decimal(18,2) NOT NULL CONSTRAINT DF_CHI_TIET_HOA_DON_DonGia DEFAULT 0,
    GhiChu nvarchar(255) NULL,
    NgayTao datetime2 NOT NULL CONSTRAINT DF_CHI_TIET_HOA_DON_NgayTao DEFAULT sysdatetime(),
    CONSTRAINT FK_CTHD_HOA_DON FOREIGN KEY (MaHoaDon) REFERENCES dbo.HOA_DON(MaHoaDon) ON DELETE CASCADE,
    CONSTRAINT FK_CTHD_MON_AN FOREIGN KEY (MaMon) REFERENCES dbo.MON_AN(MaMon),
    CONSTRAINT FK_CTHD_DO_UONG FOREIGN KEY (MaDoUong) REFERENCES dbo.DO_UONG(MaDoUong),
    CONSTRAINT CK_CTHD_SoLuong CHECK (SoLuong > 0)
  );
END;
GO

IF OBJECT_ID('dbo.DAT_BAN', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.DAT_BAN (
    MaDatBan int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DAT_BAN PRIMARY KEY,
    MaBan int NOT NULL,
    MaKH int NULL,
    TenKhachHang nvarchar(200) NOT NULL,
    NgayDat date NOT NULL,
    GioDat time(0) NOT NULL,
    SoNguoi int NOT NULL,
    TrangThai nvarchar(60) NOT NULL CONSTRAINT DF_DAT_BAN_TrangThai DEFAULT N'Đã xác nhận',
    NgayTao datetime2 NOT NULL CONSTRAINT DF_DAT_BAN_NgayTao DEFAULT sysdatetime(),
    CONSTRAINT FK_DAT_BAN_BAN FOREIGN KEY (MaBan) REFERENCES dbo.BAN(MaBan),
    CONSTRAINT FK_DAT_BAN_KHACH_HANG FOREIGN KEY (MaKH) REFERENCES dbo.KHACH_HANG(MaKH),
    CONSTRAINT CK_DAT_BAN_SoNguoi CHECK (SoNguoi > 0)
  );

  CREATE INDEX IX_DAT_BAN_NgayDat ON dbo.DAT_BAN(NgayDat, MaBan);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DAT_BAN)
BEGIN
  INSERT INTO dbo.DAT_BAN(MaBan, MaKH, TenKhachHang, NgayDat, GioDat, SoNguoi, TrangThai)
  SELECT b.MaBan,
         kh.MaKH,
         COALESCE(kh.HoTen, N'Khách vãng lai'),
         CAST(GETDATE() AS date),
         CAST('19:00:00' AS time),
         4,
         N'Đã xác nhận'
  FROM dbo.BAN b
  LEFT JOIN dbo.KHACH_HANG kh ON kh.HoTen = N'Nguyễn Văn A'
  WHERE b.TenBan = N'Bàn 02';
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.DAT_BAN') AND name = 'IX_DAT_BAN_NgayDat')
BEGIN
  CREATE INDEX IX_DAT_BAN_NgayDat ON dbo.DAT_BAN(NgayDat, MaBan);
END;
GO
