/**
 * Predefined Offline Demo Test Suite
 * Used when GEMINI_API_KEY is not configured, or when developer explicitly requests offline demo mode.
 * Clearly marked as predefined, NOT AI-generated.
 */

export function getOfflineDemoPlan() {
  return {
    suiteName: "Demo Order API Verification Suite (Predefined Offline Suite)",
    summary: "Predefined deterministic test suite designed to verify the built-in Order API and demonstrate bug detection without requiring a live Gemini API key.",
    isPredefinedDemo: true,
    engine: "offline_deterministic_presets",
    assumptions: [
      "Target is the built-in Order API (/api/demo/orders)",
      "Vulnerable Demo Mode will accept negative quantities (201 Created), which will fail assertion test-004",
      "Safe Mode will reject negative quantities (400 Bad Request), causing all tests to pass"
    ],
    tests: [
      {
        id: "demo-001",
        name: "Happy Path: Standard valid order",
        category: "happy_path",
        severity: "low",
        description: "Verify standard valid order with productId, quantity, and unitPrice",
        rationale: "Ensures normal business flow functions as expected",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: 2,
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [201],
          description: "Order should be accepted with HTTP 201 Created",
          assertions: [
            { target: "body.success", operator: "equals", value: true, description: "Success flag must be true" },
            { target: "body.order.totalPrice", operator: "equals", value: 1000, description: "Total price should equal 2 * 500 = 1000" }
          ]
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-002",
        name: "Missing Field: Omit quantity",
        category: "missing_field",
        severity: "high",
        description: "Submit order with missing quantity field",
        rationale: "Required fields must be guarded against null/undefined",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [400],
          description: "API must reject missing required quantity field with 400 Bad Request",
          assertions: [
            { target: "body.error", operator: "contains", value: "quantity", description: "Error must mention quantity" }
          ]
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-003",
        name: "Type Validation: Quantity supplied as string",
        category: "type_validation",
        severity: "high",
        description: "Submit quantity as string 'two' instead of numeric 2",
        rationale: "Type coercion or unvalidated input can cause downstream calculation corruption",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: "two",
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [400],
          description: "API must reject string quantity with 400 Bad Request",
          assertions: []
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-004",
        name: "Business Rule / Defect Trigger: Negative quantity (-1)",
        category: "business_rule",
        severity: "critical",
        description: "Submit order with negative quantity (-1). This will trigger the intentional demo bug in Vulnerable Mode!",
        rationale: "Business rule states: Quantity must be greater than zero. Vulnerable demo mode omits this check and returns 201 Created.",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: -1,
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [400],
          description: "API MUST reject negative quantity with 400 Bad Request according to business rules",
          assertions: [
            { target: "status", operator: "equals", value: 400, description: "Must return HTTP 400 Bad Request" }
          ]
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-005",
        name: "Boundary Test: Zero quantity (0)",
        category: "boundary",
        severity: "medium",
        description: "Submit order with quantity of exactly 0",
        rationale: "Orders of 0 items should not be processed",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: 0,
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [400],
          description: "Quantity of zero must be rejected with 400 Bad Request",
          assertions: []
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-006",
        name: "Business Rule: Negative unit price (-500)",
        category: "business_rule",
        severity: "critical",
        description: "Submit order with negative unitPrice (-500)",
        rationale: "Unit price cannot be negative under any valid business scenario",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: 1,
            unitPrice: -500
          }
        },
        expected: {
          statusCodes: [400],
          description: "Negative unit price must be rejected with 400 Bad Request",
          assertions: []
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-007",
        name: "Missing Field: Omit productId",
        category: "missing_field",
        severity: "high",
        description: "Submit order without productId",
        rationale: "Cannot create order without a specified product",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            quantity: 2,
            unitPrice: 500
          }
        },
        expected: {
          statusCodes: [400],
          description: "Missing productId must return 400 Bad Request",
          assertions: []
        },
        requiresReview: false,
        confirmed: true
      },
      {
        id: "demo-008",
        name: "Boundary Test: Large order quantity (10,000)",
        category: "boundary",
        severity: "low",
        description: "Submit valid large order quantity (10,000)",
        rationale: "Verifies high numeric values do not overflow calculation",
        request: {
          method: "POST",
          path: "/api/demo/orders",
          headers: { "Content-Type": "application/json" },
          body: {
            productId: 101,
            quantity: 10000,
            unitPrice: 50
          }
        },
        expected: {
          statusCodes: [201],
          description: "Valid high-quantity order should be accepted",
          assertions: [
            { target: "body.order.totalPrice", operator: "equals", value: 500000, description: "Total price should be 500,000" }
          ]
        },
        requiresReview: false,
        confirmed: true
      }
    ],
    totalCount: 8,
    generatedAt: new Date().toISOString()
  };
}
