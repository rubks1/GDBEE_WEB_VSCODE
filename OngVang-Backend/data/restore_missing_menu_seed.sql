INSERT dbo.MON_AN(TenMon,DonViTinh,DonGia,TrangThai)
SELECT seed.TenMon,seed.DonViTinh,seed.DonGia,seed.TrangThai
FROM (VALUES
  (N'Cơm rang hải sản',N'Đĩa',85000,N'Còn bán'),
  (N'Bò lúc lắc',N'Đĩa',160000,N'Còn bán'),
  (N'Gà chiên nước mắm',N'Đĩa',140000,N'Còn bán'),
  (N'Lẩu Thái',N'Nồi',350000,N'Còn bán'),
  (N'Cá hồi sốt bơ',N'Đĩa',220000,N'Còn bán'),
  (N'Sườn nướng BBQ',N'Đĩa',180000,N'Còn bán'),
  (N'Canh chua cá',N'Tô',90000,N'Còn bán'),
  (N'Rau xào thập cẩm',N'Đĩa',60000,N'Còn bán'),
  (N'Mực chiên xù',N'Đĩa',150000,N'Còn bán'),
  (N'Cơm trắng',N'Bát',10000,N'Còn bán'),
  (N'Salad Nga',N'Đĩa',70000,N'Hết món'),
  (N'Khoai tây chiên',N'Đĩa',50000,N'Còn bán')
) AS seed(TenMon,DonViTinh,DonGia,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM dbo.MON_AN existing WHERE existing.TenMon=seed.TenMon);

INSERT dbo.DO_UONG(TenDoUong,DonViTinh,DonGia,TrangThai)
SELECT seed.TenDoUong,seed.DonViTinh,seed.DonGia,seed.TrangThai
FROM (VALUES
  (N'Coca Cola',N'Lon',20000,N'Còn bán'),
  (N'Pepsi',N'Lon',20000,N'Còn bán'),
  (N'7Up',N'Lon',20000,N'Còn bán'),
  (N'Nước suối',N'Chai',10000,N'Còn bán'),
  (N'Cam ép',N'Ly',35000,N'Còn bán'),
  (N'Chanh dây',N'Ly',30000,N'Còn bán'),
  (N'Trà đào',N'Ly',40000,N'Còn bán'),
  (N'Cà phê sữa',N'Ly',30000,N'Còn bán'),
  (N'Bia Tiger',N'Lon',25000,N'Còn bán'),
  (N'Bia Heineken',N'Lon',30000,N'Hết hàng')
) AS seed(TenDoUong,DonViTinh,DonGia,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM dbo.DO_UONG existing WHERE existing.TenDoUong=seed.TenDoUong);
