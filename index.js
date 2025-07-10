/**
       * Displays a floating alert message to the user.
       * @param {string} message - The message to display.
       * @param {string} type - The Bootstrap alert type (e.g., 'success', 'danger', 'info').
       */
function showLiveAlert(message, type = 'success') {
    // Defer the execution to ensure DOM is fully ready
    setTimeout(() => {
      const alertDiv = document.querySelector('.floating-alert');
      const alertMessage = document.getElementById('alert-message');

      if (!alertDiv || !alertMessage) {
          console.error("Alert elements not found in DOM. Cannot display live alert after timeout.");
          return;
      }

      alertDiv.className = `floating-alert alert alert-${type} alert-dismissible fade show`;
      alertMessage.textContent = message;
      alertDiv.style.display = 'block';

      setTimeout(() => {
        if (typeof $ !== 'undefined' && $.fn.alert) {
          $(alertDiv).alert('close');
        } else {
          alertDiv.style.display = 'none';
        }
      }, 3000);
    }, 0); // Short timeout to defer execution
  }

  // Initialize with sample data or load from localStorage
  // Customers data structure: { id, name, phone }
  let customers = JSON.parse(localStorage.getItem('electroplatingCustomers')) || [];

  // Orders data structure: { id, customer{id, name}, status, gstApply, createdAt, items[], orderTotal }
  // Each item: { itemName, material, platingTypes[], platingPrices[], quantity, itemRatePerKg, itemTotal }
  let orders = JSON.parse(localStorage.getItem('electroplatingOrders')) || []
  

  // Pagination variables
  let currentPage = 1;
  const rowsPerPage = 10;
  // Sorting variables
  let sortColumn = 'createdAt';
  let sortDirection = 'desc'; // Default sort by date, descending

  // Debounce function to limit how often a function is called
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  /**
   * Generates a unique ID with a given prefix.
   * @param {string} prefix - The prefix for the ID (e.g., 'CUST', 'ORD').
   * @returns {string} A unique ID string.
   */
  function generateUniqueId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Saves the current customers and orders data to localStorage.
   */
  function saveData() {
    localStorage.setItem('electroplatingCustomers', JSON.stringify(customers));
    localStorage.setItem('electroplatingOrders', JSON.stringify(orders));
  }

  /**
   * Renders customer options in all relevant select dropdowns.
   */
  function renderCustomers() {
    const customerSelect = document.getElementById('customerSelect');
    const customerFilter = document.getElementById('customerFilter');
    const billingCustomer = document.getElementById('billingCustomer');

    // Clear existing options, keeping the first placeholder option
    [customerSelect, customerFilter, billingCustomer].forEach((selectElement) => {
      while (selectElement.options.length > 1) {
        selectElement.remove(1);
      }
    });

    // Add each customer as an option
    customers.forEach((customer) => {
      const option1 = new Option(customer.name, customer.id);
      const option2 = new Option(customer.name, customer.id);
      const option3 = new Option(customer.name, customer.id);
      customerSelect.add(option1);
      customerFilter.add(option2);
      billingCustomer.add(option3);
    });

    // Trigger change to update Select2 display
    $('#customerSelect').trigger('change');
    $('#customerFilter').trigger('change');
    $('#billingCustomer').trigger('change');
  }

  /**
   * Adds a new customer to the system.
   * Validates input and updates UI.
   */
  function addCustomer() {
    const name = document.getElementById('newCustomerName').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();

    if (name && phone) {
      const newCustomer = {
        id: generateUniqueId('CUST'),
        name,
        phone,
      };
      customers.push(newCustomer); // Add new customer to array
      saveData(); // Persist to localStorage
      renderCustomers(); // Update dropdowns
      // Clear form fields
      document.getElementById('newCustomerName').value = '';
      document.getElementById('newCustomerPhone').value = '';
      showLiveAlert('Customer added successfully!');
    } else {
      showLiveAlert('Please enter both customer name and phone.', 'danger');
    }
  }

  /**
   * Adds a new order to the system.
   * Validates input, calculates total based on plating prices, and updates UI.
   */
  function addOrder() {
    const customerId = document.getElementById('customerSelect').value;
    const status = document.getElementById('status').value;
    const gstApply = document.getElementById('gstApply').value;
    const orderDate = document.getElementById('orderDate').value;

    // Get all item rows
    const itemRows = document.querySelectorAll('#itemRowsContainer .item-row');
    if (itemRows.length === 0) {
        showLiveAlert('Please add at least one item to the order.', 'danger');
        return;
    }

    const orderItems = [];
    let orderTotal = 0;
    let hasError = false;

    itemRows.forEach((row, index) => {
        const itemName = row.querySelector('.item-name-input').value.trim();
        const material = row.querySelector('.item-material-select').value;
        const platingTypeSelect = $(row).find('.item-plating-type-select'); // Use jQuery for Select2
        const platingTypes = platingTypeSelect.val() || []; // Get selected values
        const platingPricesInput = row.querySelector('.item-plating-prices-input').value.trim();
        const quantity = parseFloat(row.querySelector('.item-quantity-input').value);

        // Input validation for each item
        if (!itemName || !material || platingTypes.length === 0 || !platingPricesInput || isNaN(quantity) || quantity <= 0) {
            showLiveAlert(`Please fill in all fields for Item ${index + 1}.`, 'danger');
            hasError = true;
            return; // Skip this item, but continue checking others
        }

        const platingPrices = platingPricesInput.split(',').map(Number);
        if (platingPrices.length !== platingTypes.length) {
            showLiveAlert(`Number of plating prices must match plating types for Item ${index + 1}.`, 'danger');
            hasError = true;
            return;
        }

        const itemRatePerKg = platingPrices.reduce((sum, price) => sum + price, 0);
        let itemCalculatedTotal = itemRatePerKg * quantity;
        if (gstApply === 'yes') {
            itemCalculatedTotal *= 1.18; // Apply 18% GST
        }

        orderItems.push({
            itemName,
            material,
            platingTypes,
            platingPrices,
            quantity,
            itemRatePerKg: parseFloat(itemRatePerKg.toFixed(2)),
            itemTotal: parseFloat(itemCalculatedTotal.toFixed(2)),
        });
        orderTotal += itemCalculatedTotal;
    });

    if (hasError) {
        return; // Stop if any item has validation errors
    }

    // Validate main order fields
    if (!customerId || !status || !orderDate) {
        showLiveAlert('Please select a customer, status, and order date.', 'danger');
        return;
    }

    const customer = customers.find((cust) => cust.id === customerId);
    if (!customer) {
      showLiveAlert('Selected customer not found.', 'danger');
      return;
    }

    // Create new order object
    const newOrder = {
      id: 'ORD-' + String(orders.length + 1).padStart(4, '0'), // Simple incremental ID
      customer: { id: customer.id, name: customer.name },
      status,
      gstApply,
      createdAt: orderDate,
      items: orderItems,
      orderTotal: parseFloat(orderTotal.toFixed(2)),
    };

    orders.push(newOrder); // Add new order to array
    saveData(); // Persist to localStorage
    renderOrders(); // Update order table
    updateSummaryCards(); // Update dashboard summary
    clearOrderForm(); // Clear form fields
    showLiveAlert('Order added successfully!');
    highlightOrder(newOrder.id); // Highlight the newly added order
  }

  /**
   * Clears all input fields in the order form and resets to a single item row.
   */
  function clearOrderForm() {
    $('#customerSelect').val('').trigger('change'); // Clear Select2
    document.getElementById('status').value = 'Pending';
    document.getElementById('gstApply').value = 'yes';
    document.getElementById('orderDate').value = new Date().toISOString().split('T')[0]; // Reset date to today

    const itemRowsContainer = document.getElementById('itemRowsContainer');
    itemRowsContainer.innerHTML = ''; // Clear all existing item rows
    addEmptyItemRow(); // Add a single empty item row
  }

  /**
   * Adds an empty item row to the order form.
   * @param {Object} [itemData] - Optional data to pre-fill the item row.
   */
  function addEmptyItemRow(itemData = {}) {
    const itemRowsContainer = document.getElementById('itemRowsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.classList.add('item-row', 'row', 'g-3', 'mb-4'); // Added mb-4 for spacing between item rows
    newItemRow.innerHTML = `
        <div class="col-12">
            <h6 class="mb-3">Item Details</h6>
        </div>
        <div class="col-md-6">
            <label for="itemName" class="form-label">Item Name</label>
            <div class="item-autocomplete">
                <input type="text" class="form-control item-name-input" placeholder="Item name" autocomplete="off" value="${itemData.itemName || ''}">
                <div class="item-suggestions"></div>
            </div>
        </div>
        <div class="col-md-6">
            <label for="material" class="form-label">Material</label>
            <select class="form-select item-material-select">
                <option value="">Select Material</option>
                <option value="Brass" ${itemData.material === 'Brass' ? 'selected' : ''}>Brass</option>
                <option value="Steel" ${itemData.material === 'Steel' ? 'selected' : ''}>Steel</option>
                <option value="Copper" ${itemData.material === 'Copper' ? 'selected' : ''}>Copper</option>
                <option value="Aluminum" ${itemData.material === 'Aluminum' ? 'selected' : ''}>Aluminum</option>
            </select>
        </div>
        <div class="col-md-6">
            <label for="platingType" class="form-label">Plating Type(s)</label>
            <select class="form-select item-plating-type-select" multiple>
                <option value="Chrome">Chrome</option>
                <option value="Zinc">Zinc</option>
                <option value="Nickel">Nickel</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
            </select>
        </div>
        <div class="col-md-6">
            <label for="quantity" class="form-label">Quantity (kg)</label>
            <input type="number" class="form-control item-quantity-input" placeholder="Qty" step="0.01" value="${itemData.quantity || ''}">
        </div>
        <div class="col-md-10">
            <label for="platingPrices" class="form-label">Prices (comma-separated)</label>
            <input type="text" class="form-control item-plating-prices-input" placeholder="e.g., 100,150" value="${itemData.platingPrices ? itemData.platingPrices.join(',') : ''}">
            <small class="form-text text-muted">Separate prices with commas, matching plating types.</small>
        </div>
        <div class="col-md-2 text-end d-flex align-items-end justify-content-end">
            <button type="button" class="btn btn-danger remove-item-btn w-100">
                <i class="fas fa-trash-alt me-1"></i> Remove
            </button>
        </div>
    `;
    itemRowsContainer.appendChild(newItemRow);

    // Initialize Select2 for the new plating type select
    $(newItemRow).find('.item-plating-type-select').select2({ placeholder: 'Select Plating Type(s)' });
    if (itemData.platingTypes && itemData.platingTypes.length > 0) {
        $(newItemRow).find('.item-plating-type-select').val(itemData.platingTypes).trigger('change');
    }

    // Attach event listener for remove button
    newItemRow.querySelector('.remove-item-btn').addEventListener('click', function() {
        newItemRow.remove();
        // If all item rows are removed, add an empty one back
        if (itemRowsContainer.children.length === 0) {
            addEmptyItemRow();
        }
    });

    // Attach autocomplete listener for the new item name input
    const itemNameInput = newItemRow.querySelector('.item-name-input');
    const itemSuggestionsDiv = newItemRow.querySelector('.item-suggestions');
    itemNameInput.addEventListener('input', function() {
        const input = this.value.toLowerCase();
        itemSuggestionsDiv.innerHTML = '';
        if (input.length === 0) {
            itemSuggestionsDiv.style.display = 'none';
            return;
        }
        const filteredSuggestions = itemNames.filter((item) => item.toLowerCase().includes(input));
        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach((item) => {
                const div = document.createElement('div');
                div.classList.add('item-suggestion');
                div.textContent = item;
                div.onclick = () => {
                    itemNameInput.value = item;
                    itemSuggestionsDiv.style.display = 'none';
                };
                itemSuggestionsDiv.appendChild(div);
            });
            itemSuggestionsDiv.style.display = 'block';
        } else {
            itemSuggestionsDiv.style.display = 'none';
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!itemSuggestionsDiv.contains(e.target) && e.target !== itemNameInput) {
            itemSuggestionsDiv.style.display = 'none';
        }
    });
  }

  /**
   * Renders the orders table based on current filters, sorting, and pagination.
   */
  function renderOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = ''; // Clear existing rows
    
        let filteredAndSortedOrders = [...orders]; // Create a mutable copy
        
        // Apply search filter
        const searchTerm = document
        .getElementById('orderSearch')
        .value.toLowerCase()
        .trim();
        if (searchTerm) {
            filteredAndSortedOrders = filteredAndSortedOrders.filter(
        (order) =>
            order.id.toLowerCase().includes(searchTerm) ||
          order.customer.name.toLowerCase().includes(searchTerm) ||
          order.status.toLowerCase().includes(searchTerm) ||
          order.items.some(item =>
            item.itemName.toLowerCase().includes(searchTerm) ||
            item.material.toLowerCase().includes(searchTerm) ||
            item.platingTypes.some(type => type.toLowerCase().includes(searchTerm))
        )
    );
}


    // Apply status filter
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter) {
      filteredAndSortedOrders = filteredAndSortedOrders.filter(
        (order) => order.status === statusFilter
      );
    }

    // Apply customer filter
    const customerFilter = document.getElementById('customerFilter').value;
    if (customerFilter) {
      filteredAndSortedOrders = filteredAndSortedOrders.filter(
        (order) => order.customer.id === customerFilter
      );
    }

    // Apply date (month) filter
    const dateFilter = document.getElementById('dateFilter').value;
    if (dateFilter) {
      filteredAndSortedOrders = filteredAndSortedOrders.filter((order) =>
        order.createdAt.startsWith(dateFilter)
      );
    }

    if(filteredAndSortedOrders) {

        // Apply sorting
        filteredAndSortedOrders.sort((a, b) => {
      let aValue, bValue;
      if (sortColumn === 'customer.name') {
        aValue = a.customer.name.toLowerCase();
        bValue = b.customer.name.toLowerCase();
      } else if (sortColumn === 'id') {
        // Custom numeric sort for "ORD-0001" type IDs
        aValue = parseInt(a.id.split('-')[1]);
        bValue = parseInt(b.id.split('-')[1]);
    } else if (sortColumn === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
    } else if (sortColumn === 'orderTotal') {
        aValue = a.orderTotal;
        bValue = b.orderTotal;
    }
      else {
        // Default to string comparison for other columns
        aValue = String(a[sortColumn]).toLowerCase();
        bValue = String(b[sortColumn]).toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
});

// Pagination logic
    const totalPages = Math.ceil(filteredAndSortedOrders.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex);
    
    // Update order count display
    document.getElementById('order-count').textContent = `Showing ${paginatedOrders.length} of ${filteredAndSortedOrders.length} orders`;
    
    // Populate table rows
    paginatedOrders.forEach((order) => {
        const row = tableBody.insertRow();
        row.setAttribute('data-order-id', order.id); // Set data attribute for highlighting
        
        // Determine status badge class
        const statusBadgeClass = getStatusBadgeClass(order.status);
        
        // Get item summary for display in table
        const itemSummary = order.items.map(item => `${item.itemName} (${item.quantity}kg)`).join(', ');
        
        row.innerHTML = `
        <td>${order.id}</td>
            <td>${order.customer.name}</td>
            <td>${itemSummary}</td>
            <td>₹${order.orderTotal.toFixed(2)}</td>
            <td><span class="status-badge ${statusBadgeClass}">${order.status}</span></td>
            <td>${order.createdAt}</td>
            <td class="action-buttons">
            <button class="btn btn-sm btn-info text-white" onclick="viewOrderDetails('${
                order.id
                }')" title="View Details"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-warning text-white" onclick="editOrder('${
                    order.id
                    }')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteOrder('${
                        order.id
                        }')" title="Delete"><i class="fas fa-trash"></i></button>
                        </td>
                        `;
    });
    renderPagination(totalPages, filteredAndSortedOrders.length); // Render pagination controls
    updateSummaryCards(); // Update dashboard summary
  }
}

  /**
   * Renders the pagination controls.
   * @param {number} totalPages - The total number of pages.
   * @param {number} totalOrdersCount - The total count of filtered orders.
   */
  function renderPagination(totalPages, totalOrdersCount) {
    const paginationUl = document.getElementById('pagination');
    paginationUl.innerHTML = ''; // Clear existing pagination

    document.getElementById('order-count').textContent = `Showing ${Math.min(
      rowsPerPage,
      totalOrdersCount - (currentPage - 1) * rowsPerPage
    )} of ${totalOrdersCount} orders`;

    if (totalPages > 1) {
      // Previous button
      const prevLi = document.createElement('li');
      prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
      prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${
        currentPage - 1
      })">Previous</a>`;
      paginationUl.appendChild(prevLi);

      // Page number buttons
      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
        paginationUl.appendChild(li);
      }

      // Next button
      const nextLi = document.createElement('li');
      nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
      nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${
        currentPage + 1
      })">Next</a>`;
      paginationUl.appendChild(nextLi);
    }
  }

  /**
   * Changes the current page for pagination and re-renders orders.
   * @param {number} page - The page number to navigate to.
   */
  function changePage(page) {
    if (page < 1 || page > Math.ceil(orders.length / rowsPerPage)) {
      return; // Prevent invalid page navigation
    }
    currentPage = page;
    renderOrders();
  }

  /**
   * Sorts the orders table by a specified column.
   * Toggles sort direction if the same column is clicked again.
   * @param {string} column - The column to sort by.
   */
  function sortOrders(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc'; // Default to ascending when changing column
    }
    renderOrders();
  }

  /**
   * Filters the orders based on current search and filter selections.
   * Resets to the first page.
   */
  function filterOrders() {
    currentPage = 1; // Reset to first page on filter change
    renderOrders();
  }

  /**
   * Updates the summary cards (Total Orders, Pending, Completed, Total Revenue).
   */
  function updateSummaryCards() {
    document.getElementById('total-orders').textContent = orders.length;
    document.getElementById('pending-orders').textContent = orders.filter(
      (order) => order.status === 'Pending' || order.status === 'In Progress'
    ).length;
    document.getElementById('completed-orders').textContent = orders.filter(
      (order) => order.status === 'Completed' || order.status === 'Delivered'
    ).length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.orderTotal, 0);
    document.getElementById('total-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
  }

  /**
   * Displays detailed information about a specific order in a modal.
   * @param {string} id - The ID of the order to view.
   */
  function viewOrderDetails(id) {
    const order = orders.find((o) => o.id === id);
    if (!order) {
      showLiveAlert('Order not found.', 'danger');
      return;
    }

    const customer = customers.find((c) => c.id === order.customer.id);
    const customerPhone = customer ? customer.phone : 'N/A';

    let itemsHtml = order.items.map((item, index) => `
        <h6>Item ${index + 1}: ${item.itemName}</h6>
        <ul>
            <li><strong>Material:</strong> ${item.material}</li>
            <li><strong>Plating Types:</strong> ${item.platingTypes.join(', ')}</li>
            <li><strong>Plating Prices (per kg):</strong> ${item.platingPrices.join(', ')}</li>
            <li><strong>Quantity (kg):</strong> ${item.quantity}</li>
            <li><strong>Rate per kg:</strong> ₹${item.itemRatePerKg.toFixed(2)}</li>
            <li><strong>Item Total:</strong> ₹${item.itemTotal.toFixed(2)}</li>
        </ul>
    `).join('');


    const modalContent = document.getElementById('orderDetailsContent');
    modalContent.innerHTML = `
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Customer Name:</strong> ${order.customer.name}</p>
        <p><strong>Customer Phone:</strong> ${customerPhone}</p>
        <p><strong>Order Date:</strong> ${order.createdAt}</p>
        <p><strong>Status:</strong> <span class="status-badge ${getStatusBadgeClass(
          order.status
        )}">${order.status}</span></p>
        <p><strong>GST Applied:</strong> ${order.gstApply === 'yes' ? 'Yes (18%)' : 'No'}</p>
        <hr>
        ${itemsHtml}
        <hr>
        <h5 class="text-end"><strong>Order Grand Total:</strong> ₹${order.orderTotal.toFixed(2)}</h5>
    `;
    const orderDetailsModal = new bootstrap.Modal(
      document.getElementById('orderDetailsModal')
    );
    orderDetailsModal.show();
  }

  /**
   * Returns the appropriate Bootstrap badge class for a given order status.
   * @param {string} status - The status of the order.
   * @returns {string} The CSS class string for the badge.
   */
  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Pending':
        return 'bg-warning text-dark';
      case 'In Progress':
        return 'bg-info';
      case 'Completed':
        return 'bg-success';
      case 'Delivered':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  // Variable to store the order being edited
  let orderToEdit = null;

  /**
   * Populates the order form with data from an existing order for editing.
   * Changes the "Create Order" button to "Update Order".
   * @param {string} id - The ID of the order to edit.
   */
  function editOrder(id) {
    orderToEdit = orders.find((o) => o.id === id);
    if (!orderToEdit) {
      showLiveAlert('Order not found for editing.', 'danger');
      return;
    }

    // Populate main order fields
    $('#customerSelect').val(orderToEdit.customer.id).trigger('change');
    document.getElementById('status').value = orderToEdit.status;
    document.getElementById('gstApply').value = orderToEdit.gstApply;
    document.getElementById('orderDate').value = orderToEdit.createdAt;

    // Clear existing item rows and populate with order's items
    const itemRowsContainer = document.getElementById('itemRowsContainer');
    itemRowsContainer.innerHTML = '';
    orderToEdit.items.forEach(item => {
        addEmptyItemRow(item); // Pass item data to pre-fill
    });

    // Change "Create Order" button to "Update Order"
    const addOrderBtn = document.getElementById('addOrderBtn');
    addOrderBtn.innerHTML = '<i class="fas fa-edit me-1"></i> Update Order';
    addOrderBtn.onclick = updateOrder; // Change button's click handler

    showLiveAlert(`Editing Order ID: ${orderToEdit.id}`, 'info');
  }

  /**
   * Updates an existing order with new data from the form.
   * Recalculates total and reverts the button to "Create Order".
   */
  function updateOrder() {
    if (!orderToEdit) {
      showLiveAlert('No order selected for update.', 'danger');
      return;
    }

    const customerId = document.getElementById('customerSelect').value;
    const status = document.getElementById('status').value;
    const gstApply = document.getElementById('gstApply').value;
    const orderDate = document.getElementById('orderDate').value;

    const itemRows = document.querySelectorAll('#itemRowsContainer .item-row');
    if (itemRows.length === 0) {
        showLiveAlert('Please add at least one item to the order.', 'danger');
        return;
    }

    const updatedOrderItems = [];
    let newOrderTotal = 0;
    let hasError = false;

    itemRows.forEach((row, index) => {
        const itemName = row.querySelector('.item-name-input').value.trim();
        const material = row.querySelector('.item-material-select').value;
        const platingTypeSelect = $(row).find('.item-plating-type-select');
        const platingTypes = platingTypeSelect.val() || [];
        const platingPricesInput = row.querySelector('.item-plating-prices-input').value.trim();
        const quantity = parseFloat(row.querySelector('.item-quantity-input').value);

        if (!itemName || !material || platingTypes.length === 0 || !platingPricesInput || isNaN(quantity) || quantity <= 0) {
            showLiveAlert(`Please fill in all fields for Item ${index + 1}.`, 'danger');
            hasError = true;
            return;
        }

        const platingPrices = platingPricesInput.split(',').map(Number);
        if (platingPrices.length !== platingTypes.length) {
            showLiveAlert(`Number of plating prices must match plating types for Item ${index + 1}.`, 'danger');
            hasError = true;
            return;
        }

        const itemRatePerKg = platingPrices.reduce((sum, price) => sum + price, 0);
        let itemCalculatedTotal = itemRatePerKg * quantity;
        if (gstApply === 'yes') {
            itemCalculatedTotal *= 1.18;
        }

        updatedOrderItems.push({
            itemName,
            material,
            platingTypes,
            platingPrices,
            quantity,
            itemRatePerKg: parseFloat(itemRatePerKg.toFixed(2)),
            itemTotal: parseFloat(itemCalculatedTotal.toFixed(2)),
        });
        newOrderTotal += itemCalculatedTotal;
    });

    if (hasError) {
        return;
    }

    if (!customerId || !status || !orderDate) {
        showLiveAlert('Please select a customer, status, and order date.', 'danger');
        return;
    }

    const customer = customers.find((cust) => cust.id === customerId);
    if (!customer) {
      showLiveAlert('Selected customer not found.', 'danger');
      return;
    }

    // Update the existing order object in the array
    orderToEdit.customer = { id: customer.id, name: customer.name };
    orderToEdit.status = status;
    orderToEdit.gstApply = gstApply;
    orderToEdit.createdAt = orderDate;
    orderToEdit.items = updatedOrderItems;
    orderToEdit.orderTotal = parseFloat(newOrderTotal.toFixed(2));

    saveData(); // Persist changes
    renderOrders(); // Re-render table
    updateSummaryCards(); // Update summary
    clearOrderForm(); // Clear form

    // Revert button back to "Create Order" state
    const addOrderBtn = document.getElementById('addOrderBtn');
    addOrderBtn.innerHTML = '<i class="fas fa-save me-1"></i> Create Order';
    addOrderBtn.onclick = addOrder; // Revert click handler
    orderToEdit = null; // Clear the order being edited

    showLiveAlert('Order updated successfully!');
  }

  /**
   * Deletes an order after user confirmation.
   * @param {string} id - The ID of the order to delete.
   */
  function deleteOrder(id) {
    // Using native confirm for simplicity, but a custom modal is recommended for better UX
    if (confirm('Are you sure you want to delete this order?')) {
      orders = orders.filter((order) => order.id !== id); // Remove order from array
      saveData(); // Persist changes
      renderOrders(); // Re-render table
      updateSummaryCards(); // Update summary
      showLiveAlert('Order deleted successfully!', 'danger');
    }
  }

  /**
   * Opens the confirmation modal for clearing all data.
   */
  function confirmClearData() {
    const clearDataModal = new bootstrap.Modal(
      document.getElementById('clearDataModal')
    );
    clearDataModal.show();
    document.getElementById('deleteConfirmation').value = ''; // Clear input on modal open
    document.getElementById('confirmDeleteBtn').disabled = true; // Disable button
  }

  /**
   * Clears all customer and order data from localStorage and the application.
   * Requires user to type "DELETE" for confirmation.
   */
  function clearAllData() {
    const confirmationInput = document.getElementById('deleteConfirmation').value;
    if (confirmationInput === 'DELETE') {
      localStorage.removeItem('electroplatingCustomers');
      localStorage.removeItem('electroplatingOrders');
      customers = []; // Clear in-memory arrays
      orders = [];
      renderCustomers(); // Update UI
      renderOrders();
      updateSummaryCards();
      const clearDataModal = bootstrap.Modal.getInstance(
        document.getElementById('clearDataModal')
      );
      clearDataModal.hide(); // Hide modal
      showLiveAlert('All data has been cleared!', 'danger');
    } else {
      showLiveAlert('Type "DELETE" to confirm data deletion.', 'danger');
    }
  }

  /**
   * Adds a temporary highlight animation to an order row in the table.
   * @param {string} orderId - The ID of the order row to highlight.
   */
  function highlightOrder(orderId) {
    const row = document.querySelector(`[data-order-id="${orderId}"]`);
    if (row) {
      row.classList.add('order-highlight');
      setTimeout(() => {
        row.classList.remove('order-highlight');
      }, 2000); // Remove highlight after 2 seconds
    }
  }

  /**
   * Exports all order data to a CSV file.
   */
  function exportToCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent +=
      'Order ID,Customer,Items (Name, Material, Plating, Qty, Rate/kg, Item Total),Total,Status,Date\n';

    orders.forEach((order) => {
      // Flatten items into a single string for CSV
      const itemsDetails = order.items.map(item =>
        `${item.itemName} (${item.material}, ${item.platingTypes.join('/')}, ${item.quantity}kg, ₹${item.itemRatePerKg.toFixed(2)}/kg, ₹${item.itemTotal.toFixed(2)})`
      ).join('; '); // Use semicolon to separate multiple items

      const row = [
        order.id,
        order.customer.name,
        `"${itemsDetails}"`, // Enclose with quotes for commas/semicolons within cell
        order.orderTotal.toFixed(2),
        order.status,
        order.createdAt,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'electroplating_orders.csv');
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
    showLiveAlert('Orders exported to CSV!');
  }

  /**
   * Generates a monthly bill as a PDF for a selected customer and month.
   */
  function generateMonthlyBill() {
    const customerId = document.getElementById('billingCustomer').value;
    const billingMonth = document.getElementById('billingMonth').value; //
    if (!customerId || !billingMonth) {
      showLiveAlert('Please select both customer and month for billing.', 'danger');
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      showLiveAlert('Customer not found for billing.', 'danger');
      return;
    }

    // Filter orders for the selected customer and month
    const filteredOrders = orders.filter(
      (order) =>
        order.customer.id === customerId && order.createdAt.startsWith(billingMonth)
    );

    if (filteredOrders.length === 0) {
      showLiveAlert('No orders found for the selected customer and month.', 'info');
      return;
    }

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Debugging: Check if autoTable is available
    if (typeof doc.autoTable === 'undefined') {
        console.error("doc.autoTable is not a function. jsPDF-AutoTable plugin might not be loaded correctly.");
        showLiveAlert("PDF generation failed: AutoTable plugin not found.", "danger");
        return;
    }

    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Monthly Bill', 105, yPos, null, null, 'center');
    yPos += 10;

    // Customer and Month Info
    doc.setFontSize(12);
    doc.text(`Customer: ${customer.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Phone: ${customer.phone}`, 20, yPos);
    yPos += 7;
    doc.text(`Billing Month: ${billingMonth}`, 20, yPos);
    yPos += 15;

    // Table headers for the PDF
    const tableColumn = [
      'Order ID',
      'Item Name',
      'Material',
      'Plating Types',
      'Qty (kg)',
      'Rate/kg',
      'Item Total',
      'Order Date',
    ];
    const tableRows = [];
    let grandTotal = 0;

    // Populate table rows with order data, flattening items
    filteredOrders.forEach((order) => {
      order.items.forEach((item, itemIndex) => {
        tableRows.push([
          itemIndex === 0 ? order.id : '', // Only show Order ID for the first item of an order
          item.itemName,
          item.material,
          item.platingTypes.join(', '),
          item.quantity,
          item.itemRatePerKg.toFixed(2),
          item.itemTotal.toFixed(2),
          itemIndex === 0 ? order.createdAt : '', // Only show Order Date for the first item
        ]);
      });
      grandTotal += order.orderTotal;
    });

    // Add table to PDF using autoTable plugin
    doc.autoTable({
      startY: yPos,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [67, 97, 238] }, // Primary color for header
      margin: { horizontal: 15 },
      didDrawPage: function (data) {
        // Add header and footer to each page
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text(
          'Electroplating Order Management System',
          data.settings.margin.left,
          10
        );
        let str = 'Page ' + doc.internal.getNumberOfPages();
        doc.text(
          str,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // Add Grand Total
    yPos = doc.autoTable.previous.finalY + 10; // Position below the table
    doc.setFontSize(14);
    doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 180, yPos, null, null, 'right');

    // Save the PDF
    doc.save(`Bill_${customer.name}_${billingMonth}.pdf`);
    showLiveAlert('Monthly bill generated successfully!');
  }

  /**
   * Prints the content of the order details modal.
   */
  function printOrderDetails() {
    const content = document.getElementById('orderDetailsContent').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Order Details</title>');
    // Include Bootstrap CSS for printing
    printWindow.document.write(
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">'
    );
    // Include custom print styles
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: 'Inter', sans-serif; padding: 20px; }
        .status-badge { font-size: 0.8em; padding: 5px 10px; border-radius: 20px; }
        /* Ensure Bootstrap background/text colors are applied for print */
        .bg-warning { background-color: #ffc107 !important; }
        .text-dark { color: #212529 !important; }
        .bg-info { background-color: #0dcaf0 !important; }
        .bg-success { background-color: #198754 !important; }
        .bg-primary { background-color: #0d6efd !important; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h2>Electroplating Order Details</h2>');
    printWindow.document.write(content); // Insert modal content
    printWindow.document.close();
    printWindow.print(); // Trigger print dialog
  }

  // Autocomplete for Item Name input field
  const itemNames = [
    'Brackets',
    'Pipes',
    'Valves',
    'Fittings',
    'Sheets',
    'Rods',
    'Springs',
    'Gears',
    'Bolts',
    'Nuts',
    'Washers',
    'Plates',
    'Housings',
    'Connectors',
    'Shafts',
    'Bushings',
  ]; // Example item names for autocomplete

  /**
   * Initializes event listeners once the DOM is fully loaded.
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    clearOrderForm(); // Start with one empty item row
    renderCustomers();
    renderOrders();
    updateSummaryCards();

    // Initialize Select2 for main dropdowns
    $('#customerSelect').select2({ placeholder: 'Select Customer', allowClear: true });
    $('#customerFilter').select2({ placeholder: 'All Customers', allowClear: true });
    $('#billingCustomer').select2({ placeholder: 'Select Customer', allowClear: true });

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = today;
    document.getElementById('billingMonth').value = new Date().toISOString().slice(0, 7);

    // Attach event listeners
    document.getElementById('addCustomerBtn').addEventListener('click', addCustomer);
    document.getElementById('addOrderBtn').addEventListener('click', addOrder);
    document.getElementById('addItemBtn').addEventListener('click', () => addEmptyItemRow());

    // Debounce filter event listeners
    document.getElementById('orderSearch').addEventListener('input', debounce(filterOrders, 300));
    document.getElementById('statusFilter').addEventListener('change', debounce(filterOrders, 100));
    $('#customerFilter').on('change', debounce(filterOrders, 100)); // Select2 change event
    document.getElementById('dateFilter').addEventListener('change', debounce(filterOrders, 100));

    // Enable/disable delete button based on confirmation input
    document
      .getElementById('deleteConfirmation')
      .addEventListener('keyup', function () {
        document.getElementById('confirmDeleteBtn').disabled =
          this.value !== 'DELETE';
      });
  });
