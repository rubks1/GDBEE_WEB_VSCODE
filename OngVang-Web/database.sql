/*
  Golden Bee Restaurant Management
  Database: Microsoft SQL Server 2019+

  Run this file in SQL Server Management Studio or with sqlcmd.
  Application passwords must be stored as server-generated password hashes
  (for example, BCrypt or Argon2); this script intentionally inserts no
  plaintext demo credentials.
*/

IF DB_ID(N'QL_NHA_HANG') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [QL_NHA_HANG]');
END;
GO

USE [QL_NHA_HANG];
GO

/* Staff records are separate from login accounts. */
IF OBJECT_ID(N'dbo.employees', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.employees
    (
        employee_id       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_employees PRIMARY KEY,
        employee_code     NVARCHAR(20) NOT NULL,
        full_name         NVARCHAR(150) NOT NULL,
        position_name     NVARCHAR(100) NOT NULL CONSTRAINT DF_employees_position DEFAULT (N'Nhân viên'),
        phone             NVARCHAR(30) NULL,
        email             NVARCHAR(254) NULL,
        employment_status NVARCHAR(20) NOT NULL CONSTRAINT DF_employees_status DEFAULT (N'active'),
        hired_at          DATE NULL,
        created_at        DATETIME2(0) NOT NULL CONSTRAINT DF_employees_created DEFAULT (SYSUTCDATETIME()),
        updated_at        DATETIME2(0) NOT NULL CONSTRAINT DF_employees_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_employees_code UNIQUE (employee_code),
        CONSTRAINT CK_employees_status CHECK (employment_status IN (N'active', N'off'))
    );
END;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users
    (
        user_id        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
        username       NVARCHAR(80) NOT NULL,
        password_hash  NVARCHAR(255) NOT NULL,
        display_name   NVARCHAR(150) NOT NULL,
        role_name      NVARCHAR(20) NOT NULL,
        employee_id    INT NULL,
        is_active      BIT NOT NULL CONSTRAINT DF_users_active DEFAULT (1),
        last_login_at  DATETIME2(0) NULL,
        created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_users_created DEFAULT (SYSUTCDATETIME()),
        updated_at     DATETIME2(0) NOT NULL CONSTRAINT DF_users_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_users_username UNIQUE (username),
        CONSTRAINT CK_users_role CHECK (role_name IN (N'admin', N'employee')),
        CONSTRAINT FK_users_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(employee_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_users_employee_id' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE UNIQUE INDEX UX_users_employee_id ON dbo.users(employee_id) WHERE employee_id IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.user_preferences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_preferences
    (
        user_id          INT NOT NULL CONSTRAINT PK_user_preferences PRIMARY KEY,
        dark_mode        BIT NOT NULL CONSTRAINT DF_user_preferences_dark DEFAULT (0),
        compact_mode     BIT NOT NULL CONSTRAINT DF_user_preferences_compact DEFAULT (0),
        order_alerts     BIT NOT NULL CONSTRAINT DF_user_preferences_order_alerts DEFAULT (1),
        booking_alerts   BIT NOT NULL CONSTRAINT DF_user_preferences_booking_alerts DEFAULT (1),
        updated_at       DATETIME2(0) NOT NULL CONSTRAINT DF_user_preferences_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_user_preferences_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.customers
    (
        customer_id   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_customers PRIMARY KEY,
        full_name     NVARCHAR(150) NOT NULL,
        phone         NVARCHAR(30) NULL,
        email         NVARCHAR(254) NULL,
        notes         NVARCHAR(1000) NULL,
        created_at    DATETIME2(0) NOT NULL CONSTRAINT DF_customers_created DEFAULT (SYSUTCDATETIME()),
        updated_at    DATETIME2(0) NOT NULL CONSTRAINT DF_customers_updated DEFAULT (SYSUTCDATETIME())
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_customers_phone' AND object_id = OBJECT_ID(N'dbo.customers'))
    CREATE UNIQUE INDEX UX_customers_phone ON dbo.customers(phone) WHERE phone IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.menu_categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.menu_categories
    (
        category_id   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_menu_categories PRIMARY KEY,
        category_name NVARCHAR(80) NOT NULL,
        is_active     BIT NOT NULL CONSTRAINT DF_menu_categories_active DEFAULT (1),
        sort_order    INT NOT NULL CONSTRAINT DF_menu_categories_sort DEFAULT (0),
        CONSTRAINT UQ_menu_categories_name UNIQUE (category_name)
    );
END;
GO

IF OBJECT_ID(N'dbo.menu_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.menu_items
    (
        menu_item_id  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_menu_items PRIMARY KEY,
        category_id   INT NOT NULL,
        item_name     NVARCHAR(150) NOT NULL,
        description   NVARCHAR(1000) NULL,
        price         DECIMAL(18,2) NOT NULL,
        image_url     NVARCHAR(1000) NULL,
        item_status   NVARCHAR(20) NOT NULL CONSTRAINT DF_menu_items_status DEFAULT (N'available'),
        created_at    DATETIME2(0) NOT NULL CONSTRAINT DF_menu_items_created DEFAULT (SYSUTCDATETIME()),
        updated_at    DATETIME2(0) NOT NULL CONSTRAINT DF_menu_items_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_menu_items_category_name UNIQUE (category_id, item_name),
        CONSTRAINT CK_menu_items_price CHECK (price >= 0),
        CONSTRAINT CK_menu_items_status CHECK (item_status IN (N'available', N'unavailable')),
        CONSTRAINT FK_menu_items_category FOREIGN KEY (category_id) REFERENCES dbo.menu_categories(category_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_menu_items_category_status' AND object_id = OBJECT_ID(N'dbo.menu_items'))
    CREATE INDEX IX_menu_items_category_status ON dbo.menu_items(category_id, item_status) INCLUDE (item_name, price);
GO

IF OBJECT_ID(N'dbo.dining_tables', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.dining_tables
    (
        table_id      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dining_tables PRIMARY KEY,
        table_name    NVARCHAR(50) NOT NULL,
        capacity      INT NOT NULL,
        area_name     NVARCHAR(100) NOT NULL CONSTRAINT DF_dining_tables_area DEFAULT (N'Trong nhà'),
        table_status  NVARCHAR(20) NOT NULL CONSTRAINT DF_dining_tables_status DEFAULT (N'available'),
        created_at    DATETIME2(0) NOT NULL CONSTRAINT DF_dining_tables_created DEFAULT (SYSUTCDATETIME()),
        updated_at    DATETIME2(0) NOT NULL CONSTRAINT DF_dining_tables_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_dining_tables_name UNIQUE (table_name),
        CONSTRAINT CK_dining_tables_capacity CHECK (capacity > 0),
        CONSTRAINT CK_dining_tables_status CHECK (table_status IN (N'available', N'occupied', N'reserved', N'maintenance'))
    );
END;
GO

IF OBJECT_ID(N'dbo.vouchers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.vouchers
    (
        voucher_id       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_vouchers PRIMARY KEY,
        voucher_code     NVARCHAR(50) NOT NULL,
        discount_type    NVARCHAR(20) NOT NULL,
        discount_value   DECIMAL(18,2) NOT NULL,
        minimum_spend    DECIMAL(18,2) NOT NULL CONSTRAINT DF_vouchers_minimum DEFAULT (0),
        maximum_discount DECIMAL(18,2) NULL,
        valid_from       DATETIME2(0) NULL,
        valid_until      DATETIME2(0) NULL,
        usage_limit      INT NULL,
        usage_count      INT NOT NULL CONSTRAINT DF_vouchers_usage DEFAULT (0),
        is_active        BIT NOT NULL CONSTRAINT DF_vouchers_active DEFAULT (1),
        created_at       DATETIME2(0) NOT NULL CONSTRAINT DF_vouchers_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_vouchers_code UNIQUE (voucher_code),
        CONSTRAINT CK_vouchers_type CHECK (discount_type IN (N'percent', N'fixed')),
        CONSTRAINT CK_vouchers_value CHECK
            (discount_value >= 0 AND (discount_type <> N'percent' OR discount_value <= 100)),
        CONSTRAINT CK_vouchers_amounts CHECK (minimum_spend >= 0 AND (maximum_discount IS NULL OR maximum_discount >= 0)),
        CONSTRAINT CK_vouchers_usage CHECK (usage_count >= 0 AND (usage_limit IS NULL OR usage_limit >= 0)),
        CONSTRAINT CK_vouchers_validity CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
    );
END;
GO

IF OBJECT_ID(N'dbo.bookings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.bookings
    (
        booking_id     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bookings PRIMARY KEY,
        customer_id    INT NOT NULL,
        table_id       INT NOT NULL,
        booking_date   DATE NOT NULL,
        booking_time   TIME(0) NOT NULL,
        guest_count    INT NOT NULL,
        booking_status NVARCHAR(20) NOT NULL CONSTRAINT DF_bookings_status DEFAULT (N'confirmed'),
        notes          NVARCHAR(1000) NULL,
        created_by     INT NULL,
        created_at     DATETIME2(0) NOT NULL CONSTRAINT DF_bookings_created DEFAULT (SYSUTCDATETIME()),
        updated_at     DATETIME2(0) NOT NULL CONSTRAINT DF_bookings_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_bookings_guests CHECK (guest_count > 0),
        CONSTRAINT CK_bookings_status CHECK (booking_status IN (N'pending', N'confirmed', N'cancelled', N'completed', N'no_show')),
        CONSTRAINT FK_bookings_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
        CONSTRAINT FK_bookings_table FOREIGN KEY (table_id) REFERENCES dbo.dining_tables(table_id),
        CONSTRAINT FK_bookings_user FOREIGN KEY (created_by) REFERENCES dbo.users(user_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_bookings_date_status' AND object_id = OBJECT_ID(N'dbo.bookings'))
    CREATE INDEX IX_bookings_date_status ON dbo.bookings(booking_date, booking_status) INCLUDE (table_id, customer_id, booking_time, guest_count);
GO

IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.invoices
    (
        invoice_id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_invoices PRIMARY KEY,
        invoice_code        NVARCHAR(50) NOT NULL,
        customer_id         INT NULL,
        customer_name       NVARCHAR(150) NOT NULL CONSTRAINT DF_invoices_customer DEFAULT (N'Khách lẻ'),
        table_id            INT NULL,
        table_name          NVARCHAR(50) NULL,
        employee_id         INT NULL,
        employee_name       NVARCHAR(150) NULL,
        order_type          NVARCHAR(30) NOT NULL CONSTRAINT DF_invoices_order_type DEFAULT (N'Dùng tại bàn'),
        payment_method      NVARCHAR(30) NULL,
        invoice_status      NVARCHAR(20) NOT NULL CONSTRAINT DF_invoices_status DEFAULT (N'pending'),
        subtotal            DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_subtotal DEFAULT (0),
        discount_amount     DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_discount DEFAULT (0),
        service_charge      DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_service DEFAULT (0),
        total_amount        DECIMAL(18,2) NOT NULL CONSTRAINT DF_invoices_total DEFAULT (0),
        voucher_id          INT NULL,
        issued_at           DATETIME2(0) NOT NULL CONSTRAINT DF_invoices_issued DEFAULT (SYSUTCDATETIME()),
        paid_at             DATETIME2(0) NULL,
        notes               NVARCHAR(1000) NULL,
        created_at          DATETIME2(0) NOT NULL CONSTRAINT DF_invoices_created DEFAULT (SYSUTCDATETIME()),
        updated_at          DATETIME2(0) NOT NULL CONSTRAINT DF_invoices_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_invoices_code UNIQUE (invoice_code),
        CONSTRAINT CK_invoices_order_type CHECK (order_type IN (N'Dùng tại bàn', N'Mang đi')),
        CONSTRAINT CK_invoices_payment_method CHECK (payment_method IS NULL OR payment_method IN (N'Tiền mặt', N'Chuyển khoản', N'Thẻ')),
        CONSTRAINT CK_invoices_status CHECK (invoice_status IN (N'paid', N'pending', N'serving', N'cancelled')),
        CONSTRAINT CK_invoices_amounts CHECK (subtotal >= 0 AND discount_amount >= 0 AND service_charge >= 0 AND total_amount >= 0),
        CONSTRAINT FK_invoices_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
        CONSTRAINT FK_invoices_table FOREIGN KEY (table_id) REFERENCES dbo.dining_tables(table_id),
        CONSTRAINT FK_invoices_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(employee_id),
        CONSTRAINT FK_invoices_voucher FOREIGN KEY (voucher_id) REFERENCES dbo.vouchers(voucher_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_invoices_issued_status' AND object_id = OBJECT_ID(N'dbo.invoices'))
    CREATE INDEX IX_invoices_issued_status ON dbo.invoices(issued_at DESC, invoice_status) INCLUDE (invoice_code, customer_name, total_amount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_invoices_customer' AND object_id = OBJECT_ID(N'dbo.invoices'))
    CREATE INDEX IX_invoices_customer ON dbo.invoices(customer_id, issued_at DESC);
GO

IF OBJECT_ID(N'dbo.invoice_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.invoice_items
    (
        invoice_item_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_invoice_items PRIMARY KEY,
        invoice_id      BIGINT NOT NULL,
        menu_item_id    INT NULL,
        item_name       NVARCHAR(150) NOT NULL,
        quantity        INT NOT NULL,
        unit_price      DECIMAL(18,2) NOT NULL,
        line_total      DECIMAL(18,2) NOT NULL,
        created_at      DATETIME2(0) NOT NULL CONSTRAINT DF_invoice_items_created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_invoice_items_values CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0),
        CONSTRAINT FK_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES dbo.invoices(invoice_id) ON DELETE CASCADE,
        CONSTRAINT FK_invoice_items_menu FOREIGN KEY (menu_item_id) REFERENCES dbo.menu_items(menu_item_id) ON DELETE SET NULL
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_invoice_items_invoice' AND object_id = OBJECT_ID(N'dbo.invoice_items'))
    CREATE INDEX IX_invoice_items_invoice ON dbo.invoice_items(invoice_id);
GO

IF OBJECT_ID(N'dbo.restaurant_settings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.restaurant_settings
    (
        settings_id          TINYINT NOT NULL CONSTRAINT PK_restaurant_settings PRIMARY KEY,
        restaurant_name      NVARCHAR(150) NOT NULL,
        restaurant_phone     NVARCHAR(30) NULL,
        restaurant_email     NVARCHAR(254) NULL,
        restaurant_address   NVARCHAR(300) NULL,
        service_charge_rate  DECIMAL(5,2) NOT NULL CONSTRAINT DF_restaurant_settings_service DEFAULT (0),
        receipt_note          NVARCHAR(500) NULL,
        order_alerts_enabled  BIT NOT NULL CONSTRAINT DF_restaurant_settings_order_alerts DEFAULT (1),
        booking_alerts_enabled BIT NOT NULL CONSTRAINT DF_restaurant_settings_booking_alerts DEFAULT (1),
        updated_at            DATETIME2(0) NOT NULL CONSTRAINT DF_restaurant_settings_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_restaurant_settings_singleton CHECK (settings_id = 1),
        CONSTRAINT CK_restaurant_settings_service CHECK (service_charge_rate >= 0 AND service_charge_rate <= 100)
    );
END;
GO

IF OBJECT_ID(N'dbo.support_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.support_requests
    (
        support_request_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_support_requests PRIMARY KEY,
        request_code       NVARCHAR(40) NOT NULL,
        user_id            INT NULL,
        topic              NVARCHAR(100) NOT NULL,
        contact_email      NVARCHAR(254) NOT NULL,
        message            NVARCHAR(MAX) NOT NULL,
        request_status     NVARCHAR(20) NOT NULL CONSTRAINT DF_support_requests_status DEFAULT (N'open'),
        staff_response     NVARCHAR(MAX) NULL,
        created_at         DATETIME2(0) NOT NULL CONSTRAINT DF_support_requests_created DEFAULT (SYSUTCDATETIME()),
        updated_at         DATETIME2(0) NOT NULL CONSTRAINT DF_support_requests_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_support_requests_code UNIQUE (request_code),
        CONSTRAINT CK_support_requests_status CHECK (request_status IN (N'open', N'in_progress', N'resolved', N'closed')),
        CONSTRAINT FK_support_requests_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_support_requests_status_created' AND object_id = OBJECT_ID(N'dbo.support_requests'))
    CREATE INDEX IX_support_requests_status_created ON dbo.support_requests(request_status, created_at DESC);
GO

IF OBJECT_ID(N'dbo.help_articles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.help_articles
    (
        help_article_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_help_articles PRIMARY KEY,
        topic           NVARCHAR(100) NOT NULL,
        question        NVARCHAR(300) NOT NULL,
        answer          NVARCHAR(MAX) NOT NULL,
        search_keywords NVARCHAR(500) NULL,
        sort_order      INT NOT NULL CONSTRAINT DF_help_articles_sort DEFAULT (0),
        is_published    BIT NOT NULL CONSTRAINT DF_help_articles_published DEFAULT (1),
        created_at      DATETIME2(0) NOT NULL CONSTRAINT DF_help_articles_created DEFAULT (SYSUTCDATETIME()),
        updated_at      DATETIME2(0) NOT NULL CONSTRAINT DF_help_articles_updated DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT UQ_help_articles_question UNIQUE (question)
    );
END;
GO

/* Seed records used by the current screens and mock data. */
IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE employee_code = N'NV-01')
    INSERT INTO dbo.employees (employee_code, full_name, position_name, employment_status)
    VALUES (N'NV-01', N'Nguyễn Hoàng', N'Quản lý', N'active');
IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE employee_code = N'NV-02')
    INSERT INTO dbo.employees (employee_code, full_name, position_name, employment_status)
    VALUES (N'NV-02', N'Phạm Huyền', N'Thu ngân', N'active');
IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE employee_code = N'NV-03')
    INSERT INTO dbo.employees (employee_code, full_name, position_name, employment_status)
    VALUES (N'NV-03', N'Đỗ Thanh', N'Phục vụ', N'off');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE phone = N'0901234567')
    INSERT INTO dbo.customers (full_name, phone, email) VALUES (N'Nguyễn Văn A', N'0901234567', N'a@gmail.com');
IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE phone = N'0907654321')
    INSERT INTO dbo.customers (full_name, phone, email) VALUES (N'Trần Thị B', N'0907654321', N'b@gmail.com');
IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE phone = N'0988123456')
    INSERT INTO dbo.customers (full_name, phone, email) VALUES (N'Lê Hoàng C', N'0988123456', N'c@gmail.com');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.menu_categories WHERE category_name = N'Món ăn')
    INSERT INTO dbo.menu_categories (category_name, sort_order) VALUES (N'Món ăn', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.menu_categories WHERE category_name = N'Đồ uống')
    INSERT INTO dbo.menu_categories (category_name, sort_order) VALUES (N'Đồ uống', 2);

IF NOT EXISTS (SELECT 1 FROM dbo.menu_items WHERE item_name = N'Phở bò')
    INSERT INTO dbo.menu_items (category_id, item_name, price)
    SELECT category_id, N'Phở bò', 55000 FROM dbo.menu_categories WHERE category_name = N'Món ăn';
IF NOT EXISTS (SELECT 1 FROM dbo.menu_items WHERE item_name = N'Cơm gà')
    INSERT INTO dbo.menu_items (category_id, item_name, price)
    SELECT category_id, N'Cơm gà', 65000 FROM dbo.menu_categories WHERE category_name = N'Món ăn';
IF NOT EXISTS (SELECT 1 FROM dbo.menu_items WHERE item_name = N'Salad')
    INSERT INTO dbo.menu_items (category_id, item_name, price)
    SELECT category_id, N'Salad', 48000 FROM dbo.menu_categories WHERE category_name = N'Món ăn';
IF NOT EXISTS (SELECT 1 FROM dbo.menu_items WHERE item_name = N'Trà đào')
    INSERT INTO dbo.menu_items (category_id, item_name, price)
    SELECT category_id, N'Trà đào', 30000 FROM dbo.menu_categories WHERE category_name = N'Đồ uống';
IF NOT EXISTS (SELECT 1 FROM dbo.menu_items WHERE item_name = N'Mojito')
    INSERT INTO dbo.menu_items (category_id, item_name, price)
    SELECT category_id, N'Mojito', 45000 FROM dbo.menu_categories WHERE category_name = N'Đồ uống';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 01')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 01', 4, N'Trong nhà', N'available');
IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 02')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 02', 6, N'Trong nhà', N'occupied');
IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 03')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 03', 8, N'Sân vườn', N'reserved');
IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 04')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 04', 4, N'Trong nhà', N'available');
IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 05')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 05', 2, N'Phòng VIP', N'maintenance');
IF NOT EXISTS (SELECT 1 FROM dbo.dining_tables WHERE table_name = N'Bàn 06')
    INSERT INTO dbo.dining_tables (table_name, capacity, area_name, table_status) VALUES (N'Bàn 06', 4, N'Sân vườn', N'maintenance');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.vouchers WHERE voucher_code = N'WELCOME10')
    INSERT INTO dbo.vouchers (voucher_code, discount_type, discount_value) VALUES (N'WELCOME10', N'percent', 10);
IF NOT EXISTS (SELECT 1 FROM dbo.vouchers WHERE voucher_code = N'VIP20')
    INSERT INTO dbo.vouchers (voucher_code, discount_type, discount_value) VALUES (N'VIP20', N'fixed', 200000);
IF NOT EXISTS (SELECT 1 FROM dbo.vouchers WHERE voucher_code = N'DINNER5')
    INSERT INTO dbo.vouchers (voucher_code, discount_type, discount_value) VALUES (N'DINNER5', N'percent', 5);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.restaurant_settings WHERE settings_id = 1)
BEGIN
    INSERT INTO dbo.restaurant_settings
        (settings_id, restaurant_name, restaurant_phone, restaurant_email, restaurant_address, service_charge_rate, receipt_note)
    VALUES
        (1, N'Golden Bee Restaurant', N'0978 123 456', N'info@goldenbee.vn',
         N'12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', 0, N'Cảm ơn quý khách!');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Làm thế nào để tạo một lượt đặt bàn?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Đặt bàn', N'Làm thế nào để tạo một lượt đặt bàn?',
        N'Mở “Bàn & đặt chỗ”, chọn khu vực và bàn còn trống phù hợp sức chứa, sau đó nhập khách, ngày, giờ và số người để xác nhận.',
        N'đặt bàn khu vực sức chứa khách hàng', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Tôi thêm món và thanh toán ở đâu?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Hóa đơn', N'Tôi thêm món và thanh toán ở đâu?',
        N'Vào “Gọi món”, tìm món hoặc lọc theo danh mục, điều chỉnh số lượng trong giỏ rồi chọn loại đơn và phương thức thanh toán.',
        N'gọi món thanh toán hóa đơn giỏ hàng', 2);
IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Tra cứu hóa đơn đã tạo như thế nào?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Hóa đơn', N'Tra cứu hóa đơn đã tạo như thế nào?',
        N'Mở “Hóa đơn”, tìm theo mã hoặc tên khách hàng, dùng bộ lọc trạng thái và chọn “Chi tiết” để xem món cùng tổng tiền.',
        N'lịch sử hóa đơn tra cứu khách hàng trạng thái', 3);
IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Tôi cập nhật món ăn hoặc thông tin danh mục ở đâu?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Thực đơn', N'Tôi cập nhật món ăn hoặc thông tin danh mục ở đâu?',
        N'Trong “Danh mục & nhân sự”, chọn loại dữ liệu, nhấn “Sửa” ở mục cần cập nhật hoặc “Thêm mục” để tạo bản ghi mới.',
        N'menu món ăn sửa danh mục giá nhân viên voucher', 4);
IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Làm sao bật giao diện tối?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Cài đặt', N'Làm sao bật giao diện tối?',
        N'Bật “Chế độ tối” trong Cài đặt. Tuỳ chọn giao diện có thể lưu theo tài khoản hoặc thiết bị tùy cách cấu hình backend.',
        N'dark mode giao diện tối cài đặt tùy chọn', 5);
IF NOT EXISTS (SELECT 1 FROM dbo.help_articles WHERE question = N'Dữ liệu hiện được lưu ở đâu?')
    INSERT INTO dbo.help_articles (topic, question, answer, search_keywords, sort_order)
    VALUES (N'Hệ thống', N'Dữ liệu hiện được lưu ở đâu?',
        N'Khi cấu hình backend, dữ liệu nghiệp vụ được lưu trong cơ sở dữ liệu nhà hàng; các tùy chọn giao diện có thể lưu riêng theo người dùng.',
        N'dữ liệu database api lưu trình duyệt', 6);
GO
