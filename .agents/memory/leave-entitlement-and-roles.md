---
name: Leave entitlement and roles
description: Durable rules for annual-leave periods and secure manager identity binding.
---

Annual leave balances are scoped to the employee's current hire-date anniversary period, not lifetime history or a generic calendar-year total.

**Why:** Lifetime aggregation makes balances permanently wrong after the first cycle; hire-date generation requires an anniversary-based entitlement window.

**How to apply:** Any balance, reservation, insufficient-balance check, or dashboard total must use the same current anniversary period.

Manager access must never be granted from a self-entered company name or unverified email. New self-registrations are employees; a pre-provisioned manager record may be linked only to a Clerk-verified primary email.

**Why:** First-registrant or unverified-email bootstrap allows tenant takeover and exposes company-wide leave data.

**How to apply:** Keep authorization server-side, scope data by company, and preserve elevated roles only when binding an existing record to a verified identity.