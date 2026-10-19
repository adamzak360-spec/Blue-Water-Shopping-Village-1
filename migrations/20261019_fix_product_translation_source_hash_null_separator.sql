-- PostgreSQL text values cannot contain U+0000. The previous separator
-- caused every active product insert to fail inside the translation trigger.
CREATE OR REPLACE FUNCTION public.reliable_product_source_hash(p_name text, p_description text, p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT encode(
    extensions.digest(
      jsonb_build_array(coalesce(p_name, ''), coalesce(p_description, ''), coalesce(p_category, ''))::text,
      'sha256'
    ),
    'hex'
  );
$function$;
