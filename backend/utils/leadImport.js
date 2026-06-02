const FIELD_ALIASES = {
  name: ['name', 'lead', 'lead_name', 'full_name', 'candidate', 'candidate_name'],
  email: ['email', 'email_id', 'email_address', 'mail'],
  phone: [
    'phone', 'mobile', 'mobile_no', 'mobileno', 'mobile_number', 'mobilenumber',
    'contact', 'contact_no', 'contact_number', 'contactno', 'contact_number',
    'phone_no', 'phoneno', 'phone_number', 'tel', 'telephone', 'cell', 'whatsapp',
  ],
  position_applied: [
    'position', 'position_applied', 'position_applied_for', 'position_to_applied',
    'positiontoapplied', 'job', 'role', 'designation', 'applied_position', 'job_title',
  ],
  company: ['company', 'organization', 'org'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
  priority: ['priority'],
  status: ['status'],
};

function normalizeHeaderKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[#]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeUploadRow(row) {
  const norm = {};
  for (const [key, val] of Object.entries(row)) {
    norm[normalizeHeaderKey(key)] = val;
  }
  return norm;
}

function pickField(norm, aliases) {
  for (const key of aliases) {
    const val = norm[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }
  return '';
}

function formatPhone(val) {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number' && Number.isFinite(val)) {
    return String(Math.trunc(val));
  }
  const s = String(val).trim();
  if (/^\d+\.0+$/.test(s)) return s.replace(/\.0+$/, '');
  return s;
}

function mapRowToLead(row, createdBy) {
  const norm = normalizeUploadRow(row);
  const name = String(pickField(norm, FIELD_ALIASES.name)).trim();
  if (!name) return null;

  const priority = String(pickField(norm, FIELD_ALIASES.priority) || 'medium').toLowerCase();
  const status = String(pickField(norm, FIELD_ALIASES.status) || 'new').toLowerCase();

  return {
    name,
    email: String(pickField(norm, FIELD_ALIASES.email)).trim(),
    phone: formatPhone(pickField(norm, FIELD_ALIASES.phone)),
    company: String(pickField(norm, FIELD_ALIASES.company)).trim(),
    source: 'excel',
    status: status || 'new',
    priority: priority || 'medium',
    notes: String(pickField(norm, FIELD_ALIASES.notes)).trim(),
    position_applied: String(pickField(norm, FIELD_ALIASES.position_applied)).trim(),
    created_by: createdBy,
  };
}

module.exports = { mapRowToLead, normalizeHeaderKey, FIELD_ALIASES };
