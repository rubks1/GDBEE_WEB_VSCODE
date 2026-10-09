let tables = [];
let bookings = [];
let customerOptions = [];

function getStoredBookings() {
  return bookings;
}

function saveBookings(bookings) {
  window.OngVangApp.writeCollection('ongvang_bookings', bookings);
}

function renderTableSelection(selectedName = 'Bàn 02', zone = 'Tất cả') {
  const host = document.querySelector('.table-map');
  if (!host) return;

  host.innerHTML = '';

  const bookingDate = document.querySelector('#bookingDate')?.value;
  const bookedTables = getStoredBookings()
    .filter((booking) => booking.date === bookingDate)
    .map((booking) => booking.table);
  const visibleTables = tables.filter((table) => zone === 'Tất cả' || table.zone === zone);
  visibleTables.forEach((table) => {
    const status = bookedTables.includes(table.name) ? 'reserved' : table.status;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `table-seat ${status} ${selectedName === table.name ? 'selected' : ''}`;
    button.disabled = status !== 'available';
    const statusText = status === 'occupied' ? 'Đang phục vụ' : status === 'reserved' ? 'Đã đặt' : status === 'maintenance' ? 'Bảo trì' : `${table.capacity} khách`;
    button.innerHTML = `<span>${table.name}</span><small>${statusText} · ${table.zone}</small>`;

    button.addEventListener('click', () => {
      if (table.status !== 'available') return;
      document.querySelectorAll('.table-seat').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      const selectedTableInput = document.querySelector('#selectedTable');
      if (selectedTableInput) selectedTableInput.value = table.name;
    });

    host.appendChild(button);
  });
}

function renderBookings() {
  const tbody = document.querySelector('#bookingList');
  if (!tbody) return;
  const bookings = getStoredBookings().slice().reverse();
  const count = document.querySelector('#bookingCount');
  if (count) count.textContent = `${bookings.length} lượt đặt`;

  tbody.innerHTML = bookings.length
    ? bookings.map((booking) => `
        <tr>
          <td>${booking.customer}</td><td>${booking.table}</td><td>${booking.date}</td>
          <td>${booking.time}</td><td>${booking.guests} khách</td><td><span class="tag success">Đã xác nhận</span></td>
        </tr>
      `).join('')
    : '<tr><td colspan="6" class="empty-table-cell">Chưa có lượt đặt bàn nào.</td></tr>';
}

function renderTableOverview(date) {
  const bookedTables = getStoredBookings()
    .filter((booking) => booking.date === date)
    .map((booking) => booking.table);
  const counts = tables.reduce((summary, table) => {
    const status = bookedTables.includes(table.name) ? 'reserved' : table.status;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});

  document.querySelector('#availableTableCount').textContent = counts.available || 0;
  document.querySelector('#occupiedTableCount').textContent = counts.occupied || 0;
  document.querySelector('#reservedTableCount').textContent = counts.reserved || 0;
}

function renderCustomerOptions() {
  const select = document.querySelector('#bookingCustomer');
  if (!select) return;

  select.innerHTML = customerOptions
    .map((customer) => `<option value="${customer}">${customer}</option>`)
    .join('');
}

function localDateValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function configureBookingDateLimits() {
  const dateInput = document.querySelector('#bookingDate');
  const timeInput = document.querySelector('#bookingTime');
  if (!dateInput || !timeInput) return;
  const today = localDateValue();
  dateInput.min = today;
  if (!dateInput.value || dateInput.value < today) dateInput.value = today;
  if (dateInput.value === today) {
    const now = new Date();
    timeInput.min = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  } else {
    timeInput.removeAttribute('min');
  }
}

function bookingGuestLimit(table) {
  return table?.type === 'VIP' ? 10 : 6;
}

function syncBookingGuestLimit() {
  const guestInput = document.querySelector('#bookingGuests');
  const table = tables.find((item) => item.name === document.querySelector('#selectedTable')?.value);
  if (!guestInput) return;
  const limit = bookingGuestLimit(table);
  guestInput.max = String(limit);
  if (Number(guestInput.value) > limit) guestInput.value = String(limit);
}

