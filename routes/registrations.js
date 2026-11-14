// routes/registrations.js - REST API routes for registration management
const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');

// ─────────────────────────────────────────────────────────────
// Allowed values for safe query construction (whitelist)
// ─────────────────────────────────────────────────────────────
const ALLOWED_SORT_FIELDS = ['registrationId', 'participantName', 'registrationDate', 'fee', 'eventName', 'createdAt'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];
const ALLOWED_CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Seminar', 'Other'];
const ALLOWED_PAYMENT_STATUSES = ['Paid', 'Pending', 'Failed'];

// ─────────────────────────────────────────────────────────────
// Helper: Build a MongoDB query object from validated parameters
//
// This function constructs ALL query logic server-side.
// No filtering is done in JavaScript after fetching documents.
// ─────────────────────────────────────────────────────────────
function buildQuery(params) {
  const {
    search,          // text search (name or registration ID)
    searchById,      // search specifically by registration _id
    eventName,       // exact event name filter
    eventCategory,   // single category or comma-separated categories ($in)
    dateFrom,        // $gte on registrationDate
    dateTo,          // $lte on registrationDate
    paymentStatus,   // single status or comma-separated statuses ($in)
    feeGt,           // $gt on fee
    feeLt,           // $lt on fee
    feeGte,          // $gte on fee
    feeLte,          // $lte on fee
    feeNe,           // $ne on fee (not equal)
    paymentNe,       // $ne on paymentStatus
    orSearch,        // participant name OR event name
    logicalOr,       // "or" mode for category+status
  } = params;

  // We collect individual condition clauses and combine with $and
  const andClauses = [];

  // ── 1. Search by registrationId (e.g. EM101) OR participant name ──
  if (searchById && searchById.trim()) {
    const rawId = searchById.trim();
    const escaped = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
      andClauses.push({
        $or: [
          { _id: rawId },
          { registrationId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        ],
      });
    } else {
      andClauses.push({
        registrationId: { $regex: new RegExp(escaped, 'i') },
      });
    }
  } else if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    andClauses.push({ participantName: { $regex: regex } });
  }

  // ── 2. $or search: match participantName OR eventName ────────
  if (orSearch && orSearch.trim()) {
    const regex = new RegExp(orSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    andClauses.push({
      $or: [
        { participantName: { $regex: regex } },
        { eventName: { $regex: regex } },
      ],
    });
  }

  // ── 3. Event Name filter ──────────────────────────────────────
  if (eventName && eventName.trim()) {
    const regex = new RegExp(eventName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    andClauses.push({ eventName: { $regex: regex } });
  }

  // ── 4. Event Category filter ($in for multiple, exact for single) ──
  if (eventCategory && eventCategory.trim()) {
    const categories = eventCategory
      .split(',')
      .map(c => c.trim())
      .filter(c => ALLOWED_CATEGORIES.includes(c));

    if (categories.length > 0) {
      if (categories.length === 1) {
        andClauses.push({ eventCategory: categories[0] });
      } else {
        // $in operator — MongoDB matches any of the given categories
        andClauses.push({ eventCategory: { $in: categories } });
      }
    }
  }

  // ── 5. Registration Date range ($gte / $lte) ──────────────────
  const dateClause = {};
  if (dateFrom && !isNaN(Date.parse(dateFrom))) {
    // $gte: registrations on or after this date
    dateClause.$gte = new Date(dateFrom);
  }
  if (dateTo && !isNaN(Date.parse(dateTo))) {
    // $lte: registrations on or before this date (end of day)
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    dateClause.$lte = to;
  }
  if (Object.keys(dateClause).length > 0) {
    andClauses.push({ registrationDate: dateClause });
  }

  // ── 6. Payment Status filter ($in / $ne) ─────────────────────
  if (paymentNe && ALLOWED_PAYMENT_STATUSES.includes(paymentNe)) {
    // $ne: registrations whose status is NOT the given value
    andClauses.push({ paymentStatus: { $ne: paymentNe } });
  } else if (paymentStatus && paymentStatus.trim()) {
    const statuses = paymentStatus
      .split(',')
      .map(s => s.trim())
      .filter(s => ALLOWED_PAYMENT_STATUSES.includes(s));

    if (statuses.length > 0) {
      if (statuses.length === 1) {
        andClauses.push({ paymentStatus: statuses[0] });
      } else {
        // $in operator — match any of the selected payment statuses
        andClauses.push({ paymentStatus: { $in: statuses } });
      }
    }
  }

  // ── 7. Fee comparison operators ───────────────────────────────
  const feeClause = {};

  if (feeGt !== undefined && feeGt !== '' && !isNaN(Number(feeGt))) {
    feeClause.$gt = Number(feeGt);   // $gt: fee greater than
  }
  if (feeLt !== undefined && feeLt !== '' && !isNaN(Number(feeLt))) {
    feeClause.$lt = Number(feeLt);   // $lt: fee less than
  }
  if (feeGte !== undefined && feeGte !== '' && !isNaN(Number(feeGte))) {
    feeClause.$gte = Number(feeGte); // $gte: fee greater than or equal
  }
  if (feeLte !== undefined && feeLte !== '' && !isNaN(Number(feeLte))) {
    feeClause.$lte = Number(feeLte); // $lte: fee less than or equal
  }
  if (feeNe !== undefined && feeNe !== '' && !isNaN(Number(feeNe))) {
    feeClause.$ne = Number(feeNe);   // $ne: fee not equal to
  }
  if (Object.keys(feeClause).length > 0) {
    andClauses.push({ fee: feeClause });
  }

  // ── 8. Combine all clauses ────────────────────────────────────
  // If we have multiple conditions, use $and to require all of them.
  // If we have exactly one condition, use it directly.
  // If we have no conditions, return {} (match all).
  if (andClauses.length === 0) return {};
  if (andClauses.length === 1) return andClauses[0];

  // $and operator — ALL conditions must be satisfied simultaneously
  return { $and: andClauses };
}

// ─────────────────────────────────────────────────────────────
// GET /api/registrations
// List registrations with optional search, filters and sorting.
// All query operations are executed by MongoDB via Mongoose.
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // 1. Build MongoDB query from validated request parameters
    const query = buildQuery(req.query);

    // 2. Build sort object (validated against whitelist)
    let sortField = req.query.sortBy || 'createdAt';
    let sortOrder = req.query.sortOrder || 'desc';

    if (!ALLOWED_SORT_FIELDS.includes(sortField)) sortField = 'createdAt';
    if (!ALLOWED_SORT_ORDERS.includes(sortOrder)) sortOrder = 'desc';

    const sortObj = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // 3. Execute the query on MongoDB — Mongoose sends the query to MongoDB,
    //    MongoDB performs the actual filtering and sorting, then returns results.
    const registrations = await Registration.find(query).sort(sortObj);

    // 4. Return results with metadata
    res.json({
      success: true,
      count: registrations.length,
      query: query,         // include constructed query for transparency
      sortBy: sortField,
      sortOrder: sortOrder,
      data: registrations,
    });
  } catch (err) {
    console.error('GET /registrations error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/registrations/stats/summary
// Returns aggregate statistics using MongoDB aggregation pipeline
// NOTE: This route must be defined BEFORE /:id to avoid Express
//       treating "summary" as an ObjectId parameter.
// ─────────────────────────────────────────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Registration.aggregate([
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalFees: { $sum: '$fee' },
          avgFee: { $avg: '$fee' },
          maxFee: { $max: '$fee' },
          minFee: { $min: '$fee' },
        },
      },
    ]);

    const statusCounts = await Registration.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    ]);

    const categoryCounts = await Registration.aggregate([
      { $group: { _id: '$eventCategory', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {},
        byStatus: statusCounts,
        byCategory: categoryCounts,
      },
    });
  } catch (err) {
    console.error('GET /stats/summary error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/registrations/:id
// Retrieve a single registration by MongoDB _id (findOne)
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    // findOne with the _id condition
    const registration = await Registration.findOne({ _id: req.params.id });

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    res.json({ success: true, data: registration });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid registration ID format' });
    }
    console.error('GET /registrations/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/registrations
// Create a new registration document in MongoDB
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      participantName,
      eventName,
      eventCategory,
      registrationDate,
      email,
      phone,
      fee,
      paymentStatus,
    } = req.body;

    // Whitelist: only accept known fields to prevent injection
    const registrationData = {
      participantName,
      eventName,
      eventCategory,
      registrationDate,
      email,
      phone,
      fee,
      paymentStatus,
    };

    // ── Auto-generate registrationId (e.g. EM101, EM102 …) ──────
    const all = await Registration.find(
      { registrationId: { $regex: /^EM\d+$/i } },
      { registrationId: 1 }
    );
    let maxNum = 100;
    for (const doc of all) {
      if (doc.registrationId) {
        const n = parseInt(doc.registrationId.replace(/^EM/i, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }
    registrationData.registrationId = `EM${maxNum + 1}`;
    // ────────────────────────────────────────────────────────────

    const registration = new Registration(registrationData);
    const saved = await registration.save(); // Mongoose validates then inserts

    res.status(201).json({
      success: true,
      message: 'Registration created successfully',
      data: saved,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('; ') });
    }
    console.error('POST /registrations error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/registrations/:id
// Update an existing registration using updateOne
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const {
      participantName,
      eventName,
      eventCategory,
      registrationDate,
      email,
      phone,
      fee,
      paymentStatus,
    } = req.body;

    // Whitelist the fields allowed to be updated
    const updateData = {};
    if (participantName !== undefined) updateData.participantName = participantName;
    if (eventName !== undefined) updateData.eventName = eventName;
    if (eventCategory !== undefined) updateData.eventCategory = eventCategory;
    if (registrationDate !== undefined) updateData.registrationDate = registrationDate;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (fee !== undefined) updateData.fee = fee;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;

    // findOne first to check existence, then updateOne for the actual update
    const existing = await Registration.findOne({ _id: req.params.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // updateOne: MongoDB updates the matched document
    await Registration.updateOne(
      { _id: req.params.id },
      { $set: updateData },
      { runValidators: true }
    );

    // Fetch the updated document to return it
    const updated = await Registration.findOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Registration updated successfully',
      data: updated,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid registration ID format' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('; ') });
    }
    console.error('PUT /registrations/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/registrations/:id
// Remove a registration using deleteOne
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // findOne first to verify the document exists
    const existing = await Registration.findOne({ _id: req.params.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // deleteOne: MongoDB removes the matched document
    await Registration.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: `Registration for "${existing.participantName}" deleted successfully`,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid registration ID format' });
    }
    console.error('DELETE /registrations/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
