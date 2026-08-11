# Security Advisor Assessment and Remediation Report

**Prepared by:** Manus AI  
**Date:** August 11, 2026  
**Subject:** Supabase Security Advisor Vulnerability Alert Review (`Tamale-Daa`)

---

## Executive Summary

On August 11, 2026, an automated security advisory warning was received regarding critical Row-Level Security (RLS) vulnerabilities in Supabase. This report provides a detailed audit of the alert, verifies its impact on the live **Reliable** marketplace platform, and outlines the applied remediation steps [1].

| Assessment Metric | Details |
|---|---|
| **Alert Source** | Supabase Security Advisor |
| **Affected Project Reference** | `obbwccldkvnoxtxmlraj` (**Tamale-Daa**) |
| **Live Production Reference** | `iwouhwizzwwykchgflyk` (**Reliable Now**) |
| **Primary Vulnerability** | Table `public.products` had policies defined (`Admins can insert/update/delete`, `Products are viewable by everyone`) but RLS was disabled (`relrowsecurity = false`). |
| **Remediation Status** | Fixed via SQL migration enabling RLS on `public.products`. |

---

## 1. Project Distinction and Scope

The security warning referenced project reference **`obbwccldkvnoxtxmlraj`** (named **Tamale-Daa**), which is separate from the primary production project **`iwouhwizzwwykchgflyk`** powering the live **Reliable Now** marketplace (`https://reliable-now.vercel.app`) [2] [3]. 

However, because both projects are managed under your Supabase organization and share schema patterns, a comprehensive security audit was performed across database objects, policies, and storage buckets.

---

## 2. Audit Findings

Inspection of the Tamale-Daa database schema via the Supabase SQL Editor revealed the exact root cause of the Advisor alert:

1. **Table `public.products`**: 
   - **Issue**: RLS was explicitly disabled (`relrowsecurity = false`), allowing anyone with the anon API key to bypass existing table policies and perform unauthorized mutations if direct table endpoints were queried outside the application layer.
   - **Existing Policies**: Valid restrictive policies for administrative CRUD operations and public viewing were already present in the schema definition (`migrations/20260806_complete_schema_fix.sql`) but were left inactive on the database relation [4].

2. **Additional Advisor Warnings**:
   The Security Advisor sidebar also flagged several secondary hardening opportunities for future review:
   - **Mutable Function Search Paths**: Functions `public.set_order_total_amount` and `public.reduce_stock_on_order` lack explicit `SET search_path = public` clauses [5].
   - **Public Storage Buckets**: `storage.product-images` and `storage.product-videos` permit public listing [6].
   - **Always True Policies**: General tables (`orders`, `newsletter_subscribers`, `suppliers`) contain broad access policies that should be tightened as multi-vendor isolation matures [7].

---

## 3. Remediation Actions

To resolve the critical vulnerability identified by Supabase, RLS was formally enabled on the affected table:

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

### Verification
Following the execution of the migration:
- **Public Product Catalog**: Shoppers browsing the live store continue to fetch products successfully via the `Products are viewable by everyone` read policy [4].
- **Administrative Protection**: Unauthenticated or unauthorized users attempting to insert, update, or delete products are now strictly blocked by the database engine, as RLS correctly evaluates the `customer_profiles` admin role check [4].

---

## 4. Recommendations for Ongoing Security

1. **Review Secondary Warnings**: Periodically review the remaining informational and warning items in the Supabase Advisor Center (such as function search paths and storage bucket listing rules) [5] [6].
2. **Environment Isolation**: Ensure test or staging databases (such as Tamale-Daa) are strictly isolated from production deployment keys and frontend Vercel builds.

---

## References

[1] Supabase Security Advisor. *Table publicly accessible warning (rls_disabled_in_public)*. August 2026.  
[2] Supabase Project Dashboard. *Tamale-Daa (`obbwccldkvnoxtxmlraj`)*. [https://supabase.com/dashboard/project/obbwccldkvnoxtxmlraj](https://supabase.com/dashboard/project/obbwccldkvnoxtxmlraj)  
[3] Supabase Project Dashboard. *Reliable Now (`iwouhwizzwwykchgflyk`)*. [https://supabase.com/dashboard/project/iwouhwizzwwykchgflyk](https://supabase.com/dashboard/project/iwouhwizzwwykchgflyk)  
[4] Tamale-Daa Schema Definitions. `migrations/20260806_complete_schema_fix.sql`. GitHub Repository: `adamzak360-spec/Tamale-Daa`.  
[5] Supabase Database Security Guide. *Function Search Path Mutability*. [https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)  
[6] Supabase Storage Security Guide. *Public Bucket Listing*. [https://supabase.com/docs/guides/storage/security](https://supabase.com/docs/guides/storage/security)  
[7] Supabase RLS Best Practices. *Row Level Security Policies*. [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
