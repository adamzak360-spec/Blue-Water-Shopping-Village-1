import { supabase } from '../supabaseClient'
import { Order, CartItem } from '../types'
import { validateCartStock } from './inventoryService'
import {
  sendNewOrderNotifications,
  sendOrderStatusChangeNotifications,
  sendOrderApprovedEmail,
  sendPaymentConfirmedEmail,
  sendReadyForPickupEmail,
  sendOutForDeliveryEmail,
  sendDeliveredEmail,
  sendAdminOrderCancellationNotification,
} from './emailNotifications'

// Guard: Supabase must be configured for order operations
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
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
  
  // Trigger email notifications in the background
  const createdOrder = data[0];
  sendNewOrderNotifications(createdOrder, createdOrder.customer_email).catch(err => {
    console.error('[OrderService] Error sending new order notifications:', err);
  });

  return createdOrder;
}

export const getAllOrders = async () => {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

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

  // Trigger status-specific email notifications in the background
  const updatedOrder = data[0];
  if (previousStatus !== status) {
    // Send status-specific emails based on the new status
    switch (status) {
      case 'approved':
        sendOrderApprovedEmail(updatedOrder, updatedOrder.customer_email).catch(err => {
          console.error('[OrderService] Error sending approved email:', err);
        });
        break;
      case 'ready-for-pickup':
        sendReadyForPickupEmail(updatedOrder, updatedOrder.customer_email).catch(err => {
          console.error('[OrderService] Error sending ready for pickup email:', err);
        });
        break;
      case 'out-for-delivery':
        sendOutForDeliveryEmail(updatedOrder, updatedOrder.customer_email).catch(err => {
          console.error('[OrderService] Error sending out for delivery email:', err);
        });
        break;
      case 'delivered':
        sendDeliveredEmail(updatedOrder, updatedOrder.customer_email).catch(err => {
          console.error('[OrderService] Error sending delivered email:', err);
        });
        break;
      case 'cancelled':
        sendAdminOrderCancellationNotification(updatedOrder).catch(err => {
          console.error('[OrderService] Error sending cancellation notification:', err);
        });
        break;
      default:
        // For other status changes, send generic status update email
        sendOrderStatusChangeNotifications(updatedOrder, updatedOrder.customer_email, previousStatus).catch(err => {
          console.error('[OrderService] Error sending status change notifications:', err);
        });
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
