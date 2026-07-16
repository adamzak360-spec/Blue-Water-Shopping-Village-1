/**
 * Email Templates
 * 
 * Professional HTML email templates for Blue Water Shopping Village
 * All templates are responsive and include company branding
 */

import { Order, CartItem } from '../types'

const COMPANY_NAME = 'Blue Water Shopping Village'
const COMPANY_WEBSITE = 'https://blue-water-shopping-village-1.vercel.app'
const SUPPORT_EMAIL = 'support@bluewatershopping.com'
const PHONE = '+233 (0) 30 XXX XXXX'

/**
 * Base email template wrapper
 */
function getEmailWrapper(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 30px 20px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            font-size: 18px;
            color: #1e3a8a;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          .order-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .order-item:last-child {
            border-bottom: none;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            width: 60px;
            text-align: center;
          }
          .item-price {
            width: 80px;
            text-align: right;
          }
          .order-summary {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 5px;
            margin-top: 15px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .summary-row.total {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
            border-top: 2px solid #e5e7eb;
            padding-top: 10px;
            margin-top: 10px;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-pending {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status-confirmed {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-processing {
            background-color: #fce7f3;
            color: #831843;
          }
          .status-ready {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-delivered {
            background-color: #dcfce7;
            color: #166534;
          }
          .status-cancelled {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .cta-button {
            display: inline-block;
            background-color: #3b82f6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
            font-weight: bold;
          }
          .cta-button:hover {
            background-color: #2563eb;
          }
          .footer {
            background-color: #f3f4f6;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin-bottom: 8px;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
          .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 20px 0;
          }
          @media (max-width: 600px) {
            .email-container {
              width: 100%;
            }
            .order-item {
              flex-wrap: wrap;
            }
            .item-qty, .item-price {
              width: 100%;
              text-align: left;
              margin-top: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${content}
          <div class="footer">
            <p><strong>${COMPANY_NAME}</strong></p>
            <p>📞 ${PHONE}</p>
            <p>✉ <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
            <p><a href="${COMPANY_WEBSITE}">Visit Our Website</a></p>
            <div class="divider"></div>
            <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            <p>You received this email because you placed an order or registered with us.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Order Confirmation Email
 */
export function getOrderConfirmationTemplate(order: Order & { id: string }): { html: string; text: string } {
  const itemsHtml = order.items
    .map(
      (item: CartItem) => `
    <div class="order-item">
      <div class="item-name">${item.name}</div>
      <div class="item-qty">x${item.quantity}</div>
      <div class="item-price">GH₵${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `
    )
    .join('')

  const html = getEmailWrapper(
    `
    <div class="header">
      <h1>Order Confirmation</h1>
      <p>Thank you for your order!</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
      </div>

      <div class="section">
        <h2>Items Ordered</h2>
        <div class="order-item" style="font-weight: bold; margin-bottom: 10px;">
          <div class="item-name">Product</div>
          <div class="item-qty">Qty</div>
          <div class="item-price">Total</div>
        </div>
        ${itemsHtml}
        <div class="order-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>GH₵${order.subtotal.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Delivery Fee:</span>
            <span>GH₵${order.delivery_fee.toFixed(2)}</span>
          </div>
          <div class="summary-row total">
            <span>Total Amount:</span>
            <span>GH₵${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Delivery Information</h2>
        <p><strong>Name:</strong> ${order.customer_name}</p>
        <p><strong>Address:</strong> ${order.delivery_address}</p>
        <p><strong>City:</strong> ${order.city}</p>
        <p><strong>Region:</strong> ${order.region}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
      </div>

      <div class="section">
        <h2>What's Next?</h2>
        <p>Your order has been received and is being prepared. We'll notify you as soon as your order is ready for delivery.</p>
        <a href="${COMPANY_WEBSITE}/customer/orders/${order.id}" class="cta-button">Track Your Order</a>
      </div>

      <div class="section">
        <p>If you have any questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  `,
    'Order Confirmation'
  )

  const text = `
Order Confirmation

Thank you for your order!

Order ID: ${order.id}
Date: ${new Date(order.created_at || '').toLocaleDateString()}
Status: ${order.status}

Items Ordered:
${order.items.map((item: CartItem) => `- ${item.name} x${item.quantity}: GH₵${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: GH₵${order.subtotal.toFixed(2)}
Delivery Fee: GH₵${order.delivery_fee.toFixed(2)}
Total: GH₵${order.total.toFixed(2)}

Delivery Address:
${order.customer_name}
${order.delivery_address}
${order.city}, ${order.region}
${order.customer_phone}

Your order has been received and is being prepared.
Track your order: ${COMPANY_WEBSITE}/customer/orders/${order.id}

Questions? Contact us: ${SUPPORT_EMAIL}
  `

  return { html, text }
}

/**
 * Order Status Update Email
 */
export function getOrderStatusUpdateTemplate(
  order: Order & { id: string },
  previousStatus: string
): { html: string; text: string } {
  const statusMessages: { [key: string]: string } = {
    pending: 'Your order has been received and is awaiting confirmation.',
    confirmed: 'Your order has been confirmed and we are preparing it.',
    processing: 'Your order is being prepared for delivery.',
    'out-of-delivery': 'Your order is on its way to you!',
    delivered: 'Your order has been delivered. Thank you for shopping with us!',
    cancelled: 'Your order has been cancelled. Please contact support for more information.',
  }

  const html = getEmailWrapper(
    `
    <div class="header">
      <h1>Order Status Update</h1>
      <p>Your order has been updated</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Order Update</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Previous Status:</strong> <span class="status-badge status-${previousStatus}">${previousStatus}</span></p>
        <p><strong>Current Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
      </div>

      <div class="section">
        <h2>Update Details</h2>
        <p>${statusMessages[order.status] || 'Your order status has been updated.'}</p>
      </div>

      <div class="section">
        <h2>Order Summary</h2>
        <p><strong>Order Total:</strong> GH₵${order.total.toFixed(2)}</p>
        <p><strong>Delivery Address:</strong> ${order.delivery_address}, ${order.city}</p>
        <a href="${COMPANY_WEBSITE}/customer/orders/${order.id}" class="cta-button">View Order Details</a>
      </div>

      <div class="section">
        <p>If you have any questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  `,
    'Order Status Update'
  )

  const text = `
Order Status Update

Order ID: ${order.id}
Previous Status: ${previousStatus}
Current Status: ${order.status}

${statusMessages[order.status] || 'Your order status has been updated.'}

Order Total: GH₵${order.total.toFixed(2)}
Delivery Address: ${order.delivery_address}, ${order.city}

View order details: ${COMPANY_WEBSITE}/customer/orders/${order.id}

Questions? Contact us: ${SUPPORT_EMAIL}
  `

  return { html, text }
}

/**
 * Welcome Email for New Customers
 */
export function getWelcomeTemplate(customerName: string, _email: string): { html: string; text: string } {
  const html = getEmailWrapper(
    `
    <div class="header">
      <h1>Welcome to ${COMPANY_NAME}!</h1>
      <p>We're excited to have you on board</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Hello ${customerName}!</h2>
        <p>Thank you for creating an account with ${COMPANY_NAME}. We're thrilled to have you as part of our community!</p>
      </div>

      <div class="section">
        <h2>What You Can Do Now</h2>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>Browse our wide selection of fresh products and household essentials</li>
          <li>Place orders with just a few clicks</li>
          <li>Track your orders in real-time</li>
          <li>Save your delivery addresses for faster checkout</li>
          <li>Receive exclusive deals and offers</li>
        </ul>
      </div>

      <div class="section">
        <h2>Get Started</h2>
        <p>Ready to start shopping? Visit our store and discover amazing products at great prices.</p>
        <a href="${COMPANY_WEBSITE}" class="cta-button">Start Shopping</a>
      </div>

      <div class="section">
        <h2>Need Help?</h2>
        <p>If you have any questions or need assistance, our support team is here to help:</p>
        <p>📞 ${PHONE}</p>
        <p>✉ <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>

      <div class="section">
        <p>Happy shopping!</p>
        <p><strong>${COMPANY_NAME} Team</strong></p>
      </div>
    </div>
  `,
    'Welcome to Blue Water Shopping Village'
  )

  const text = `
Welcome to ${COMPANY_NAME}!

Hello ${customerName}!

Thank you for creating an account. We're thrilled to have you as part of our community!

What You Can Do Now:
- Browse our wide selection of fresh products and household essentials
- Place orders with just a few clicks
- Track your orders in real-time
- Save your delivery addresses for faster checkout
- Receive exclusive deals and offers

Get Started: ${COMPANY_WEBSITE}

Need Help?
Phone: ${PHONE}
Email: ${SUPPORT_EMAIL}

Happy shopping!
${COMPANY_NAME} Team
  `

  return { html, text }
}

/**
 * Admin Notification - New Order
 */
export function getAdminNewOrderTemplate(order: Order & { id: string }): { html: string; text: string } {
  const itemsHtml = order.items
    .map(
      (item: CartItem) => `
    <div class="order-item">
      <div class="item-name">${item.name}</div>
      <div class="item-qty">x${item.quantity}</div>
      <div class="item-price">GH₵${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `
    )
    .join('')

  const html = getEmailWrapper(
    `
    <div class="header">
      <h1>New Order Received</h1>
      <p>Admin Notification</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>New Order Alert</h2>
        <p>A new order has been placed and requires attention.</p>
      </div>

      <div class="section">
        <h2>Order Information</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Email:</strong> ${order.customer_email}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Total Amount:</strong> GH₵${order.total.toFixed(2)}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status}</span></p>
      </div>

      <div class="section">
        <h2>Items</h2>
        <div class="order-item" style="font-weight: bold; margin-bottom: 10px;">
          <div class="item-name">Product</div>
          <div class="item-qty">Qty</div>
          <div class="item-price">Total</div>
        </div>
        ${itemsHtml}
      </div>

      <div class="section">
        <h2>Delivery Address</h2>
        <p>${order.delivery_address}<br>${order.city}, ${order.region}</p>
      </div>

      <div class="section">
        <p><strong>Notes:</strong> ${order.notes || 'None'}</p>
      </div>
    </div>
  `,
    'New Order Received'
  )

  const text = `
New Order Received - Admin Notification

Order ID: ${order.id}
Customer: ${order.customer_name}
Email: ${order.customer_email}
Phone: ${order.customer_phone}
Total: GH₵${order.total.toFixed(2)}
Status: ${order.status}

Items:
${order.items.map((item: CartItem) => `- ${item.name} x${item.quantity}: GH₵${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Delivery Address:
${order.delivery_address}
${order.city}, ${order.region}

Notes: ${order.notes || 'None'}
  `

  return { html, text }
}

/**
 * Low Stock Alert Email for Admin
 */
export function getLowStockAlertTemplate(products: any[]): { html: string; text: string } {
  const itemsHtml = products
    .map(
      (p) => `
    <div class="order-item">
      <div class="item-name">${p.name}</div>
      <div class="item-qty" style="color: #dc2626; font-weight: bold;">${p.stock_quantity} left</div>
      <div class="item-price">Threshold: ${p.low_stock_threshold || 5}</div>
    </div>
  `
    )
    .join('')

  const html = getEmailWrapper(
    `
    <div class="header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);">
      <h1>Low Stock Alert</h1>
      <p>Action required: Products below threshold</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Inventory Warning</h2>
        <p>The following products have reached or fallen below their low stock threshold. Please restock these items soon to avoid running out of stock.</p>
      </div>

      <div class="section">
        <div class="order-item" style="font-weight: bold; margin-bottom: 10px;">
          <div class="item-name">Product</div>
          <div class="item-qty">Current</div>
          <div class="item-price">Limit</div>
        </div>
        ${itemsHtml}
      </div>

      <div class="section">
        <a href="${COMPANY_WEBSITE}/admin" class="cta-button" style="background-color: #dc2626;">Manage Inventory</a>
      </div>
    </div>
  `,
    'Low Stock Alert'
  )

  const text = `
Low Stock Alert - Inventory Warning

The following products are below their threshold:

${products.map((p) => `- ${p.name}: ${p.stock_quantity} remaining (Threshold: ${p.low_stock_threshold || 5})`).join('\n')}

Manage inventory at: ${COMPANY_WEBSITE}/admin
  `

  return { html, text }
}

/**
 * Restock Request Email for Supplier
 */
export function getRestockRequestTemplate(supplier: any, products: any[]): { html: string; text: string } {
  const itemsHtml = products
    .map(
      (p) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0;">${p.name}</td>
      <td style="padding: 12px 0; text-align: center;">${p.quantity_needed || 'As per usual'}</td>
    </tr>
  `
    )
    .join('')

  const html = getEmailWrapper(
    `
    <div class="header">
      <h1>Restock Request</h1>
      <p>From ${COMPANY_NAME}</p>
    </div>
    <div class="content">
      <div class="section">
        <h2>Hello ${supplier.contact_person},</h2>
        <p>We would like to request a restock for the following products from <strong>${supplier.company_name}</strong>.</p>
      </div>

      <div class="section">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb; text-align: left; color: #1e3a8a;">
              <th style="padding-bottom: 10px;">Product Name</th>
              <th style="padding-bottom: 10px; text-align: center;">Quantity Requested</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <p>Please confirm receipt of this request and let us know the expected delivery date and total cost.</p>
        <p>You can reach us at <strong>${PHONE}</strong> or reply directly to this email.</p>
      </div>

      <div class="section">
        <p>Best regards,</p>
        <p><strong>Inventory Manager</strong><br>${COMPANY_NAME}</p>
      </div>
    </div>
  `,
    'Restock Request'
  )

  const text = `
Restock Request from ${COMPANY_NAME}

Hello ${supplier.contact_person},

We would like to request a restock for the following products from ${supplier.company_name}:

${products.map((p) => `- ${p.name}: ${p.quantity_needed || 'As per usual'}`).join('\n')}

Please confirm receipt of this request and let us know the expected delivery date and total cost.

Best regards,
Inventory Manager
${COMPANY_NAME}
  `

  return { html, text }
}
