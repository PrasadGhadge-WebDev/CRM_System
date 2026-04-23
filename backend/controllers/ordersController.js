const Order = require('../models/Order');
const { asyncHandler } = require('../middleware/asyncHandler');

exports.listOrders = asyncHandler(async (req, res) => {
  const { customer_id, company_id } = req.query;
  const filter = {};
  
  if (req.user?.company_id) {
    filter.company_id = req.user.company_id;
  } else if (company_id) {
    filter.company_id = company_id;
  }

  if (customer_id) {
    filter.customer_id = customer_id;
  }

  const items = await Order.find(filter).sort({ created_at: -1 });
  res.ok({ items, total: items.length });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.fail('Order not found', 404);
  res.ok(order);
});

exports.createOrder = asyncHandler(async (req, res) => {
  const payload = req.body;
  if (req.user?.company_id) payload.company_id = req.user.company_id;
  const order = await Order.create(payload);
  res.created(order);
});
