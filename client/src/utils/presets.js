/**
 * Preset API configurations for quick testing and demonstration
 */

export const PRESETS = [
  {
    id: 'demo-orders',
    name: '🛒 E-Commerce Orders (Demo Default)',
    description: 'Built-in Order API with deliberate negative-quantity validation defect',
    method: 'POST',
    path: '/api/demo/orders',
    expectedStatus: 201,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      productId: 101,
      quantity: 2,
      unitPrice: 500
    },
    sampleResponse: {
      success: true,
      message: 'Order created successfully',
      order: {
        orderId: 1001,
        productId: 101,
        quantity: 2,
        unitPrice: 500,
        totalPrice: 1000,
        status: 'created',
        createdAt: '2026-10-24T10:00:00.000Z'
      }
    },
    businessRules: 'Quantity must be greater than zero. Unit price cannot be negative. The total price must equal quantity multiplied by unit price. Missing required fields must be rejected with 400 Bad Request.'
  },
  {
    id: 'user-signup',
    name: '👤 User Registration API',
    description: 'User signup with email validation, password minimums, and age constraint',
    method: 'POST',
    path: 'https://api.example.com/v1/users',
    expectedStatus: 201,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      username: 'alex_dev',
      email: 'alex@example.com',
      age: 24,
      role: 'developer'
    },
    sampleResponse: {
      id: 'usr_98124',
      username: 'alex_dev',
      email: 'alex@example.com',
      status: 'active'
    },
    businessRules: 'Email must be a valid email format. Age must be at least 18 and no greater than 120. Username must be alphanumeric and between 3 to 20 characters. Duplicate emails must return 409 Conflict.'
  },
  {
    id: 'payment-charge',
    name: '💳 Payment Transaction API',
    description: 'Payment charge endpoint with idempotency and currency validation',
    method: 'POST',
    path: 'https://api.example.com/v1/charges',
    expectedStatus: 200,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'idem_9482710381'
    },
    body: {
      amount: 4999,
      currency: 'USD',
      customerId: 'cus_81920',
      sourceToken: 'tok_visa_4242'
    },
    sampleResponse: {
      chargeId: 'ch_38192014',
      amount: 4999,
      currency: 'USD',
      status: 'succeeded'
    },
    businessRules: 'Amount must be a positive integer in smallest currency unit (cents). Currency must be one of [USD, EUR, GBP]. Idempotency-Key header is required. Zero or negative amounts must return 400 Bad Request.'
  }
];
