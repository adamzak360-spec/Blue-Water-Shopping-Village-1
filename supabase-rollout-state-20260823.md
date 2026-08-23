# Supabase rollout state — 2026-08-23

The authenticated Supabase organization `adamzak360-spec's Org` is accessible. The active production project is **Blue Water Shopping Village 1**, project ref `iwouhwizzwwykchgflyk`, AWS `eu-west-1`, nano tier. `Tamale-Daa` is paused, as requested; another backend project is also paused.

The dashboard displays: `Organization exceeded its quota in the previous billing cycle · Projects will be restricted from 21 Sep, 2026 if your organization remains over quota.`

The next operation is to open the active project SQL editor and apply the additive migration `migrations/20260823_public_catalog_cards.sql`. No product, order, payment, stock, or account records will be changed.

The active project dashboard is authenticated and accessible. It currently reports `EXCEEDING USAGE LIMITS`, status `Unhealthy`, 28,824 total requests in the last 60 minutes, including 28,725 Auth requests, 99.9% success, and 0 Realtime requests. The SQL Editor is open for the production `main` branch. The next step is to paste and run the additive public-card RPC migration.

The migration text is visible in the SQL Editor. The initial browser paste operation timed out, but inspection shows the editor contains the SQL and an autocomplete panel is open; it has not been executed yet. The next action is to dismiss autocomplete and run the query, then inspect the result for SQL errors.

Autocomplete was dismissed successfully. The SQL Editor now shows the entered migration and exposes the `Run` control; no query result is present yet.

The first execution was rejected before any schema change because the SQL editor autocomplete changed `JSONB` to `json_object`, producing PostgreSQL syntax error 42601 at the return type. The editor uses a Monaco textarea (`aria-label="Editor content"`); no migration was applied by the failed query.

The failed query was not applied. A retry using the same long paste caused Monaco autocomplete to corrupt additional tokens while selecting text; the editor remains in an unexecuted state. I am switching to a shorter SQL statement and explicit editor selection to avoid further autocomplete substitution.

The shorter migration was entered without autocomplete corruption and the Run confirmation was accepted. The SQL Editor still displays the earlier error panel, so I am validating the actual RPC directly through the project API before concluding whether the migration applied.

The local checkout has no `.env` file containing the Supabase anon key, so direct REST verification from the sandbox is unavailable. The authenticated dashboard remains available; I will use its SQL Editor for a read-only function-existence check before deciding whether another migration execution is necessary.

The DOM textarea setter did not replace Monaco’s internal model; the verification statement was appended to the existing migration text. No execution has occurred from that appended statement. The next retry will target the Monaco editor model directly, if exposed, so the query can be replaced cleanly.

The page exposes one Monaco editor instance. Its internal model was successfully replaced with the clean read-only function-existence query; this avoids the earlier append/autocomplete issue.

The clean read-only verification query is now the only statement in the Monaco editor and is visibly ready to run. It checks for the new function by name and exact argument signature.

The read-only verification query executed successfully and returned **no rows**, confirming that `get_public_catalog_cards_bounded` is not present in the active project. The prior migration attempts were rejected and made no schema changes. I will now use Monaco directly to insert the corrected migration and execute it once.

The corrected migration is cleanly loaded as the sole Monaco editor statement. It uses `RETURNS SETOF json` with `row_to_json`, preserves the public visibility rules and delivery-fee fields, and is ready for final execution.

The corrected migration reached PostgreSQL but was rejected safely because the live `products` table does not contain `discount_percentage`. No function was created. I am checking the live column names and will retry with only columns confirmed to exist.

The live `products` column query is cleanly loaded in Monaco and ready to run. It will identify supported fields without modifying the database.

The live schema query succeeded and returned 41 product columns. The visible columns include `id`, `name`, `description`, `price`, `category`, `image_url`, `stock_quantity`, `status`, `created_at`, `updated_at`, and `low_stock_threshold`; the earlier projection’s discount, currency, brand, video, business, and delivery-fee columns are not confirmed and must be omitted unless present in the remaining rows.

The compact `string_agg` query is loaded and ready to run; it will return all 41 live product column names in one result row.

The live schema confirms all fields in the corrected migration except `discount_percentage`; the checked-in migration has been updated accordingly. The corrected statement is loaded in Monaco and ready for execution.

The corrected migration execution completed with `Success. No rows returned`; the proxy error occurred only in the browser response wrapper, not in the database operation. The active project’s dashboard now shows additional Postgres/API activity, and the migration statement remains in the editor. Next I will verify the function exists and test one bounded call.

The RPC existence verification query is cleanly loaded in Monaco. The dashboard currently shows 29,398 requests in the last 60 minutes, with Auth still dominating at 29,256 requests; this is the pre-deployment baseline for the final check.

The final read-only verification succeeded with `{"function_count":1}`, confirming the new RPC now exists in the active database. The project still reports quota overage and unhealthy status, but the additive function rollout itself is complete. Next is a bounded invocation test and then production deployment verification.

The bounded invocation query `SELECT * FROM public.get_public_catalog_cards_bounded('HOME', NULL, NULL, NULL, 1, 0);` is loaded cleanly in Monaco and ready to run.

The bounded invocation test succeeded and returned exactly one product card. The response contains the expected narrow card fields (`id`, `name`, truncated description, price/currency/category, image URL, stock, status, timestamps, business ID, and delivery-fee fields) with no detail-only specifications/gallery payload. The new RPC is operational in Supabase.

The latest implementation commit `47dd1e9` was pushed after a clean production build. The first post-push production navigation loaded the Reliable homepage, but the resource filter returned no matching entries and a subsequent browser view landed on a transient `about:blank` context. I am retrying the live check once to distinguish deployment behavior from the browser context reset.

The latest production deployment is now live. The browser resource audit shows `/auth/v1/settings` instead of the dummy OTP request, `get_public_catalog_cards_bounded` for the catalog, and 240px/quality-78 Supabase image transformations for product thumbnails. The homepage displays the Reliable branding, current contact number, product cards, prices, stock labels, and Add to Cart controls.

The live product-detail page loads successfully with the new transformed 1,200px main image and 320px thumbnails. Its resource audit shows `/auth/v1/settings`, the optimized public-card RPC, and responsive image transformations. No conversation, message, or realtime resource was requested before Chat with Seller was initiated. The page still displays the existing sign-in-temporarily-unavailable notice; this is an authentication availability condition in the backend, not a catalog or chat-loading regression.
