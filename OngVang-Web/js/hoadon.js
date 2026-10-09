let menuItems = [];
let orderTables = [];
let orderBookings = [];

function escapePosText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
const menuImages = {
  'Phở bò': '../assets/images/Home/bo.jpg',
  'Cơm gà': '../assets/images/Home/bbq.jpg',
  Salad: '../assets/images/Home/salad.jpg',
  'Trà đào': '../assets/images/Home/tradao.jpg'
};

function formatCurrency(amount) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function buildCheckoutSummary(cartItems, invoiceMeta) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const total = subtotal - Number(invoiceMeta.discount || 0);
  const lines = cartItems.length
    ? cartItems.map((item) => `
        <li>
          <span>${escapePosText(item.name)} x${item.qty}</span>
          <strong>${formatCurrency(item.qty * item.price)}</strong>
        </li>
      `).join('')
    : '<li>Chưa có món nào trong hóa đơn.</li>';

  return `
    <div class="checkout-summary">
      <div class="checkout-summary-top">
        <span class="summary-pill">${escapePosText(invoiceMeta.orderType)}</span>
        <span class="summary-badge">${escapePosText(invoiceMeta.paymentMethod)}</span>
        <span class="summary-badge">${escapePosText(invoiceMeta.paymentStatus)}</span>
      </div>
      <div class="checkout-summary-meta">
        <div><label>Khách hàng</label><strong>${escapePosText(invoiceMeta.customer)}</strong></div>
        <div><label>Bàn</label><strong>${escapePosText(invoiceMeta.table)}</strong></div>
      </div>
      <ul class="checkout-summary-list">${lines}</ul>
      ${invoiceMeta.voucherCode ? `<div class="receipt-row"><span>Voucher ${escapePosText(invoiceMeta.voucherCode)}</span><strong>−${formatCurrency(Number(invoiceMeta.discount || 0))}</strong></div>` : ''}
      <div class="checkout-summary-total">
        <span>Tổng thanh toán</span>
        <strong>${formatCurrency(total)}</strong>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Hóa đơn', 'Gọi món, kiểm tra đơn hàng và thanh toán');
  window.OngVangApp?.setActiveNav?.('hoadon');

  const cart = [];
  const menuList = document.querySelector('#menuList');
  const cartItems = document.querySelector('#cartItems');
  const checkoutButton = document.querySelector('#invoiceCheckout');
  const loyaltyCodeInput = document.querySelector('#invoiceLoyaltyCode');
  const loyaltyMessage = document.querySelector('#invoiceLoyaltyMessage');
  loyaltyCodeInput?.addEventListener('blur', async () => {
    const code = loyaltyCodeInput.value.trim().toUpperCase();
    loyaltyCodeInput.value = code;
    if (!code) {
      if (loyaltyMessage) loyaltyMessage.textContent = '';
      return;
    }
    if (!/^[A-Z]{2}-\d{10}$/.test(code)) {
      if (loyaltyMessage) loyaltyMessage.textContent = 'Mã cần có dạng AA-0123456789.';
      return;
    }
    try {
      const member = await window.OngVangApp.apiRequest(`/api/loyalty-cards/${encodeURIComponent(code)}`);
      document.querySelector('#invoiceCustomer').value = member.name;
      if (loyaltyMessage) loyaltyMessage.textContent = `Đã nhận diện khách hàng ${member.name}.`;
    } catch (error) {
      if (loyaltyMessage) loyaltyMessage.textContent = error.message || 'Không tìm thấy mã thành viên.';
    }
  });
  let appliedVoucher = null;
  let activeCategory = 'Tất cả';

  const renderMenu = (query = '', category = activeCategory) => {
    if (!menuList) return;
    const filtered = menuItems.filter((item) => {
      const matchesSearch = `${item.name} ${item.category}`.toLowerCase().includes(query);
      return matchesSearch && (category === 'Tất cả' || item.category === category);
    });
    menuList.innerHTML = filtered.length
      ? filtered.map((item) => `
          <article class="menu-item">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy" />` : '<span class="menu-item-image-placeholder" aria-hidden="true"><i class="fa-solid fa-utensils"></i></span>'}
            <div class="menu-item-copy"><span>${item.name}</span><small>${item.category}</small><strong>${formatCurrency(item.price)}</strong></div>
            <button type="button" data-add-item="${item.name}" aria-label="Thêm ${item.name}">+</button>
          </article>
        `).join('')
      : '<p class="empty-cart">Không tìm thấy món phù hợp.</p>';
  };

  const renderCart = () => {
    if (!cartItems) return;
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    let discount = 0;
    if (appliedVoucher && subtotal >= Number(appliedVoucher.minimumOrder || 0)) {
      discount = appliedVoucher.discountType === 'percent'
        ? subtotal * Number(appliedVoucher.discountValue) / 100
        : Number(appliedVoucher.discountValue);
      if (appliedVoucher.maximumDiscount !== null && appliedVoucher.maximumDiscount !== undefined) {
        discount = Math.min(discount, Number(appliedVoucher.maximumDiscount));
      }
      discount = Math.min(Math.max(Math.round(discount), 0), subtotal);
    }
    const total = subtotal - discount;
    cartItems.innerHTML = cart.length
      ? cart.map((item, index) => `
          <div class="cart-line">
            <div class="cart-line-info">
              <strong>${item.name}</strong>
              <small>${formatCurrency(item.price)} / món</small>
            </div>
            <div class="quantity-control">
              <button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Giảm ${item.name}">−</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-action="increase" data-index="${index}" aria-label="Tăng ${item.name}">+</button>
            </div>
            <strong>${formatCurrency(item.qty * item.price)}</strong>
          </div>
        `).join('')
      : '<p class="empty-cart">Chưa có món trong hóa đơn.</p>';

    const subtotalElement = document.querySelector('#cartSubtotal');
    if (subtotalElement) subtotalElement.textContent = formatCurrency(subtotal);
    const discountElement = document.querySelector('#cartDiscount');
    if (discountElement) discountElement.textContent = discount ? `−${formatCurrency(discount)}` : formatCurrency(0);
    const voucherMessage = document.querySelector('#invoiceVoucherMessage');
    if (voucherMessage && appliedVoucher) {
      voucherMessage.textContent = subtotal < Number(appliedVoucher.minimumOrder || 0)
        ? `Chưa đạt mức tối thiểu ${formatCurrency(Number(appliedVoucher.minimumOrder || 0))}.`
        : `${appliedVoucher.code} đang giảm ${formatCurrency(discount)}.`;
    }
    const totalElement = document.querySelector('#cartTotal');
    if (totalElement) totalElement.textContent = formatCurrency(total);
    const countElement = document.querySelector('#cartItemCount');
    if (countElement) countElement.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
    if (checkoutButton) checkoutButton.disabled = cart.length === 0;
  };

  const loadMenu = async () => {
    try {
      const [menu, tables, customers, bookings] = await Promise.all([
        window.OngVangApp.apiRequest('/api/menu'),
        window.OngVangApp.apiRequest('/api/tables'),
        window.OngVangApp.apiRequest('/api/customers'),
        window.OngVangApp.apiRequest('/api/bookings')
      ]);
      menuItems = menu
        .filter((item) => item.status !== 'unavailable')
        .map((item) => ({ ...item, image: menuImages[item.name] || '' }));
      orderTables = tables;
      orderBookings = bookings.filter((booking) => booking.status !== 'cancelled');

      const tableSelect = document.querySelector('#invoiceTable');
      const bookedTableNames = new Set(orderBookings.map((booking) => booking.table));
      if (tableSelect) {
        tableSelect.innerHTML = '<option value="">Chọn bàn</option>';
        orderTables.filter((table) => table.status === 'available' || bookedTableNames.has(table.name)).forEach((table) => {
          const option = document.createElement('option');
          option.value = table.name;
          option.textContent = `${table.name} · ${table.capacity} khách${table.status === 'available' ? '' : ' · Đã đặt'}`;
          tableSelect.appendChild(option);
        });
        tableSelect.value = orderTables.find((table) => table.status === 'available')?.name || '';
      }

      const bookingSelect = document.querySelector('#invoiceBooking');
      if (bookingSelect) {
        orderBookings.forEach((booking) => {
          const option = document.createElement('option');
          option.value = String(booking.id);
          option.textContent = `${booking.customer} · ${booking.table} · ${booking.date} ${booking.time}`;
          bookingSelect.appendChild(option);
        });
      }

      const customerOptions = document.querySelector('#invoiceCustomerOptions');
      if (customerOptions) {
        customerOptions.replaceChildren();
        customers.forEach((customer) => {
          const option = document.createElement('option');
          option.value = customer.name;
          customerOptions.appendChild(option);
        });
      }
      renderMenu(document.querySelector('#menuSearch')?.value.trim().toLowerCase() || '');
    } catch (error) {
      window.OngVangApp?.showToast?.('Không thể tải thực đơn từ máy chủ.', 'warning');
    }
  };

  const updateMenu = (menu) => {
    menuItems = menu
      .filter((item) => item.status !== 'unavailable')
      .map((item) => ({ ...item, image: menuImages[item.name] || '' }));
    renderMenu(document.querySelector('#menuSearch')?.value.trim().toLowerCase() || '');
  };

  window.OngVangApp.subscribeCollection('ongvang_menu', updateMenu);

  menuList?.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-item]');
    if (!addButton) return;
    const item = menuItems.find((candidate) => candidate.name === addButton.dataset.addItem);
    if (!item) return;

    const existing = cart.find((candidate) => candidate.name === item.name);
    if (existing) existing.qty += 1;
    else cart.push({ ...item, qty: 1 });
    renderCart();
    window.OngVangApp?.showToast?.(`${item.name} đã được thêm vào hóa đơn`, 'success');
  });

  cartItems?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-cart-action]');
    if (!actionButton) return;
    const index = Number(actionButton.dataset.index);
    if (!cart[index]) return;
    cart[index].qty += actionButton.dataset.cartAction === 'increase' ? 1 : -1;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    renderCart();
  });

  document.querySelector('#menuSearch')?.addEventListener('input', (event) => {
    renderMenu(event.target.value.trim().toLowerCase());
  });

  document.querySelector('#menuCategories')?.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-category]');
    if (!categoryButton) return;
    activeCategory = categoryButton.dataset.category;
    document.querySelectorAll('#menuCategories [data-category]').forEach((button) => button.classList.toggle('active', button === categoryButton));
    renderMenu(document.querySelector('#menuSearch')?.value.trim().toLowerCase() || '');
  });

  document.querySelector('#clearCart')?.addEventListener('click', () => {
    cart.splice(0, cart.length);
    renderCart();
  });

  document.querySelector('#invoiceBooking')?.addEventListener('change', (event) => {
    const booking = orderBookings.find((item) => String(item.id) === event.target.value);
    if (!booking) return;
    document.querySelector('#invoiceOrderType').value = 'Dùng tại bàn';
    document.querySelector('#invoiceTable').value = booking.table;
    document.querySelector('#invoiceCustomer').value = booking.customer || 'Khách lẻ';
  });

  document.querySelector('#createBookingForInvoice')?.addEventListener('click', () => {
    const availableTables = orderTables.filter((table) => table.status === 'available');
    if (!availableTables.length) {
      window.OngVangApp?.showToast?.('Hiện không có bàn trống để đặt.', 'warning');
      return;
    }
    const tableOptions = availableTables.map((table) => `<option value="${escapePosText(table.name)}">${escapePosText(table.name)} · ${table.capacity} khách</option>`).join('');
    const today = new Date();
    const todayValue = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const initialCustomer = escapePosText(document.querySelector('#invoiceCustomer')?.value.trim() || '');
    const content = `
      <div class="form-grid">
        <label class="form-group full">Khách hàng<input id="newInvoiceBookingCustomer" class="form-control" value="${initialCustomer}" required /></label>
        <label class="form-group full">Bàn<select id="newInvoiceBookingTable" class="form-control">${tableOptions}</select></label>
        <label class="form-group">Ngày<input id="newInvoiceBookingDate" class="form-control" type="date" min="${todayValue}" value="${todayValue}" required /></label>
        <label class="form-group">Giờ<input id="newInvoiceBookingTime" class="form-control" type="time" value="18:00" required /></label>
        <label class="form-group full">Số khách<input id="newInvoiceBookingGuests" class="form-control" type="number" min="1" max="${availableTables[0]?.type === 'VIP' ? 10 : 6}" value="2" required /></label>
      </div>
    `;
    window.OngVangApp?.openModal?.('Tạo lượt đặt bàn', content, [
      { label: 'Hủy', type: 'secondary' },
      { label: 'Tạo đặt bàn', type: 'primary' }
    ]);
    const modal = document.querySelector('#app-modal');
    const modalTableSelect = modal?.querySelector('#newInvoiceBookingTable');
    modalTableSelect?.addEventListener('change', () => {
      const selectedTable = availableTables.find((item) => item.name === modalTableSelect.value);
      const guestInput = modal.querySelector('#newInvoiceBookingGuests');
      const maxGuests = selectedTable?.type === 'VIP' ? 10 : 6;
      guestInput.max = String(maxGuests);
      if (Number(guestInput.value) > maxGuests) guestInput.value = String(maxGuests);
    });
    const bookingDateInput = modal?.querySelector('#newInvoiceBookingDate');
    const bookingTimeInput = modal?.querySelector('#newInvoiceBookingTime');
    const syncModalTimeMinimum = () => {
      const now = new Date();
      const todayValue = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      if (bookingDateInput.value === todayValue) {
        bookingTimeInput.min = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      } else {
        bookingTimeInput.removeAttribute('min');
      }
    };
    bookingDateInput?.addEventListener('change', syncModalTimeMinimum);
    syncModalTimeMinimum();
    modal?.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
    modal?.querySelector('[data-modal-action="Tạo đặt bàn"]')?.addEventListener('click', async (event) => {
      const submitButton = event.currentTarget;
      const customer = modal.querySelector('#newInvoiceBookingCustomer').value.trim();
      const table = modal.querySelector('#newInvoiceBookingTable').value;
      const date = modal.querySelector('#newInvoiceBookingDate').value;
      const time = modal.querySelector('#newInvoiceBookingTime').value;
      const guests = Number(modal.querySelector('#newInvoiceBookingGuests').value);
      const tableInfo = availableTables.find((item) => item.name === table);
      const now = new Date();
      const currentDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const maxGuests = tableInfo?.type === 'VIP' ? 10 : 6;
      if (!customer || !date || !time || guests < 1 || !tableInfo) {
        window.OngVangApp?.showToast?.('Vui lòng nhập đủ thông tin đặt bàn.', 'warning');
        return;
      }
      if (date < currentDate || (date === currentDate && time < currentTime)) {
        window.OngVangApp?.showToast?.('Ngày và giờ đặt bàn không được ở quá khứ.', 'warning');
        return;
      }
      if (guests > maxGuests) {
        window.OngVangApp?.showToast?.(`Bàn ${tableInfo.type === 'VIP' ? 'VIP' : 'thường'} tối đa ${maxGuests} khách.`, 'warning');
        return;
      }
      if (guests > Number(tableInfo.capacity)) {
        window.OngVangApp?.showToast?.(`Bàn này chỉ phù hợp tối đa ${tableInfo.capacity} khách.`, 'warning');
        return;
      }
      const conflict = orderBookings.some((booking) => booking.table === table && booking.date === date);
      if (conflict) {
        window.OngVangApp?.showToast?.('Bàn này đã có lượt đặt trong ngày đã chọn.', 'warning');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Đang lưu...';
      try {
        const booking = await window.OngVangApp.apiRequest('/api/bookings', {
          method: 'POST',
          body: { customer, table, date, time, guests, status: 'confirmed' }
        });
        orderBookings.push(booking);
        const option = document.createElement('option');
        option.value = String(booking.id);
        option.textContent = `${booking.customer} · ${booking.table} · ${booking.date} ${booking.time}`;
        document.querySelector('#invoiceBooking').appendChild(option);
        document.querySelector('#invoiceBooking').value = String(booking.id);
        document.querySelector('#invoiceBooking').dispatchEvent(new Event('change'));
        modal.innerHTML = '';
        window.OngVangApp?.showToast?.('Đặt bàn thành công. Tiếp tục chọn món để tạo hóa đơn.', 'success');
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = 'Tạo đặt bàn';
        window.OngVangApp?.showToast?.(error.message || 'Không thể tạo lượt đặt bàn.', 'error');
      }
    });
  });

  document.querySelector('#invoiceOrderType')?.addEventListener('change', (event) => {
    const tableSelect = document.querySelector('#invoiceTable');
    const dineIn = event.target.value !== 'Mang đi';
    if (!dineIn && tableSelect) tableSelect.value = '';
    if (tableSelect) tableSelect.disabled = !dineIn;
    if (dineIn && tableSelect && !tableSelect.value) {
      tableSelect.value = orderTables.find((table) => table.status === 'available')?.name || '';
    }
  });

  const voucherInput = document.querySelector('#invoiceVoucherCode');
  const voucherMessage = document.querySelector('#invoiceVoucherMessage');
  voucherInput?.addEventListener('input', () => {
    const normalizedCode = voucherInput.value.trim().toUpperCase().replace(/\s+/g, '');
    if (appliedVoucher && normalizedCode !== appliedVoucher.code) {
      appliedVoucher = null;
      if (voucherMessage) voucherMessage.textContent = '';
      renderCart();
    }
  });

  document.querySelector('#applyInvoiceVoucher')?.addEventListener('click', async (event) => {
    const code = voucherInput?.value.trim().toUpperCase().replace(/\s+/g, '') || '';
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    if (!code || !cart.length) {
      if (voucherMessage) voucherMessage.textContent = 'Nhập mã và thêm món vào hóa đơn trước.';
      return;
    }
    const applyButton = event.currentTarget;
    applyButton.disabled = true;
    try {
      appliedVoucher = await window.OngVangApp.apiRequest(`/api/vouchers/validate?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(subtotal)}`);
      if (voucherInput) voucherInput.value = appliedVoucher.code;
      renderCart();
    } catch (error) {
      appliedVoucher = null;
      if (voucherMessage) voucherMessage.textContent = error.message || 'Mã voucher không hợp lệ.';
      renderCart();
    } finally {
      applyButton.disabled = false;
    }
  });

  checkoutButton?.addEventListener('click', async () => {
    const loyaltyCode = loyaltyCodeInput?.value.trim().toUpperCase() || '';
    let customer = document.querySelector('#invoiceCustomer')?.value.trim();
    if (loyaltyCode) {
      if (!/^[A-Z]{2}-\d{10}$/.test(loyaltyCode)) {
        window.OngVangApp?.showToast?.('Mã thành viên cần có dạng AA-0123456789.', 'warning');
        return;
      }
      try {
        const member = await window.OngVangApp.apiRequest(`/api/loyalty-cards/${encodeURIComponent(loyaltyCode)}`);
        customer = member.name;
        document.querySelector('#invoiceCustomer').value = member.name;
        if (loyaltyMessage) loyaltyMessage.textContent = `Đã nhận diện khách hàng ${member.name}.`;
      } catch (error) {
        window.OngVangApp?.showToast?.(error.message || 'Không tìm thấy mã thành viên.', 'warning');
        return;
      }
    }
    const table = document.querySelector('#invoiceTable')?.value.trim();
    const orderType = document.querySelector('#invoiceOrderType')?.value || 'Dùng tại bàn';
    if (!customer || (orderType !== 'Mang đi' && !table)) {
      window.OngVangApp?.showToast?.('Vui lòng nhập khách hàng và chọn bàn cho đơn dùng tại bàn.', 'warning');
      return;
    }

    if (!cart.length) {
      window.OngVangApp?.showToast?.('Giỏ hàng đang trống, vui lòng chọn món trước khi thanh toán.', 'warning');
      return;
    }

    const paymentMethod = document.querySelector('#invoicePaymentMethod')?.value || 'Tiền mặt';
    const paymentStatus = document.querySelector('#invoicePaymentStatus')?.value || 'paid';
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    if (voucherInput?.value.trim() && !appliedVoucher) {
      window.OngVangApp?.showToast?.('Hãy áp dụng mã voucher trước khi tạo hóa đơn.', 'warning');
      return;
    }
    if (appliedVoucher && subtotal < Number(appliedVoucher.minimumOrder || 0)) {
      window.OngVangApp?.showToast?.(`Đơn chưa đạt giá trị tối thiểu ${formatCurrency(Number(appliedVoucher.minimumOrder || 0))} của voucher.`, 'warning');
      return;
    }
    const discount = appliedVoucher ? Math.min(
      subtotal,
      appliedVoucher.maximumDiscount === null || appliedVoucher.maximumDiscount === undefined
        ? (appliedVoucher.discountType === 'percent' ? subtotal * Number(appliedVoucher.discountValue) / 100 : Number(appliedVoucher.discountValue))
        : Math.min(appliedVoucher.discountType === 'percent' ? subtotal * Number(appliedVoucher.discountValue) / 100 : Number(appliedVoucher.discountValue), Number(appliedVoucher.maximumDiscount))
    ) : 0;
    const total = subtotal - Math.round(discount);
    const invoice = {
      id: `HD-${Date.now().toString().slice(-8)}`,
      customer,
      table: table || 'Mang đi',
      orderType,
      paymentMethod,
      date: new Date().toLocaleDateString('vi-VN'),
      employee: 'NV-01',
      subtotal,
      discount: Math.round(discount),
      voucherCode: appliedVoucher?.code || null,
      total,
      status: paymentStatus,
      items: cart.map((item) => ({ ...item }))
    };

    const modalContent = buildCheckoutSummary(invoice.items, {
      customer: invoice.customer,
      table: invoice.table,
      orderType: invoice.orderType,
      paymentMethod: invoice.paymentMethod,
      paymentStatus: paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
      voucherCode: invoice.voucherCode,
      discount: invoice.discount
    });

    const confirmLabel = paymentStatus === 'paid' ? 'Xác nhận thanh toán' : 'Xác nhận tạo hóa đơn';
    window.OngVangApp?.openModal?.(paymentStatus === 'paid' ? 'Xác nhận thanh toán' : 'Xác nhận tạo hóa đơn', modalContent, [
      { label: 'Hủy', type: 'secondary' },
      { label: confirmLabel, type: 'primary' }
    ]);

    const modalRoot = document.querySelector('#app-modal');
    modalRoot?.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });

    modalRoot?.querySelector(`[data-modal-action="${confirmLabel}"]`)?.addEventListener('click', async (event) => {
      const confirmButton = event.currentTarget;
      if (confirmButton.disabled) return;
      confirmButton.disabled = true;
      confirmButton.textContent = 'Đang lưu...';
      try {
        const savedInvoice = await window.OngVangApp.apiRequest('/api/invoices', {
          method: 'POST',
          body: {
            invoiceCode: invoice.id,
            customerName: invoice.customer,
            customerCode: loyaltyCodeInput?.value.trim().toUpperCase() || null,
            table: orderType === 'Mang đi' ? null : invoice.table,
            orderType: invoice.orderType,
            paymentMethod: invoice.paymentMethod,
            date: invoice.date,
            employee: invoice.employee,
            subtotal: invoice.subtotal,
            voucherCode: invoice.voucherCode,
            total: invoice.total,
            status: paymentStatus,
            items: invoice.items
          }
        });

        modalRoot.innerHTML = '';
        cart.splice(0, cart.length);
        appliedVoucher = null;
        if (voucherInput) voucherInput.value = '';
        if (voucherMessage) voucherMessage.textContent = '';
        renderCart();
        try {
          await window.OngVangApp.loadInvoices();
        } catch (syncError) {
          console.warn('Invoice saved, but the invoice list could not refresh:', syncError);
        }
        window.OngVangApp?.openModal?.(paymentStatus === 'paid' ? 'Thanh toán thành công' : 'Tạo hóa đơn thành công', `
          <div class="receipt-summary">
            <div class="receipt-badge">${savedInvoice.invoiceCode || invoice.id}</div>
            <div class="receipt-row"><span>Khách hàng</span><strong>${escapePosText(savedInvoice.customer || invoice.customer)}</strong></div>
            <div class="receipt-row"><span>Bàn</span><strong>${escapePosText(savedInvoice.table || 'Mang đi')}</strong></div>
            <div class="receipt-row"><span>Phương thức</span><strong>${savedInvoice.paymentMethod || invoice.paymentMethod}</strong></div>
            ${savedInvoice.voucherCode ? `<div class="receipt-row"><span>Voucher</span><strong>${escapePosText(savedInvoice.voucherCode)}</strong></div><div class="receipt-row"><span>Giảm giá</span><strong>−${formatCurrency(Number(savedInvoice.discount || 0))}</strong></div>` : ''}
            <div class="receipt-row"><span>Trạng thái</span><strong>${paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}</strong></div>
            <div class="receipt-row"><span>Tổng tiền</span><strong>${formatCurrency(Number(savedInvoice.total || invoice.total))}</strong></div>
          </div>
        `, [{ label: 'Đóng', type: 'primary' }]);

        const confirmModal = document.querySelector('#app-modal');
        confirmModal?.querySelector('[data-modal-action="Đóng"]')?.addEventListener('click', () => {
          confirmModal.innerHTML = '';
        });

        window.OngVangApp?.showToast?.(paymentStatus === 'paid' ? `Đã thanh toán ${invoice.id}: ${formatCurrency(total)}` : `Đã tạo hóa đơn ${invoice.id} đang chờ thanh toán.`, 'success');
      } catch (error) {
        confirmButton.disabled = false;
        confirmButton.textContent = confirmLabel;
        window.OngVangApp?.showToast?.(error.message || 'Không thể lưu hóa đơn lên máy chủ.', 'warning');
      }
    });
  });

  window.OngVangApp.loadInvoices().catch(() => {
    window.OngVangApp?.showToast?.('Không thể tải hóa đơn từ máy chủ.', 'warning');
  });
  loadMenu();
  renderCart();
});
