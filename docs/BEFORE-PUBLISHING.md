# Release checklist

Saved October 17; updated October 21, 2026. A development install is not publication clearance.

## Completed or confirmed

- Kaden confirmed the legal-details checklist is complete on October 21: distribution rights, applicable business-details requirements and legal review. This records the owner's confirmation; no new address was supplied or invented.
- Kaden confirmed earlier phone testing complete except unwanted page zoom. After the update, Kaden confirmed ordinary screens stay fixed when pinched and map zoom still works. Ordinary native page pinch/zoom is now disabled, and outer web/map document magnification is restricted while the map camera retains its zoom gestures and controls. Text scaling through device accessibility settings remains available.
- The 18 high-severity build-tool findings are addressed with targeted local patches. The current npm audit reports zero findings; attack regression tests and a clean install pass. See [dependency-security.md](dependency-security.md) for the important local-source scanning limitation and ongoing maintenance.
- Cloudflare Turnstile was created and connected to Supabase Auth with the owner's approval. The hosted web challenge completes; live missing-token and invalid-token requests are rejected. Kaden confirmed the corrected iPhone check completes and the email code arrives. See [captcha-setup.md](captcha-setup.md).
- Privacy and cookie notices disclose Turnstile and were published on October 21. The outgoing Supabase email template remains ready for manual application, as requested.

## Still open

- Configure any needed additional public-request/IP throttling, provider billing limits/alerts and administrator MFA. Select budgets explicitly; app-level quotas do not cap every provider invoice.
- Keep the vendored security patches under review and replace them with tested compatible upstream fixes when available.
- Expo Doctor currently passes 20/21 checks; its package-version check recommends newer SDK 57 patch versions for Expo, Location and Router. The installed versions build successfully; no unrelated SDK update was applied during this fix.

Detailed implementation and prior checks are in [security-privacy-review.md](security-privacy-review.md). Resume from the current checklist and linked October 21 notes.
