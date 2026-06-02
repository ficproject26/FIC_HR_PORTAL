const LeadActivity = require('../models/LeadActivity');

async function attachLastStatusUpdates(leads) {
  if (!leads.length) return leads;

  const leadIds = leads.map((l) => l._id);
  const rows = await LeadActivity.aggregate([
    { $match: { lead_id: { $in: leadIds }, action: 'status_changed' } },
    { $sort: { created_at: -1 } },
    {
      $group: {
        _id: '$lead_id',
        status_updated_at: { $first: '$created_at' },
        previous_status: { $first: '$old_status' },
        status_updated_to: { $first: '$new_status' },
        status_updated_by: { $first: '$user_id' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'status_updated_by',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ]);

  const byLead = Object.fromEntries(rows.map((r) => [r._id.toString(), r]));

  return leads.map((l) => {
    const row = byLead[l._id.toString()];
    if (!row) return l;
    return {
      ...l,
      status_updated_at: row.status_updated_at,
      previous_status: row.previous_status,
      status_updated_to: row.status_updated_to,
      status_updated_by_name: row.user?.name || null,
    };
  });
}

module.exports = { attachLastStatusUpdates };