document.addEventListener('DOMContentLoaded', () => {
  window.renderTopbar('Đặt bàn', 'Chọn bàn, khách hàng và thời gian thuận tiện');
  window.OngVangApp?.setActiveNav?.('datban');

  const bookingButton = document.querySelector('#bookingSubmit');
  const selectedTableInput = document.querySelector('#selectedTable');
  const zoneFilter = document.querySelector('#tableZoneFilter');
  configureBookingDateLimits();


  const initializeBookingData = async () => {
    try {
      const [apiTables, customersFromApi, apiBookings] = await Promise.all([
        window.OngVangApp.apiRequest('/api/tables'),
        window.OngVangApp.apiRequest('/api/customers'),
        window.OngVangApp.apiRequest('/api/bookings')
      ]);
      tables = apiTables.map((table) => ({ ...table, zone: table.zone || table.area || 'Trong nhà' }));
      customerOptions = customersFromApi.map((customer) => customer.name);
      bookings = apiBookings;

      const previousBookings = window.OngVangApp.readCollection('ongvang_bookings');
      for (const booking of previousBookings) {
        const alreadySynced = bookings.some((entry) =>
          entry.customer === booking.customer &&
          entry.table === booking.table &&
          entry.date === booking.date &&
          entry.time === booking.time &&
          Number(entry.guests) === Number(booking.guests)
        );
        if (alreadySynced) continue;

        const migratedBooking = await window.OngVangApp.apiRequest('/api/bookings', {
          method: 'POST',
          body: {
            customer: booking.customer,
            table: booking.table,
            date: booking.date,
            time: booking.time,
            guests: booking.guests,
            status: booking.status || 'confirmed'
          }
        });
        bookings.push(migratedBooking);
      }
      saveBookings(bookings);
    } catch (error) {
      tables = [];
      bookings = window.OngVangApp.readCollection('ongvang_bookings');
      customerOptions = [];
      window.OngVangApp.showToast('Không thể tải dữ liệu đặt bàn từ máy chủ.', 'warning');
    }

    renderCustomerOptions();
    renderBookings();
    const bookingDate = document.querySelector('#bookingDate')?.value;
    const alreadyBooked = getStoredBookings().filter((booking) => booking.date === bookingDate).map((booking) => booking.table);
    const partySize = Number(document.querySelector('#bookingGuests')?.value || 1);
    const defaultTable = tables.find((table) => table.status === 'available' && !alreadyBooked.includes(table.name) && table.capacity >= partySize);
    if (selectedTableInput) selectedTableInput.value = defaultTable?.name || '';
    renderTableSelection(selectedTableInput?.value || '');
    renderTableOverview(bookingDate);
    syncBookingGuestLimit();
  };

  initializeBookingData();
  window.OngVangApp.subscribeCollection('ongvang_bookings', (latestBookings) => {
    bookings = latestBookings;
    renderBookings();
    renderTableSelection(selectedTableInput?.value || '', zoneFilter?.value || 'Tất cả');
    renderTableOverview(document.querySelector('#bookingDate')?.value);
  });
  window.OngVangApp.subscribeCollection('ongvang_tables', (latestTables) => {
    tables = latestTables.map((table) => ({ ...table, zone: table.zone || table.area || 'Trong nhà' }));
    renderTableSelection(selectedTableInput?.value || '', zoneFilter?.value || 'Tất cả');
    renderTableOverview(document.querySelector('#bookingDate')?.value);
  });
  window.OngVangApp.subscribeCollection('ongvang_customers', (latestCustomers) => {
    customerOptions = latestCustomers.map((customer) => customer.name);
    renderCustomerOptions();
  });

  if (bookingButton) {
    bookingButton.addEventListener('click', async () => {
      const customer = document.querySelector('#bookingCustomer')?.value || '';
      const date = document.querySelector('#bookingDate')?.value || '';
      const time = document.querySelector('#bookingTime')?.value || '';
      const guests = Number(document.querySelector('#bookingGuests')?.value || 0);
      const table = selectedTableInput?.value || 'Bàn 02';
      const tableData = tables.find((item) => item.name === table);
      const tableConflict = getStoredBookings().some((booking) => booking.table === table && booking.date === date);

      if (!customer || !date || !time || guests < 1 || !tableData || tableData.status !== 'available' || tableConflict) {
        window.OngVangApp?.showToast?.('Vui lòng điền đầy đủ thông tin đặt bàn.', 'warning');
        return;
      }

      const today = localDateValue();
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (date < today || (date === today && time < currentTime)) {
        window.OngVangApp?.showToast?.('Ngày và giờ đặt bàn không được ở quá khứ.', 'warning');
        return;
      }
      const maxGuests = bookingGuestLimit(tableData);
      if (guests > maxGuests) {
        window.OngVangApp?.showToast?.(`Bàn ${tableData.type === 'VIP' ? 'VIP' : 'thường'} tối đa ${maxGuests} khách.`, 'warning');
        return;
      }
      if (guests > tableData.capacity) {
        window.OngVangApp?.showToast?.(`Bàn này chỉ phù hợp tối đa ${tableData.capacity} khách.`, 'warning');
        return;
      }

      try {
        const booking = await window.OngVangApp.apiRequest('/api/bookings', {
          method: 'POST',
          body: { customer, table, date, time, guests, status: 'confirmed' }
        });
        bookings.push(booking);
        saveBookings(bookings);
        renderTableSelection('', zoneFilter?.value || 'Tất cả');
        renderBookings();
        renderTableOverview(date);
        window.OngVangApp?.showToast?.('Đặt bàn đã được đồng bộ.', 'success');
      } catch (error) {
        window.OngVangApp?.showToast?.('Không thể lưu lượt đặt bàn lên máy chủ.', 'warning');
      }
    });
  }

  zoneFilter?.addEventListener('change', () => {
    const selectedTable = tables.find((table) => table.name === selectedTableInput?.value);
    if (selectedTable && zoneFilter.value !== 'Tất cả' && selectedTable.zone !== zoneFilter.value) {
      selectedTableInput.value = '';
    }
    renderTableSelection(selectedTableInput?.value || '', zoneFilter.value);
  });

  document.querySelector('#bookingDate')?.addEventListener('change', () => {
    configureBookingDateLimits();
    const selectedTable = selectedTableInput?.value;
    const isReserved = getStoredBookings().some((booking) => booking.table === selectedTable && booking.date === document.querySelector('#bookingDate').value);
    if (isReserved) selectedTableInput.value = '';
    renderTableSelection(selectedTableInput?.value || '', zoneFilter?.value || 'Tất cả');
    renderTableOverview(document.querySelector('#bookingDate').value);
  });

  document.querySelector('.table-map')?.addEventListener('click', () => syncBookingGuestLimit());
  document.querySelector('#bookingGuests')?.addEventListener('change', (event) => {
    syncBookingGuestLimit();
    const currentTable = tables.find((table) => table.name === selectedTableInput?.value);
    if (currentTable && currentTable.capacity < Number(event.target.value)) {
      selectedTableInput.value = '';
      renderTableSelection('', zoneFilter?.value || 'Tất cả');
    }
  });
});
