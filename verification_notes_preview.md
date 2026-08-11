# Preview verification notes

Source inspected: https://vercel.com/adamzak360-specs-projects/reliable-now/settings/environment-variables

The Vercel project is `reliable-now` under `adamzak360-specs-projects`. Existing sensitive variables include `PAYSTACK_SECRET_KEY` and `VITE_PAYSTACK_PUBLIC_KEY`, currently scoped to Production and Preview. The user explicitly approved Preview-only testing, so the existing Production value must remain unchanged. The Add Environment Variable dialog is open. The next action is to add a separate Preview-only variable without altering Production.

Source inspected: https://reliable-now.vercel.app/admin

The public production admin route redirects unauthenticated visitors to `https://reliable-now.vercel.app/login`, confirming the route is protected.

The attempted add of a second `PAYSTACK_SECRET_KEY` scoped to Preview-only was rejected because the same key already exists for the target Preview environment. The safe next step is to edit the existing variable’s scope so it remains Production-only, then add the provided test value as a separate Preview-only entry. No value was changed by the rejected save.

The failed menu selection briefly opened the `VITE_PAYSTACK_SECRET_KEY` editor, but it was cancelled. No environment variable value or scope was saved or changed. The environment-variable list is visible again.

The variable list was filtered to `PAYSTACK_SECRET_KEY`, showing both `VITE_PAYSTACK_SECRET_KEY` and `PAYSTACK_SECRET_KEY`. The exact `PAYSTACK_SECRET_KEY` row is the second result. A coordinate click closed the menu without opening an editor; no values or scopes were changed.

The existing `PAYSTACK_SECRET_KEY` was successfully updated to `Production` only. Vercel confirms the live key remains Production-only and reports that a new deployment is needed for the change to take effect. Preview is now available for the test key.

The new `PAYSTACK_SECRET_KEY` form now contains the provided test value and is scoped to `Preview` only. It is ready to save; Production remains on the original live key.

The Vercel Deployments page shows the latest `Require Paystack payment for POS subscriptions` deployment as `Ready` on `main`/Production. The dedicated `paystack-preview-20260811` branch is not yet listed as a deployment. The Deployments actions menu is open and contains `Create Git`, `Git Settings`, and `Deployment Filters`; a manual Preview deployment must be started through the available Vercel UI or Git integration.

Preview diagnostics: Paystack completed a test GHS 50.00 Mobile Money transaction for `emmanuelnasara785@gmail.com`, reference `rlbl-1786488429389-5s87plfgk`, receipt 10101, with no real money debited. On return to Reliable, the POS wall displayed `Supabase server configuration is missing`, confirming that Paystack initialization and payment succeeded but server-side subscription finalization failed before the business update.

The handler in `api/paystack.js` requires `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and either `SUPABASE_URL` or `VITE_SUPABASE_URL`. Vercel currently shows `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` scoped to Production and Preview. The Preview test key is scoped to Preview only; the live key is scoped to Production only. An explicit `SUPABASE_URL` variable with value `https://iwouhwizzwwykchgflyk.supabase.co` is being prepared for Preview only, leaving Production unchanged.

Official Paystack test-payment documentation: https://paystack.com/docs/payments/test-payments/
The official docs confirm Ghana Mobile Money test details: `055 123 498 7`, network `MTN`, no PIN/OTP. They also confirm successful card `4084 0840 8408 4081`, expiry `06/27`, CVV `408` (no validation), and other card test credentials.

The corrected Preview checkout currently opened at `https://checkout.paystack.com/f9z393gmrg573yt`, displays `Pay GHS 50`, email `emmanuelnasara785@gmail.com`, phone `0551234987`, provider `MTN`, and a Confirm button. The prior Preview runtime logs showed initialize and verify requests returning HTTP 200; the POS error arose because the second test transaction had not completed successfully, so the confirm_pos_subscription call was not reached.

Latest Vercel settings page: https://vercel.com/adamzak360-specs-projects/reliable-now/settings/environment-variables
Current variable scopes shown: `SUPABASE_URL` = Preview only; `PAYSTACK_SECRET_KEY` = Preview and a separate Production entry; `SUPABASE_SERVICE_ROLE_KEY` = Production and Preview; legacy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` = Production and Preview. Vercel’s top environment filter exposes a separate `Pre-production` option, and the deployment created from the draft PR has `target: null` and branch alias `reliable-now-git-paystack-prev-621c26-adamzak360-specs-projects.vercel.app`.

Fresh deployment `dpl_82Rtxu4jJKBwEBeZTK42WutLvF48` (`https://reliable-1yodn6jzm-adamzak360-specs-projects.vercel.app`) is READY. Its runtime logs show initialize and verify HTTP 200, but `confirm_pos_subscription` at 23:15:24 returned HTTP 500 with `Supabase server configuration is missing`. The handler checks `process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`; it does not print which one is absent. The browser-side confirm call for the existing successful test reference `rlbl-1786488429389-5s87plfgk` returned the same 500.
