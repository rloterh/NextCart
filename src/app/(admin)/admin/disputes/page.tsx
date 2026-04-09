"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Package, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { PriorityBadge, ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { recordAdminAction } from "@/lib/admin/audit";
import { getDisputeSlaState, getSlaToneClasses } from "@/lib/admin/governance";
import { getDisputeEscalationMessage } from "@/lib/platform/notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { AdminAction, DisputeCase, DisputeIssueType, DisputePriority, DisputeStatus, PayoutHoldStatus, Profile, RefundDecision, Store } from "@/types";
import type { Order } from "@/types/orders";

type DisputesTab = "cases" | "new_case";
type CaseOrder = Pick<Order, "id" | "order_number" | "status" | "total" | "created_at">;
type CaseStore = Pick<Store, "id" | "name" | "slug" | "status">;
type CaseBuyer = Pick<Profile, "id" | "full_name" | "email">;

type DisputeCaseRecord = DisputeCase & {
  order: CaseOrder | null;
  store: CaseStore | null;
  buyer: CaseBuyer | null;
};

type EligibleOrder = Pick<Order, "id" | "order_number" | "status" | "total" | "created_at" | "buyer_id" | "store_id"> & {
  buyer: CaseBuyer | null;
  store: CaseStore | null;
};

type DisputeAction = AdminAction & {
  admin: Pick<Profile, "id" | "full_name" | "email"> | null;
};

const statusTabs: Array<{ label: string; value: DisputeStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Investigating", value: "investigating" },
  { label: "Vendor action", value: "vendor_action_required" },
  { label: "Refund pending", value: "refund_pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Dismissed", value: "dismissed" },
];

const issueOptions: Array<{ label: string; value: DisputeIssueType }> = [
  { label: "Refund request", value: "refund_request" },
  { label: "Delivery issue", value: "delivery_issue" },
  { label: "Product issue", value: "product_issue" },
  { label: "Return dispute", value: "return_dispute" },
  { label: "Payout hold", value: "payout_hold" },
];

