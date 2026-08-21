import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];

async function request(name, method, path, { token, body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  results.push({ name, status: response.status });
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];
  assert.ok(
    expectedStatuses.includes(response.status),
    `${name}: expected HTTP ${expectedStatuses.join("/")}, got ${response.status}\n${text}`,
  );
  return payload;
}

const suffix = Date.now();
const email = `ai-endpoint-test-${suffix}@example.com`;

const register = await request("register", "POST", "/auth/register", {
  body: { name: "AI Endpoint Tester", email, password: "secret123" },
});
assert.ok(register.token);

const login = await request("login", "POST", "/auth/login", {
  body: { email: email.toUpperCase(), password: "secret123" },
});
assert.ok(login.token);
const token = login.token;

const concurrentEmail = `concurrent-register-${suffix}@example.com`;
const concurrentRegistrations = await Promise.all([
  request("concurrent register A", "POST", "/auth/register", {
    body: { name: "Concurrent A", email: concurrentEmail, password: "secret123" },
    expected: [200, 409],
  }),
  request("concurrent register B", "POST", "/auth/register", {
    body: { name: "Concurrent B", email: concurrentEmail.toUpperCase(), password: "secret123" },
    expected: [200, 409],
  }),
]);
assert.equal(concurrentRegistrations.filter((result) => result.token).length, 1);

await request("protected route rejects anonymous access", "GET", "/inventory", {
  expected: 401,
});
await request("protected route rejects invalid JWT", "GET", "/inventory", {
  token: "invalid.token.value",
  expected: 401,
});

const order = await request("orders create", "POST", "/orders", {
  token,
  body: {
    tableNumber: 1,
    customerName: "Tester",
    items: [{ menuId: "menu-1", name: "Nasi", quantity: 2, price: 15_000 }],
    notes: "integration test",
  },
});
const orderId = String(order.insertedId);
await request("orders list", "GET", "/orders?page=1&limit=10", { token });
await request("orders detail", "GET", `/orders/${orderId}`, { token });
await request("orders status", "GET", "/orders/status/pending", { token });
await request("orders update", "PUT", `/orders/${orderId}`, {
  token,
  body: {
    customerName: "Updated Tester",
    items: [{ menuId: "menu-2", name: "Mie", quantity: 3, price: 10_000 }],
  },
});
const updatedOrder = await request("orders updated detail", "GET", `/orders/${orderId}`, { token });
assert.equal(updatedOrder.totalAmount, 30_000);
assert.equal(updatedOrder.items[0].subtotal, 30_000);

await request("payment rejects underpayment", "POST", "/payment", {
  token,
  body: { orderId, paidAmount: 29_999, method: "cash" },
  expected: 400,
});

const payment = await request("payment create", "POST", "/payment", {
  token,
  body: { orderId, paidAmount: 40_000, method: "cash" },
});
const paymentId = String(payment.insertedId);
await request("payment list", "GET", "/payment", { token });
await request("payment detail", "GET", `/payment/${paymentId}`, { token });
await request("payment update", "PUT", `/payment/${paymentId}`, {
  token,
  body: { notes: "checked" },
});
await request("payment refund", "PUT", `/payment/${paymentId}`, {
  token,
  body: { status: "refunded" },
});
const refundedOrder = await request("refunded payment reopens order", "GET", `/orders/${orderId}`, {
  token,
});
assert.equal(refundedOrder.status, "pending");
await request("payment mark paid", "PUT", `/payment/${paymentId}`, {
  token,
  body: { status: "paid" },
});
const repaidOrder = await request("paid payment completes order", "GET", `/orders/${orderId}`, {
  token,
});
assert.equal(repaidOrder.status, "completed");
await request("payment rejects duplicate paid order", "POST", "/payment", {
  token,
  body: { orderId, paidAmount: 30_000, method: "qris" },
  expected: 409,
});

const kitchen = await request("kitchen create", "POST", "/kitchen", {
  token,
  body: {
    orderId,
    tableNumber: 1,
    menuItems: [{ name: "Nasi", quantity: 2 }],
  },
});
const kitchenId = String(kitchen.insertedId);
await request("kitchen list", "GET", "/kitchen", { token });
await request("kitchen detail", "GET", `/kitchen/${kitchenId}`, { token });
await request("kitchen status", "GET", "/kitchen/status/pending", { token });
await request("kitchen update", "PUT", `/kitchen/${kitchenId}`, {
  token,
  body: { status: "in_progress" },
});

