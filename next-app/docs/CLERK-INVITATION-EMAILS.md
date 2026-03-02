# Clerk invitation emails not arriving

If you've set up **invitation-only** (Restricted sign-up) in the Clerk Dashboard but **invitation emails never arrive**, work through this checklist.

## 1. Development vs production instance

- **Development:** Emails are sent from `@accounts.dev`. They can land in **spam** or be delayed.
- **Production:** Emails are sent from **your domain** (e.g. `notifications@your-domain.com`). You must complete domain setup.

**Action:** Check **Spam / Junk** and **Promotions** (Gmail). Wait a few minutes; Gmail can delay Clerk emails.

---

## 2. Clerk Dashboard checks

- **Configure → Email, SMS, and Customization:** Confirm the **Invitation** email template is enabled and "Delivered by Clerk" is on.
- **User & Authentication → Restrictions:** If using **Restricted** sign-up, only invited users can create accounts. Invitations are sent from **Users → [User] → Send invitation** (or the Invitations section).
- **Configure → Domains (production only):** If you use a custom domain for auth, ensure the domain is verified and the "from" address exists.

---

## 3. Production: domain and "from" address

For **production**, Clerk’s [Email deliverability](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability) guide applies:

- **SPF and DKIM:** Set up during production instance setup. Confirm they’re present for your domain.
- **DMARC:** Recommended. Add a DMARC TXT record for your domain.
- **Real mailbox:** There must be a real mailbox at the "from" address (e.g. `notifications@your-domain.com`). Some providers reject or quarantine mail if there’s no mailbox.
- **Domain reputation:** New domains can have lower reputation and more delays or spam filtering.

---

## 4. Provider-specific issues

- **Gmail / Google Workspace:** Emails can be **delayed ~4 minutes**. Check Spam and wait a bit. Consider [Gmail Postmaster Tools](https://postmaster.google.com/) for debugging.
- **Outlook / Microsoft 365:** Mail can go to **Quarantine**. Ask the recipient to check Microsoft Defender Quarantine and release the message. Prefer **verification codes** over links if you have the option.

---

## 5. Sending the invitation correctly

- In **Clerk Dashboard → Users**, open the user (or create one) and use **Send invitation** so Clerk sends the invite email.
- Or use the **Invitations** area if your plan has it; ensure the invite is sent to the correct email and not to a typo or alias that doesn’t receive mail.
- Invitations **expire** (e.g. after a set time); send a fresh one if the link may have expired.

---

## 6. Optional: handle invitations yourself

If Clerk delivery keeps failing, you can:

- **Turn off** “Delivered by Clerk” for the invitation template in **Configure → Email, SMS, and Customization**.
- Use **webhooks** (e.g. `user.created` or invitation-related events) and your own email provider to send the invitation link.  
See Clerk’s [Email deliverability](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability) doc (“Managing your own email delivery”).

---

## Quick links

- [Clerk: Email deliverability](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability)
- [Clerk: User invitations](https://clerk.com/docs/users/invitations)
- [Clerk: Restricted sign-up mode](https://clerk.com/changelog/2024-09-30-restricted-sign-up-mode)
