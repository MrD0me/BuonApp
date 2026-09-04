'use client';

import { StaffSettings } from '@/components/settings/StaffSettings';

/**
 * Staff moved into Settings; this route stays so a bookmark, or anything
 * still linking here, lands on the same screen instead of a dead end.
 */
export default function StaffPage() {
  return <StaffSettings />;
}