const inventory = await request("inventory create", "POST", "/inventory", {
  token,
  body: {
    name: `Beras ${suffix}`,
    category: "food",
    unit: "kg",
    quantity: 5,
    minimumStock: 10,
    costPrice: 12_000,
  },
});
const inventoryId = String(inventory.insertedId);
await request("inventory list", "GET", "/inventory", { token });
await request("inventory detail", "GET", `/inventory/${inventoryId}`, { token });
await request("inventory low stock", "GET", "/inventory/low-stock", { token });
await request("inventory category", "GET", "/inventory/category/food", { token });
await request("inventory adjust stock", "PATCH", `/inventory/${inventoryId}/stock`, {
  token,
  body: { amount: -2, reason: "usage" },
});
const concurrentStockResults = await Promise.all([
  request("inventory concurrent decrement A", "PATCH", `/inventory/${inventoryId}/stock`, {
    token,
    body: { amount: -2, reason: "concurrent usage" },
    expected: [200, 400, 409],
  }),
  request("inventory concurrent decrement B", "PATCH", `/inventory/${inventoryId}/stock`, {
    token,
    body: { amount: -2, reason: "concurrent usage" },
    expected: [200, 400, 409],
  }),
]);
assert.equal(concurrentStockResults.filter((result) => result.quantity === 1).length, 1);
const stockAfterConcurrentUpdate = await request(
  "inventory remains non-negative after concurrency",
  "GET",
  `/inventory/${inventoryId}`,
  { token },
);
assert.equal(stockAfterConcurrentUpdate.quantity, 1);
await request("inventory rejects negative resulting stock", "PATCH", `/inventory/${inventoryId}/stock`, {
  token,
  body: { amount: -4, reason: "too much" },
  expected: 400,
});
await request("inventory update", "PUT", `/inventory/${inventoryId}`, {
  token,
  body: { supplier: "Test Supplier" },
});

const promoCode = `TEST${suffix}`;
const promo = await request("promo create", "POST", "/promo", {
  token,
  body: {
    code: promoCode,
    name: "Test Promo",
    type: "percentage",
    discountValue: 20,
    minimumOrder: 10_000,
    maxDiscount: 10_000,
    usageLimit: 5,
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  },
});
const promoId = String(promo.insertedId);
await request("promo list", "GET", "/promo", { token });
await request("promo active", "GET", "/promo/active", { token });
await request("promo detail", "GET", `/promo/${promoId}`, { token });
const appliedPromo = await request("promo apply", "POST", "/promo/apply", {
  token,
  body: { code: promoCode, orderTotal: 40_000 },
});
assert.equal(appliedPromo.discountAmount, 8_000);
await request("promo update", "PUT", `/promo/${promoId}`, {
  token,
  body: { name: "Updated Promo" },
});
await request("promo rejects invalid updated date", "PUT", `/promo/${promoId}`, {
  token,
  body: { endDate: "not-a-date" },
  expected: 400,
});
await request("promo update enforces existing percentage type", "PUT", `/promo/${promoId}`, {
  token,
  body: { discountValue: 101 },
  expected: 400,
});
await request("promo rejects percentage above 100", "POST", "/promo", {
  token,
  body: {
    code: `OVER${suffix}`,
    name: "Invalid Percentage",
    type: "percentage",
    discountValue: 101,
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  },
  expected: 400,
});
await request("promo rejects unsupported item promo", "POST", "/promo", {
  token,
  body: {
    code: `FREE${suffix}`,
    name: "Unsupported Free Item",
    type: "free_item",
    discountValue: 0,
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  },
  expected: 400,
});

const limitedPromo = await request("limited promo create", "POST", "/promo", {
  token,
  body: {
    code: `ONE${suffix}`,
    name: "One Use Promo",
    type: "fixed",
    discountValue: 1_000,
    usageLimit: 1,
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  },
});
const limitedPromoId = String(limitedPromo.insertedId);
const concurrentPromoResults = await Promise.all([
  request("limited promo concurrent apply A", "POST", "/promo/apply", {
    token,
    body: { code: `ONE${suffix}`, orderTotal: 10_000 },
    expected: [200, 400, 409],
  }),
  request("limited promo concurrent apply B", "POST", "/promo/apply", {
    token,
    body: { code: `ONE${suffix}`, orderTotal: 10_000 },
    expected: [200, 400, 409],
  }),
]);
assert.equal(concurrentPromoResults.filter((result) => result.finalTotal === 9_000).length, 1);

