# Deferred release checklist

Saved on October 17, 2026 at Kaden's request before installing the app on his phone. These items remain open; a development install is not publication clearance.

- Configure and verify authentication CAPTCHA, additional public-request/IP throttling, provider billing limits/alerts, and administrator MFA using the relevant provider accounts. Select budgets explicitly; app-level quotas do not cap every provider invoice.
- Recheck the 18 high-severity dependency findings traced to the upstream `braces` and `node-forge` build-tool advisories. See [dependency-security.md](dependency-security.md); do not blindly downgrade Expo or React Native to satisfy an audit.
- Confirm redistribution rights for floor plans, photographs, derived map assets, and the supplied logo. Supply any applicable public business mailing address and obtain qualified legal review. Operator: Kaden Najarali; contact: everythinglaurier@gmail.com. No address has been supplied.
- Complete physical-device checks for accessibility, large text, permissions, authentication, map navigation, transcript submissions, and owner-only reviews before publication.
- Leave the prepared Supabase outgoing-email template ready for manual application, as previously requested.

The detailed implementation, checks, and limitations are recorded in [security-privacy-review.md](security-privacy-review.md). Continue from that audit when resuming release preparation.
