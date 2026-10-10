# Public website deployment — October 9, 2026

Published URLs: https://everythinglaurier.ca/ and https://www.everythinglaurier.ca/. Both hostname and SSL states are active. Public /privacy/, /support/ and /community/ pages are deployed; the production app release check confirmed successful readable HTML responses and the authorized contact. Native Chrome verified the public privacy page, support page and account-deletion instructions.

Public contact: everythinglaurier@gmail.com. No paid Porkbun hosting, hosting trial, purchase or nameserver change was needed. The existing Sites connection hosts the pages. Website source is the separate `everything-laurier-website` directory, not synced `sources/`.

Latest published source commit (October 10, version 4): bd472c82ffe4d15e079467770b2a19176a6bf2bd.
Sites project: appgprj_6ac97fe38ea88191914df8b0e70ef9dc.
Latest successful deployment: appgdep_6aca821efe788191973cde8b8d1420d8.
Version 4 updates privacy, support and community pages for automatic verified-email student-profile publication.
Hosted origin: https://everything-laurier.sharpthyme4.chatgpt.site/.

## Porkbun configuration

The root parking ALIAS was replaced with A records 162.159.143.30 and 172.66.3.26. www uses CNAME custom-domains.chatgpt.site. Required ownership and certificate TXT records were added at _openai-site-verification, _cf-custom-hostname, and their .www variants. Retain those TXT records for provider validation/renewal. TTL is 600 seconds.

The wildcard parking CNAME, rsend/send email CNAMEs, resend._domainkey and _dmarc TXT records were preserved. No root MX was present in the initial inventory. Domain lock/API settings were left as observed. Website configuration did not alter the existing email route.

Do not replace nameservers or email records to update website content. For future hosting changes, first inspect the current records and preserve mail settings. No tokens or private keys belong in this document or public source.

## App configuration

The app privacy fallback and example environment use https://everythinglaurier.ca/privacy/. The EAS production profile and post-install guard validate the privacy/support/community destinations plus HTTPS backend, publishable key and enabled email sign-in. The App Store Connect privacy/support/marketing fields remain owner setup after enrollment.