const ratingBeforeDraft = await request("review rating baseline", "GET", "/review/rating?target=overall", {
  token,
});
await request("review rejects invalid rating target", "GET", "/review/rating?target=invalid", {
  token,
  expected: 400,
});
await request("review menu requires targetId", "POST", "/review", {
  token,
  body: { customerName: "Tester", target: "menu", rating: 5 },
  expected: 400,
});
const review = await request("review create", "POST", "/review", {
  token,
  body: { customerName: "Tester", target: "overall", rating: 5, comment: "Bagus" },
});
const reviewId = String(review.insertedId);
await request("review list", "GET", "/review", { token });
await request("review published", "GET", "/review/published", { token });
const ratingWithDraft = await request("review rating excludes draft", "GET", "/review/rating?target=overall", { token });
assert.equal(ratingWithDraft.totalReviews, ratingBeforeDraft.totalReviews);
await request("review target", "GET", "/review/target/overall", { token });
await request("review detail", "GET", `/review/${reviewId}`, { token });
await request("review update", "PUT", `/review/${reviewId}`, {
  token,
  body: { isPublished: true },
});
const ratingAfterPublish = await request("review rating includes published", "GET", "/review/rating?target=overall", { token });
assert.equal(ratingAfterPublish.totalReviews, ratingBeforeDraft.totalReviews + 1);

const notification = await request("notification create", "POST", "/notification", {
  token,
  body: { type: "system", target: "admin", title: "Test", message: "Test notification" },
});
const notificationId = String(notification.insertedId);
await request("notification list", "GET", "/notification", { token });
await request("notification unread", "GET", "/notification/unread", { token });
await request("notification target", "GET", "/notification/target/admin", { token });
await request("notification detail", "GET", `/notification/${notificationId}`, { token });
await request("notification update", "PUT", `/notification/${notificationId}`, {
  token,
  body: { title: "Updated" },
});
await request("notification read all", "PATCH", "/notification/read-all", {
  token,
  body: {},
});
await request("notification rejects invalid unread target", "GET", "/notification/unread?target=invalid", {
  token,
  expected: 400,
});
await request("notification rejects invalid read-all target", "PATCH", "/notification/read-all?target=invalid", {
  token,
  body: {},
  expected: 400,
});

for (const [name, path] of [
  ["analytics dashboard", "/analytics/dashboard?period=year"],
  ["analytics sales", "/analytics/sales?period=year"],
  ["analytics daily", "/analytics/sales/daily?period=year"],
  ["analytics top menu", "/analytics/menu/top?period=year&limit=5"],
  ["analytics top menu invalid limit fallback", "/analytics/menu/top?period=year&limit=abc"],
  ["analytics top menu zero limit fallback", "/analytics/menu/top?period=year&limit=0"],
  ["analytics inventory", "/analytics/inventory"],
  ["analytics reviews", "/analytics/reviews"],
]) {
  await request(name, "GET", path, { token });
}

const session = await request("assistant create", "POST", "/assistant", {
  token,
  body: { title: "Test", message: "Bagaimana penjualan?" },
});
const sessionId = String(session.sessionId);
await request("assistant list", "GET", "/assistant", { token });
await request("assistant detail", "GET", `/assistant/${sessionId}`, { token });
await request("assistant message", "POST", `/assistant/${sessionId}/message`, {
  token,
  body: { message: "Bagaimana stok?" },
});
const updatedSession = await request("assistant updated detail", "GET", `/assistant/${sessionId}`, {
  token,
});
assert.ok(updatedSession.messages.at(-1).insights?.length > 0);
await request("assistant delete", "DELETE", `/assistant/${sessionId}`, { token });

for (const [name, path] of [
  ["notification delete", `/notification/${notificationId}`],
  ["review delete", `/review/${reviewId}`],
  ["promo delete", `/promo/${promoId}`],
  ["limited promo delete", `/promo/${limitedPromoId}`],
  ["inventory delete", `/inventory/${inventoryId}`],
  ["kitchen delete", `/kitchen/${kitchenId}`],
]) {
  await request(name, "DELETE", path, { token });
}

await request("orders reject delete while payment exists", "DELETE", `/orders/${orderId}`, {
  token,
  expected: 409,
});
await request("payment delete", "DELETE", `/payment/${paymentId}`, { token });
const orderAfterPaymentDelete = await request("payment delete reopens order", "GET", `/orders/${orderId}`, {
  token,
});
assert.equal(orderAfterPaymentDelete.status, "pending");
await request("orders delete", "DELETE", `/orders/${orderId}`, { token });

console.table(results);
console.log(`Passed ${results.length} AI-related endpoint checks.`);
