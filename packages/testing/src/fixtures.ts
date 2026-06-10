/** Stable IDs for demo data — must match infra/supabase/seed.sql. */

export const fixtures = {
  operator: { id: '00000000-0000-0000-0000-000000000001', name: 'Ridge Co-op' },
  users: {
    admin:      { id: '22222222-2222-2222-2222-222222222201', email: 'admin@demo.openride' },
    dispatcher: { id: '22222222-2222-2222-2222-222222222202', email: 'dispatcher@demo.openride' },
    drivers: [
      { id: '22222222-2222-2222-2222-222222222210', phone: '+61400000010', name: 'Drew Driver' },
      { id: '22222222-2222-2222-2222-222222222211', phone: '+61400000011', name: 'Daria Driver' },
      { id: '22222222-2222-2222-2222-222222222212', phone: '+61400000012', name: 'Devin Driver' },
    ],
    riders: [
      { id: '22222222-2222-2222-2222-222222222220', phone: '+61400000020', name: 'Rita Rider' },
      { id: '22222222-2222-2222-2222-222222222221', phone: '+61400000021', name: 'Roman Rider' },
    ],
  },
  vehicles: [
    { id: '33333333-3333-3333-3333-333333333301', rego: 'CAB-001' },
    { id: '33333333-3333-3333-3333-333333333302', rego: 'EV-002' },
    { id: '33333333-3333-3333-3333-333333333303', rego: 'WAV-003' },
  ],
} as const;
