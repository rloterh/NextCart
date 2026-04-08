import type { StoreProfileContent } from "@/lib/storefront/store-profile";
import type { OrderStatus } from "@/types";

type CommunicationStatus = Extract<
  OrderStatus,
  "reshipping" | "return_initiated" | "return_approved" | "return_in_transit" | "return_received"
>;

interface CommunicationContext {
  orderNumber: string;
  storeName?: string | null;
  supportEmail?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  returnsPolicy?: string | null;
  processingTime?: string | null;
}

const defaultTemplates: Record<CommunicationStatus, string> = {
  reshipping:
    "We are arranging a replacement shipment for order {orderNumber}. We will share fresh tracking details as soon as the retry is booked. If you need help in the meantime, contact {supportEmail}.",
  return_initiated:
    "We have started the return review for order {orderNumber}. Please keep the item and packaging ready while we confirm the next handoff details. Questions can go to {supportEmail}.",
  return_approved:
    "Your return for order {orderNumber} has been approved. Please follow the return instructions from {storeName} and use {supportEmail} if you need support while the parcel is prepared.",
  return_in_transit:
    "The return for order {orderNumber} is in transit back to {storeName}. We will keep this page updated until the parcel is received and the final resolution is confirmed.",
  return_received:
    "The returned parcel for order {orderNumber} has been received by {storeName}. We are now completing the final resolution and will confirm the outcome shortly.",
};

const templateKeys: Record<CommunicationStatus, keyof StoreProfileContent> = {
  reshipping: "reshipTemplate",
  return_initiated: "returnInitiatedTemplate",
  return_approved: "returnApprovedTemplate",
  return_in_transit: "returnTransitTemplate",
  return_received: "returnReceivedTemplate",
};

function resolveTemplateValue(template: string, context: CommunicationContext) {
  const replacements: Record<string, string> = {
    orderNumber: context.orderNumber,
    storeName: context.storeName ?? "the vendor",
    supportEmail: context.supportEmail ?? "the store support contact",
    trackingNumber: context.trackingNumber ?? "tracking will be shared soon",
    trackingUrl: context.trackingUrl ?? "tracking details will be shared soon",
    returnsPolicy: context.returnsPolicy ?? "the published returns policy",
    processingTime: context.processingTime ?? "the current fulfillment timeline",
  };

  return template.replace(/\{(\w+)\}/g, (_, token: string) => replacements[token] ?? "");
}

export function renderOrderCommunicationTemplate(
  status: CommunicationStatus,
  profile: StoreProfileContent | null,
  context: CommunicationContext
) {
  const customTemplate = profile?.[templateKeys[status]];
  const template = typeof customTemplate === "string" && customTemplate.trim() ? customTemplate : defaultTemplates[status];
  return resolveTemplateValue(template, {
    ...context,
    supportEmail: context.supportEmail ?? profile?.supportEmail ?? null,
    returnsPolicy: context.returnsPolicy ?? profile?.returnsPolicy ?? null,
    processingTime: context.processingTime ?? profile?.processingTime ?? null,
  });
}
