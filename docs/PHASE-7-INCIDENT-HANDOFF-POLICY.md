# Phase 7 Incident Handoff Policy

## Purpose

Use this policy when diagnostics, payouts, disputes, moderation, or automation failures need to move from detection into an explicit support or operations handoff.

## Core Rules

- always capture the `x-request-id` or displayed request trace before escalating
- prefer a generated support bundle when an incident appears on `/admin/system`
- separate the failure class before escalating:
  - `config`
  - `permission`
  - `migration`
  - `dependency`
- route the case to the queue that matches the current pressure instead of sending operators into generic admin views

## Escalation Flow

1. Confirm the current incident on `/admin/system`.
2. Review the linked boundary diagnostics and runbook.
3. Download the support handoff bundle for the incident when available.
4. Open the linked queue directly from the incident or runbook.
5. If finance or governance needs an artifact, use the recommended export handoff.
6. Include the request trace, failure class, and runbook id in the handoff summary.

## Workflow Ownership

- configuration recovery:
  - owner: platform admin or release owner
- automation delivery:
  - owner: operations lead
- payout reconciliation:
  - owner: finance or payout operations owner
- governance escalation:
  - owner: trust and safety lead

## Minimum Handoff Contents

Every support or operator handoff should include:

- request trace id
- incident title
- failure class
- current queue target
- operator guidance summary
- chosen runbook
- any export links or downloaded bundle references

## When Not To Escalate

- if the issue is already resolved after retry and diagnostics return to healthy
- if the failure is a known migration gap and the migration can be applied immediately by the current operator
- if the queue pressure is informational only and no customer, vendor, or payout workflow is blocked

## Review Standard

Before closing an incident handoff:

- re-run the relevant diagnostics or queue view
- confirm the degraded state is cleared or explicitly transferred
- record the request trace and resolution note in the next operator-visible surface
