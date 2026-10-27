import "server-only";

// The online payment gateway (card, wallet) behind one small interface, so a real
// provider can be added without touching checkout. Which one runs is set by the
// PAYMENT_GATEWAY environment variable:
//
//   (unset)   no "Pay online" option; owners pay by transfer
//   test      a pretend gateway for trying the flow; refused in production unless ALLOW_TEST_PAYMENTS=1
//
// Adding a real provider (Safepay, PayFast, JazzCash, …) once Reputra has a merchant account:
//   1. add an object below with `start()` returning the provider's hosted checkout URL for the payment,
//   2. add src/app/api/payments/<provider>/route.ts that verifies the provider's signed callback and
//      calls confirmPayment(paymentId, null, ["pending"]) or markPaymentFailed(paymentId),
//   3. set PAYMENT_GATEWAY=<provider> and the provider's keys in Vercel.

export type GatewayPayment = { id: string; reference: string; amount: number };

export type Gateway = {
  id: "test";
  label: string;
  start(payment: GatewayPayment): Promise<{ redirectUrl: string }>;
};

const testGateway: Gateway = {
  id: "test",
  label: "Card or wallet (test mode)",
  async start(payment) {
    return { redirectUrl: `/checkout/test-gateway?ref=${encodeURIComponent(payment.reference)}` };
  },
};

export function activeGateway(): Gateway | null {
  const name = process.env.PAYMENT_GATEWAY;
  if (name === "test") {
    const allowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_PAYMENTS === "1";
    return allowed ? testGateway : null;
  }
  return null;
}