const priorityOptions: Array<{ label: string; value: DisputePriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const refundDecisionOptions: Array<{ label: string; value: RefundDecision }> = [
  { label: "Under review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Issued", value: "issued" },
];

const payoutHoldOptions: Array<{ label: string; value: PayoutHoldStatus }> = [
  { label: "Clear", value: "clear" },
  { label: "Hold requested", value: "hold_requested" },
  { label: "On hold", value: "on_hold" },
  { label: "Released", value: "released" },
];

const editableStatuses: DisputeStatus[] = ["open", "investigating", "vendor_action_required", "refund_pending", "resolved", "dismissed"];

function isMissingDisputesTable(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("dispute_cases") || normalized.includes("relation") || normalized.includes("does not exist");
}

function isMissingDisputeWorkflowColumns(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("refund_decision") || normalized.includes("payout_hold_status") || normalized.includes("column");
}

function normalizeDisputeCase(entry: Partial<DisputeCaseRecord>): DisputeCaseRecord {
  return {
    ...entry,
    refund_decision: (entry.refund_decision as RefundDecision | undefined) ?? "under_review",
    refund_decided_at: entry.refund_decided_at ?? null,
    payout_hold_status: (entry.payout_hold_status as PayoutHoldStatus | undefined) ?? "clear",
    payout_hold_reason: entry.payout_hold_reason ?? null,
    assigned_admin_id: entry.assigned_admin_id ?? null,
    resolution: entry.resolution ?? null,
    requested_resolution: entry.requested_resolution ?? null,
    admin_notes: entry.admin_notes ?? null,
    vendor_notes: entry.vendor_notes ?? null,
    refund_amount: entry.refund_amount ?? null,
    resolved_at: entry.resolved_at ?? null,
  } as DisputeCaseRecord;
}

export default function AdminDisputesPage() {
  const addToast = useUIStore((state) => state.addToast);
  const [cases, setCases] = useState<DisputeCaseRecord[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [workflowMigrationRequired, setWorkflowMigrationRequired] = useState(false);
  const [tab, setTab] = useState<DisputesTab>("cases");
  const [filter, setFilter] = useState<DisputeStatus | "all">("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [issueType, setIssueType] = useState<DisputeIssueType>("refund_request");
  const [priority, setPriority] = useState<DisputePriority>("medium");
  const [summary, setSummary] = useState("");
  const [requestedResolution, setRequestedResolution] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingCase, setSavingCase] = useState(false);
  const [admins, setAdmins] = useState<Array<Pick<Profile, "id" | "full_name" | "email">>>([]);
  const [actionHistory, setActionHistory] = useState<Record<string, DisputeAction[]>>({});

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMigrationRequired(false);
    setWorkflowMigrationRequired(false);
    const supabase = getSupabaseBrowserClient();
    const [casesRes, ordersRes, adminsRes, actionsRes, workflowRes] = await Promise.all([
      supabase.from("dispute_cases").select("*, order:orders(id, order_number, status, total, created_at), store:stores(id, name, slug, status), buyer:profiles(id, full_name, email)").order("created_at", { ascending: false }),
      supabase.from("orders").select("id, order_number, status, total, created_at, buyer_id, store_id, buyer:profiles(id, full_name, email), store:stores(id, name, slug, status)").order("created_at", { ascending: false }).limit(150),
      supabase.from("profiles").select("id, full_name, email").eq("role", "admin").order("full_name", { ascending: true }),
      supabase.from("admin_actions").select("*, admin:profiles(id, full_name, email)").eq("entity_type", "dispute_case").order("created_at", { ascending: false }).limit(200),
      supabase.from("dispute_cases").select("id, refund_decision, payout_hold_status").limit(1),
    ]);

    if (casesRes.error) {
      setCases([]);
      setEligibleOrders([]);
      setAdmins([]);
      setActionHistory({});
      setMigrationRequired(isMissingDisputesTable(casesRes.error.message));
      setError(casesRes.error.message);
      setLoading(false);
      return;
    }

    const firstFollowupError = [ordersRes.error, adminsRes.error, actionsRes.error].find(Boolean);
    if (firstFollowupError) {
      setCases([]);
      setEligibleOrders([]);
      setAdmins([]);
      setActionHistory({});
      setError(firstFollowupError.message);
      setLoading(false);
      return;
    }

    if (workflowRes.error && isMissingDisputeWorkflowColumns(workflowRes.error.message)) {
      setWorkflowMigrationRequired(true);
    }

    const nextCases = ((casesRes.data ?? []) as Partial<DisputeCaseRecord>[]).map(normalizeDisputeCase);
    const activeOrderIds = new Set(nextCases.filter((entry) => !["resolved", "dismissed"].includes(entry.status)).map((entry) => entry.order_id));
    const nextEligibleOrders = ((ordersRes.data ?? []) as EligibleOrder[]).filter((order) => !activeOrderIds.has(order.id));
    const historyMap: Record<string, DisputeAction[]> = {};
    for (const action of ((actionsRes.data ?? []) as DisputeAction[])) {
      historyMap[action.entity_id] ??= [];
      historyMap[action.entity_id].push(action);
    }
    setCases(nextCases);
    setEligibleOrders(nextEligibleOrders);
    setAdmins((adminsRes.data ?? []) as Array<Pick<Profile, "id" | "full_name" | "email">>);
    setActionHistory(historyMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDisputes();
  }, [fetchDisputes]);

  const visibleCases = useMemo(() => cases.filter((entry) => filter === "all" || entry.status === filter), [cases, filter]);

  useEffect(() => {
    if (!visibleCases.length) {
      setSelectedCaseId(null);
      return;
    }
    if (!selectedCaseId || !visibleCases.some((entry) => entry.id === selectedCaseId)) {
      setSelectedCaseId(visibleCases[0].id);
    }
  }, [selectedCaseId, visibleCases]);

  useEffect(() => {
    if (!selectedOrderId && eligibleOrders.length > 0) setSelectedOrderId(eligibleOrders[0].id);
  }, [eligibleOrders, selectedOrderId]);

  const selectedCase = visibleCases.find((entry) => entry.id === selectedCaseId) ?? null;
  const selectedOrder = eligibleOrders.find((entry) => entry.id === selectedOrderId) ?? null;
  const selectedHistory = selectedCase ? actionHistory[selectedCase.id] ?? [] : [];
  const caseStats = {
    open: cases.filter((entry) => entry.status === "open").length,
    pendingRefund: cases.filter((entry) => entry.status === "refund_pending").length,
    critical: cases.filter((entry) => entry.priority === "critical").length,
    resolved: cases.filter((entry) => entry.status === "resolved").length,
  };
  const activeCases = cases.filter((entry) => !["resolved", "dismissed"].includes(entry.status));
  const disputeEscalation = getDisputeEscalationMessage({
    breaches: activeCases.filter((entry) => getDisputeSlaState(entry.created_at, entry.priority, entry.status).tone === "danger").length,
    atRisk: activeCases.filter((entry) => getDisputeSlaState(entry.created_at, entry.priority, entry.status).tone === "warning").length,
    unassigned: activeCases.filter((entry) => !entry.assigned_admin_id).length,
  });

  async function getCurrentAdminId() {
    const supabase = getSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      addToast({ type: "error", title: "Admin session unavailable", description: authError?.message ?? "Please refresh and try again." });
      return null;
    }
    return user.id;
  }

  async function createCase() {
    if (!selectedOrder) {
      addToast({ type: "error", title: "Select an order", description: "Choose the order that needs dispute review first." });
      return;
    }
    if (!summary.trim()) {
      addToast({ type: "error", title: "Summary required", description: "Add a concise summary before opening the case." });
      return;
    }

    const adminId = await getCurrentAdminId();
    if (!adminId) return;

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase.from("dispute_cases").insert({
      order_id: selectedOrder.id,
      store_id: selectedOrder.store_id,
      buyer_id: selectedOrder.buyer_id,
      issue_type: issueType,
      priority,
      summary: summary.trim(),
      requested_resolution: requestedResolution.trim() || null,
      admin_notes: adminNotes.trim() || null,
      refund_amount: refundAmount ? Number(refundAmount) : null,
      assigned_admin_id: adminId,
      status: "open",
    }).select("id").single();

    if (insertError) {
      addToast({ type: "error", title: "Could not create case", description: insertError.message });
      setSubmitting(false);
      return;
    }

    await recordAdminAction(supabase, { adminId, action: "dispute.create", entityType: "dispute_case", entityId: data.id, reason: summary, metadata: { orderNumber: selectedOrder.order_number, issueType, priority } });
    addToast({ type: "success", title: "Dispute case opened", description: "The case was added to the governance queue." });
    setSummary("");
    setRequestedResolution("");
    setAdminNotes("");
    setRefundAmount("");
    setIssueType("refund_request");
    setPriority("medium");
    setTab("cases");
    await fetchDisputes();
    setSelectedCaseId(data.id);
    setSubmitting(false);
  }

  function patchSelectedCase(changes: Partial<DisputeCaseRecord>) {
    if (!selectedCase) return;
    setCases((current) => current.map((entry) => (entry.id === selectedCase.id ? { ...entry, ...changes } : entry)));
  }

  async function updateSelectedCase() {
    if (!selectedCase) return;
    const adminId = await getCurrentAdminId();
    if (!adminId) return;
    setSavingCase(true);
    const supabase = getSupabaseBrowserClient();
    const nextResolvedAt = ["resolved", "dismissed"].includes(selectedCase.status) ? new Date().toISOString() : null;
    const nextRefundDecidedAt = selectedCase.refund_decision === "under_review" ? null : new Date().toISOString();
    const updatePayload = {
      status: selectedCase.status,
      admin_notes: selectedCase.admin_notes?.trim() || null,
      resolution: selectedCase.resolution?.trim() || null,
      refund_amount: selectedCase.refund_amount ? Number(selectedCase.refund_amount) : null,
      resolved_at: nextResolvedAt,
      assigned_admin_id: selectedCase.assigned_admin_id || adminId,
      ...(workflowMigrationRequired
        ? {}
        : {
            refund_decision: selectedCase.refund_decision,
            refund_decided_at: nextRefundDecidedAt,
            payout_hold_status: selectedCase.payout_hold_status,
            payout_hold_reason: selectedCase.payout_hold_reason?.trim() || null,
          }),
    };
    const { error: updateError } = await supabase.from("dispute_cases").update(updatePayload).eq("id", selectedCase.id);

    if (updateError) {
      addToast({ type: "error", title: "Case update failed", description: updateError.message });
      setSavingCase(false);
      return;
    }

    await recordAdminAction(supabase, {
      adminId,
      action: "dispute.update",
      entityType: "dispute_case",
      entityId: selectedCase.id,
      reason: selectedCase.admin_notes || selectedCase.summary,
      metadata: {
        status: selectedCase.status,
        resolution: selectedCase.resolution,
        refundAmount: selectedCase.refund_amount,
        refundDecision: selectedCase.refund_decision,
        payoutHoldStatus: selectedCase.payout_hold_status,
        assignedAdminId: selectedCase.assigned_admin_id || adminId,
      },
    });
    addToast({ type: "success", title: "Dispute case updated", description: "The workflow state and notes were saved." });
    await fetchDisputes();
    setSavingCase(false);
  }

  return (
    <PageTransition>
      <div className="max-w-3xl">
        <PageIntro
          title="Disputes and refunds"
          description="Open and resolve marketplace cases with structured status tracking, refund context, and accountable admin notes."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Open cases", value: caseStats.open, icon: AlertTriangle },
          { label: "Refund pending", value: caseStats.pendingRefund, icon: Scale },
          { label: "Critical cases", value: caseStats.critical, icon: Clock3 },
          { label: "Resolved", value: caseStats.resolved, icon: Package },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300"><card.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
          </Card>
        ))}
      </div>

      {migrationRequired && <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">The dispute workflow needs the governance SQL migration before it can run. Apply <code>supabase-governance-foundation.sql</code> and reload this page.</Card>}
      {workflowMigrationRequired && <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">The dispute foundation is available, but advanced refund decision and payout-hold fields need <code>supabase-governance-workflows.sql</code> before those controls can save.</Card>}
      {disputeEscalation ? (
        <StatePanel
          title={disputeEscalation.title}
          description={disputeEscalation.description}
          tone={disputeEscalation.tone}
        />
      ) : null}

      <div className="flex items-center gap-1">
        {[{ label: "Existing cases", value: "cases" as const }, { label: "Open new case", value: "new_case" as const }].map((entry) => (
          <button key={entry.value} type="button" onClick={() => setTab(entry.value)} className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${tab === entry.value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}>{entry.label}</button>
        ))}
      </div>

      {tab === "cases" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1">
            {statusTabs.map((entry) => <button key={entry.value} type="button" onClick={() => setFilter(entry.value)} className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${filter === entry.value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}>{entry.label}</button>)}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
            <Card className="p-0">
              <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Case queue</p>
                <p className="mt-1 text-sm text-stone-500">{visibleCases.length} dispute case(s) match this status view.</p>
              </div>
              {loading ? (
                <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} lines={3} />)}</div>
              ) : error ? (
                <div className="p-5">
                  <StatePanel
                    tone="danger"
                    title="We could not load dispute cases"
                    description={error}
                    actionLabel="Try again"
                    onAction={() => void fetchDisputes()}
                  />
                </div>
              ) : visibleCases.length === 0 ? (
                <div className="p-5">
                  <StatePanel
                    title="No dispute cases match this view"
                    description="Try another status filter or open a new case if a buyer issue needs admin review."
                    icon={Scale}
                  />
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {visibleCases.map((entry) => {
                    const slaState = getDisputeSlaState(entry.created_at, entry.priority, entry.status);
                    return (
                    <button key={entry.id} type="button" onClick={() => setSelectedCaseId(entry.id)} className={`w-full px-5 py-4 text-left transition-colors ${selectedCaseId === entry.id ? "bg-stone-50 dark:bg-stone-800/40" : "hover:bg-stone-50/70 dark:hover:bg-stone-800/20"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <PriorityBadge priority={entry.priority} />
                            <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">{entry.status.replaceAll("_", " ")}</span>
                            <ToneBadge tone={slaState.tone === "danger" ? "danger" : slaState.tone === "warning" ? "warning" : slaState.tone === "default" ? "info" : "muted"} className={getSlaToneClasses(slaState.tone)}>
                              {slaState.label}
                            </ToneBadge>
                          </div>
                          <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{entry.summary}</p>
                          <p className="mt-1 text-xs text-stone-500">{entry.order?.order_number ?? "Unknown order"} / {entry.store?.name ?? "Unknown store"}</p>
                        </div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-400">{formatDate(entry.created_at)}</p>
                      </div>
                    </button>
                  )})}
                </div>
              )}
            </Card>

            <Card className="space-y-5">
              {!selectedCase ? (
                <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-stone-500">Select a case to inspect workflow status, refund posture, and notes.</div>
              ) : (
                <>
                  <div>
                <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={selectedCase.priority} />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">{selectedCase.issue_type.replaceAll("_", " ")}</span>
                    </div>
                    <h2 className="mt-3 font-serif text-xl text-stone-900 dark:text-white">{selectedCase.summary}</h2>
                    <p className="mt-1 text-sm text-stone-500">{selectedCase.order?.order_number ?? "Unknown order"} / {selectedCase.store?.name ?? "Unknown store"}</p>
                  </div>

                  <div className="space-y-3 border-y border-stone-100 py-4 text-sm dark:border-stone-800">
                    <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Buyer</span><span className="font-medium text-stone-900 dark:text-white">{selectedCase.buyer?.full_name || selectedCase.buyer?.email || "Buyer unavailable"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Order total</span><span className="font-medium text-stone-900 dark:text-white">{selectedCase.order ? formatPrice(Number(selectedCase.order.total)) : "Unavailable"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Requested resolution</span><span className="font-medium text-stone-900 dark:text-white">{selectedCase.requested_resolution || "Not specified"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-stone-500">SLA target</span><ToneBadge tone={getDisputeSlaState(selectedCase.created_at, selectedCase.priority, selectedCase.status).tone === "danger" ? "danger" : getDisputeSlaState(selectedCase.created_at, selectedCase.priority, selectedCase.status).tone === "warning" ? "warning" : getDisputeSlaState(selectedCase.created_at, selectedCase.priority, selectedCase.status).tone === "default" ? "info" : "muted"} className={getSlaToneClasses(getDisputeSlaState(selectedCase.created_at, selectedCase.priority, selectedCase.status).tone)}>{getDisputeSlaState(selectedCase.created_at, selectedCase.priority, selectedCase.status).label}</ToneBadge></div>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Case status<select value={selectedCase.status} onChange={(event) => patchSelectedCase({ status: event.target.value as DisputeStatus })} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{editableStatuses.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Assigned admin<select value={selectedCase.assigned_admin_id ?? ""} onChange={(event) => patchSelectedCase({ assigned_admin_id: event.target.value || null })} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200"><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.full_name || admin.email}</option>)}</select></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Refund amount<input type="number" min="0" step="0.01" value={selectedCase.refund_amount ?? ""} onChange={(event) => patchSelectedCase({ refund_amount: event.target.value ? Number(event.target.value) : null })} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Refund decision<select disabled={workflowMigrationRequired} value={selectedCase.refund_decision} onChange={(event) => patchSelectedCase({ refund_decision: event.target.value as RefundDecision })} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 disabled:cursor-not-allowed disabled:opacity-60 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{refundDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Payout hold<select disabled={workflowMigrationRequired} value={selectedCase.payout_hold_status} onChange={(event) => patchSelectedCase({ payout_hold_status: event.target.value as PayoutHoldStatus })} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 disabled:cursor-not-allowed disabled:opacity-60 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{payoutHoldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Payout hold reason<textarea disabled={workflowMigrationRequired} rows={3} value={selectedCase.payout_hold_reason ?? ""} onChange={(event) => patchSelectedCase({ payout_hold_reason: event.target.value })} className="border border-stone-200 bg-transparent px-3 py-2 text-sm font-normal text-stone-700 disabled:cursor-not-allowed disabled:opacity-60 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Admin notes<textarea rows={4} value={selectedCase.admin_notes ?? ""} onChange={(event) => patchSelectedCase({ admin_notes: event.target.value })} className="border border-stone-200 bg-transparent px-3 py-2 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
                    <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Resolution notes<textarea rows={3} value={selectedCase.resolution ?? ""} onChange={(event) => patchSelectedCase({ resolution: event.target.value })} className="border border-stone-200 bg-transparent px-3 py-2 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Case history</p>
                    {selectedHistory.length === 0 ? (
                      <p className="mt-2 text-sm text-stone-500">No actions have been logged for this case yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedHistory.slice(0, 5).map((action) => (
                          <div key={action.id} className="border border-stone-200 bg-stone-50/70 px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-950/30">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-stone-900 dark:text-white">{action.action.replaceAll("_", " ")}</p>
                                <p className="mt-1 text-xs text-stone-500">{action.admin?.full_name ?? action.admin?.email ?? "Unknown admin"}</p>
                              </div>
                              <p className="text-xs text-stone-500">{formatDate(action.created_at)}</p>
                            </div>
                            {action.reason ? <p className="mt-2 text-sm text-stone-500">{action.reason}</p> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button size="sm" isLoading={savingCase} onClick={() => void updateSelectedCase()} leftIcon={<Scale className="h-3.5 w-3.5" />}>Save case updates</Button>
                </>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card className="space-y-5">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} lines={2} />)}</div>
          ) : error ? (
            <StatePanel
              tone="danger"
              title="We could not load order context"
              description={error}
              actionLabel="Try again"
              onAction={() => void fetchDisputes()}
            />
          ) : eligibleOrders.length === 0 ? (
            <StatePanel
              title="No eligible orders right now"
              description="All loaded orders already have an active dispute case, so there is nothing new to open."
              icon={Package}
            />
          ) : (
            <>
              <div><h2 className="font-serif text-xl text-stone-900 dark:text-white">Open a new case</h2><p className="mt-1 text-sm text-stone-500">Use this when an order needs admin-led refund or dispute handling.</p></div>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Order<select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.order_number} - {order.store?.name ?? "Unknown store"}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Issue type<select value={issueType} onChange={(event) => setIssueType(event.target.value as DisputeIssueType)} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{issueOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as DisputePriority)} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200">{priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Refund amount<input type="number" min="0" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
              </div>

              {selectedOrder && <div className="grid gap-3 border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-800 dark:bg-stone-900/60 lg:grid-cols-3"><div><p className="text-[10px] font-medium uppercase tracking-widest text-stone-400">Order</p><p className="mt-2 font-medium text-stone-900 dark:text-white">{selectedOrder.order_number}</p><p className="text-stone-500">{formatDate(selectedOrder.created_at)}</p></div><div><p className="text-[10px] font-medium uppercase tracking-widest text-stone-400">Store</p><p className="mt-2 font-medium text-stone-900 dark:text-white">{selectedOrder.store?.name ?? "Unknown store"}</p><p className="text-stone-500">{selectedOrder.store?.slug ?? "No slug"}</p></div><div><p className="text-[10px] font-medium uppercase tracking-widest text-stone-400">Buyer and total</p><p className="mt-2 font-medium text-stone-900 dark:text-white">{selectedOrder.buyer?.full_name || selectedOrder.buyer?.email || "Buyer unavailable"}</p><p className="text-stone-500">{formatPrice(Number(selectedOrder.total))}</p></div></div>}

              <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Case summary<input type="text" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Summarize the customer or operational issue" className="h-10 border border-stone-200 bg-transparent px-3 text-sm font-normal text-stone-700 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Requested resolution<textarea rows={3} value={requestedResolution} onChange={(event) => setRequestedResolution(event.target.value)} placeholder="Describe the proposed resolution or next action." className="border border-stone-200 bg-transparent px-3 py-2 text-sm font-normal text-stone-700 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
              <label className="grid gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">Initial admin notes<textarea rows={4} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Capture the facts, handoff context, or policy notes that should stay with the case." className="border border-stone-200 bg-transparent px-3 py-2 text-sm font-normal text-stone-700 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" /></label>
              <Button size="sm" isLoading={submitting} onClick={() => void createCase()} leftIcon={<Scale className="h-3.5 w-3.5" />}>Open dispute case</Button>
            </>
          )}
        </Card>
      )}
    </PageTransition>
  );
}
