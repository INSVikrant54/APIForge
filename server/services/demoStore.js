/**
 * Demo API In-Memory Store & Mode Configuration
 * Supports Safe Mode vs. Vulnerable Demo Mode
 */

class DemoStore {
  constructor() {
    // Default to 'vulnerable' so the user can immediately observe the AI finding the bug!
    this.mode = 'vulnerable';
    this.orders = [];
    this.nextOrderId = 1001;
  }

  getMode() {
    return {
      mode: this.mode,
      isVulnerable: this.mode === 'vulnerable',
      description: this.mode === 'vulnerable'
        ? 'Vulnerable Demo Mode: Intentionally omits quantity validation (allows negative quantity <= 0), producing an invalid 201 Created response.'
        : 'Safe Mode: Full server-side validation is active. Non-positive quantities and negative prices are rejected with 400 Bad Request.'
    };
  }

  setMode(newMode) {
    if (newMode !== 'safe' && newMode !== 'vulnerable') {
      throw new Error("Mode must be either 'safe' or 'vulnerable'");
    }
    this.mode = newMode;
    return this.getMode();
  }

  reset() {
    this.orders = [];
    this.nextOrderId = 1001;
    return { success: true, message: 'Demo orders reset to initial state' };
  }

  createOrder(data) {
    const { productId, quantity, unitPrice, notes } = data;

    // 1. Missing field validations (Both modes enforce basic structure)
    if (productId === undefined || productId === null) {
      return { status: 400, body: { error: 'Missing required field: productId', field: 'productId' } };
    }
    if (quantity === undefined || quantity === null) {
      return { status: 400, body: { error: 'Missing required field: quantity', field: 'quantity' } };
    }
    if (unitPrice === undefined || unitPrice === null) {
      return { status: 400, body: { error: 'Missing required field: unitPrice', field: 'unitPrice' } };
    }

    // 2. Type validations
    if (typeof productId !== 'number' || !Number.isInteger(productId)) {
      return { status: 400, body: { error: 'productId must be an integer', field: 'productId' } };
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
      return { status: 400, body: { error: 'quantity must be a valid number', field: 'quantity' } };
    }
    if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) {
      return { status: 400, body: { error: 'unitPrice must be a valid number', field: 'unitPrice' } };
    }

    // 3. Negative price check (Both modes enforce non-negative prices)
    if (unitPrice < 0) {
      return { status: 400, body: { error: 'Unit price cannot be negative', field: 'unitPrice' } };
    }

    // 4. Quantity validation: THIS IS THE INTENTIONAL BUG DIFFERENCE
    if (this.mode === 'safe') {
      // Safe mode properly enforces quantity > 0
      if (quantity <= 0) {
        return { 
          status: 400, 
          body: { 
            error: 'Quantity must be greater than zero', 
            field: 'quantity',
            received: quantity 
          } 
        };
      }
    } else {
      // Vulnerable mode: Deliberately bypasses quantity <= 0 validation!
      // This allows negative or zero quantities to create an order, returning 201 Created.
    }

    // Calculate total price
    const totalPrice = Number((quantity * unitPrice).toFixed(2));

    const order = {
      orderId: this.nextOrderId++,
      productId,
      quantity,
      unitPrice,
      totalPrice,
      notes: notes || null,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    this.orders.push(order);

    return {
      status: 201,
      body: {
        success: true,
        message: 'Order created successfully',
        order,
        _demoMeta: {
          processedInMode: this.mode,
          note: this.mode === 'vulnerable' && quantity <= 0 
            ? '⚠️ VULNERABLE BEHAVIOR: Order was created with invalid quantity <= 0 because Vulnerable Demo Mode is enabled.' 
            : undefined
        }
      }
    };
  }
}

export const demoStore = new DemoStore();
