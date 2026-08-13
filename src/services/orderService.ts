import { supabase } from '../supabaseClient'
import { Order, CartItem } from '../types'
import { validateCartStock } from './inventoryService'
import {
  sendNewOrderNotifications,
  sendOrderStatusChangeNotifications,
  sendOrderApprovedEmail,
  sendReadyForPickupEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail,
  sendAdminOrderCancellationNotification,
} from './emailNotifications'
import { createNotification } from './notificationService'

// Guard: Supabase must be configured for order operations
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

const enrichOrderWithSellerContext = async <T extends Order>(order: T): Promise<T> => {
  if (!order.business_id) return order
  const { data: store, error } = await getSupabase()
    .from('businesses')
    .select('name, business_name, location, contact_email, contact_phone, phone, whatsapp_url')
    .eq('id', order.business_id)
    .maybeSingle()
  if (error) {
    console.warn('[OrderService] Could not load seller context for email:', error.message)
    return order
  }
  if (!store) return order
  const deliveryNote = order.delivery_method
    ? `${order.delivery_method}${order.delivery_area ? ` for ${order.delivery_area}` : ''}. Please follow the store's instructions for this order.`
    : undefined
  return {
    ...order,
    seller_context: {
      storeName: store.name || store.business_name || undefined,
      location: store.location || undefined,
      contactEmail: store.contact_email || undefined,
      contactPhone: store.contact_phone || store.phone || undefined,
      whatsappUrl: store.whatsapp_url || undefined,
      deliveryNote,
    },
  }
}

export const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
  console.log('Attempting to create order with data:', orderData);
  
  // Validate stock availability before creating order
  console.log('[OrderService] Validating stock for order items');
  const stockValidation = await validateCartStock(orderData.items as CartItem[]);
  
  if (!stockValidation.isValid) {
    const errorMessage = stockValidation.insufficientStock.join('; ');
    console.error('[OrderService] Stock validation failed:', errorMessage);
    throw new Error(`Stock validation failed: ${errorMessage}`);
  }
  
  if (stockValidation.lowStockWarnings.length > 0) {
    console.warn('[OrderService] Low stock warnings:', stockValidation.lowStockWarnings);
  }
  
  const { data, error, status, statusText } = await getSupabase()
    .from('orders')
    .insert([orderData])
    .select()

  if (error) {
    console.error('Supabase error creating order:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status,
      statusText
    });
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.error('Order creation returned no data. Status:', status, statusText);
    throw new Error('Order creation failed: No data returned from server');
  }

  console.log('[OrderService] Order created successfully. Stock reduction will be handled by database trigger.');
  
  // Trigger email and in-app notifications in the background
  const createdOrder = data[0];
  
  // Email notification: include the store that owns the purchased item.
  enrichOrderWithSellerContext(createdOrder).then((emailOrder) =>
    sendNewOrderNotifications(emailOrder, emailOrder.customer_email)
  ).catch(err => {
    console.error('[OrderService] Error sending new order notifications:', err);
  });

  // In-app notification for authenticated user
  if (createdOrder.user_id) {
    createNotification({
      user_id: createdOrder.user_id,
      title: 'Order Placed',
      message: `Your order #${createdOrder.id.slice(0, 8)} has been successfully placed.`,
      type: 'order_update',
      order_id: createdOrder.id
    }).catch(err => console.error('[OrderService] Error creating notification:', err));
  }

  return createdOrder;
}

export const getAllOrders = async (businessId?: string, businessIds?: string[]) => {
  let query = getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (businessIds && businessIds.length > 0) {
    // Sellers may own multiple businesses: aggregate orders across all of them
    query = query.in('business_id', businessIds)
  } else if (businessId) {
    query = query.eq('business_id', businessId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
  return data as Order[]
}

export const updateOrderStatus = async (orderId: string, status: Order['status']) => {
  // First fetch the current order to get the previous status and customer email
  const { data: currentOrder, error: fetchError } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) {
    console.error('Error fetching order for status update:', fetchError);
    throw fetchError;
  }

  const previousStatus = currentOrder.status;

  const { data, error } = await getSupabase()
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()

  if (error) {
    console.error('Error updating order status:', error)
    throw error
  }

  // Trigger status-specific email notifications and in-app notifications in the background
  const updatedOrder = data[0];
  if (previousStatus !== status) {
    const emailOrder = await enrichOrderWithSellerContext(updatedOrder)
    let customerEmail = updatedOrder.customer_email;
    if (!customerEmail && updatedOrder.user_id) {
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('email')
        .eq('id', updatedOrder.user_id)
        .single();
      if (profile && profile.email) {
        customerEmail = profile.email;
      }
    }

    const statusTitles: Record<string, string> = {
      approved: 'Order Approved',
      processing: 'Order Processing',
      'ready-for-pickup': 'Ready for Pickup',
      'out-for-delivery': 'Out for Delivery',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled'
    };

    const statusMessages: Record<string, string> = {
      approved: 'Your order has been approved and is being prepared.',
      processing: 'Your order is now being processed.',
      'ready-for-pickup': 'Your order is ready for pickup!',
      'out-for-delivery': 'Your order is out for delivery!',
      delivered: 'Your order has been delivered. Thank you!',
      cancelled: 'Your order has been cancelled.'
    };

    if (updatedOrder.user_id) {
      createNotification({
        user_id: updatedOrder.user_id,
        title: statusTitles[status] || 'Order Updated',
        message: statusMessages[status] || `Your order status has changed to ${status}.`,
        type: 'order_update',
        order_id: updatedOrder.id
      }).catch(err => console.error('[OrderService] Error creating notification:', err));
    }

    if (customerEmail) {
      switch (status) {
        case 'approved':
          sendOrderApprovedEmail(emailOrder, customerEmail).catch(err => {
            console.error('[OrderService] Error sending approved email:', err);
          });
          break;
        case 'processing':
          sendOrderStatusChangeNotifications(emailOrder, customerEmail, previousStatus).catch(err => {
            console.error('[OrderService] Error sending processing email:', err);
          });
          break;
        case 'ready-for-pickup':
          sendReadyForPickupEmail(emailOrder, customerEmail).catch(err => {
            console.error('[OrderService] Error sending ready for pickup email:', err);
          });
          break;
        case 'out-for-delivery':
          sendOutForDeliveryEmail(emailOrder, customerEmail).catch(err => {
            console.error('[OrderService] Error sending out for delivery email:', err);
          });
          break;
        case 'delivered':
          sendDeliveredEmail(emailOrder, customerEmail).catch(err => {
            console.error('[OrderService] Error sending delivered email:', err);
          });
          break;
        case 'cancelled':
          sendOrderStatusChangeNotifications(emailOrder, customerEmail, previousStatus).catch(err => {
            console.error('[OrderService] Error sending cancellation email:', err);
          });
          sendAdminOrderCancellationNotification(updatedOrder).catch(err => {
            console.error('[OrderService] Error sending cancellation admin notification:', err);
          });
          break;
        default:
          sendOrderStatusChangeNotifications(emailOrder, customerEmail, previousStatus).catch(err => {
            console.error('[OrderService] Error sending status change notifications:', err);
          });
      }
    }
  }

  return updatedOrder;
}

export const updatePaymentStatus = async (orderId: string, payment_status: Order['payment_status']) => {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({ payment_status })
    .eq('id', orderId)
    .select()

  if (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
  return data[0]
}
