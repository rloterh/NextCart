import type { Order } from "@/types/orders";

type MetricsOrder = Pick<
  Order,
  | "status"
  | "total"
  | "platform_fee"
  | "created_at"
  | "delivered_at"
  | "stripe_transfer_status"
  | "stripe_transfer_id"
>;

export function isExceptionStatus(status: Order["status"]) {
  return [
    "delivery_failed",
    "return_initiated",
    "return_approved",
    "return_in_transit",
    "return_received",
    "cancelled",
    "refunded",
  ].includes(status);
}

export function isReturnStatus(status: Order["status"]) {
  return ["return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(status);
}

export function getExceptionRate(orders: MetricsOrder[]) {
  if (orders.length === 0) return 0;
  return Math.round((orders.filter((order) => isExceptionStatus(order.status)).length / orders.length) * 100);
}

export function getReturnRate(orders: MetricsOrder[]) {
  if (orders.length === 0) return 0;
  return Math.round((orders.filter((order) => isReturnStatus(order.status)).length / orders.length) * 100);
}

export function getSettlementRate(orders: MetricsOrder[]) {
  const eligibleOrders = orders.filter((order) => ["delivered", "refunded"].includes(order.status));
  if (eligibleOrders.length === 0) return 0;
  return Math.round((eligibleOrders.filter((order) => order.stripe_transfer_status === "paid" || Boolean(order.stripe_transfer_id)).length / eligibleOrders.length) * 100);
}

export function getAverageFulfillmentDays(orders: MetricsOrder[]) {
  const deliveredOrders = orders.filter((order) => order.delivered_at);
  if (deliveredOrders.length === 0) return 0;

  const totalDays = deliveredOrders.reduce((sum, order) => {
    const start = new Date(order.created_at).getTime();
    const end = new Date(order.delivered_at as string).getTime();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return sum + days;
  }, 0);

  return Number((totalDays / deliveredOrders.length).toFixed(1));
}

export function getMonthlyNetRevenueSeries(orders: MetricsOrder[], months = 6) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const now = new Date();
  const buckets = Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      key,
      month: formatter.format(date),
      revenue: 0,
      net: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const order of orders) {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;

    bucket.revenue += Number(order.total);
    bucket.net += Number(order.total) - Number(order.platform_fee);
  }

  return buckets;
}
