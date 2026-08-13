-- Reliable Premium Marketplace: persistent NEW order tracking and admin/seller alerts
-- NEW remains true through pending, approved, processing, out-for-delivery, and ready-for-pickup.
-- It is cleared automatically when an order reaches delivered or cancelled.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT true;

UPDATE public.orders
SET is_new = (status NOT IN ('delivered', 'cancelled'))
WHERE is_new IS DISTINCT FROM (status NOT IN ('delivered', 'cancelled'));

CREATE INDEX IF NOT EXISTS orders_is_new_idx
  ON public.orders (is_new, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_order_new_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_new := COALESCE(NEW.status, 'pending') NOT IN ('delivered', 'cancelled');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_new_flag ON public.orders;
CREATE TRIGGER orders_set_new_flag
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_new_flag();

CREATE OR REPLACE FUNCTION public.notify_staff_of_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_recipient uuid;
  v_short_id text := left(NEW.id::text, 8);
BEGIN
  SELECT b.owner_id
  INTO v_owner_id
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  FOR v_recipient IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    WHERE p.role = 'admin'
       OR (v_owner_id IS NOT NULL AND p.id = v_owner_id)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      order_id,
      is_read
    ) VALUES (
      v_recipient,
      'New Order Received',
      format('Order #%s has been placed and is waiting for processing.', v_short_id),
      'order_update',
      NEW.id,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_staff_on_insert ON public.orders;
CREATE TRIGGER orders_notify_staff_on_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_of_new_order();

COMMENT ON COLUMN public.orders.is_new IS
  'True while the order is not delivered or cancelled; used for NEW dashboard badges.';

COMMENT ON FUNCTION public.notify_staff_of_new_order() IS
  'Creates in-app bell notifications for the order business owner and administrators.';
