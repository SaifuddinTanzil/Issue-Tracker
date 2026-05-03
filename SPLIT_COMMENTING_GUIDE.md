# Split Commenting Feature - Implementation Guide

## Overview

The Split Commenting feature enables BRAC staff to communicate with external vendors while maintaining internal-only notes that vendors cannot see. This is achieved through:

1. **Database Layer**: Supabase RLS policies that enforce comment visibility
2. **UI Layer**: The `TicketComments` component with role-based toggle visibility
3. **Server-side**: Role checking to determine available actions

## Database Schema

### New Table: `comments`

```sql
- id (uuid, primary key)
- issue_id (uuid, FK to issues)
- user_id (uuid, FK to users)
- content (text)
- is_internal (boolean, default false) -- Key for split visibility
- created_at (timestamp)
- updated_at (timestamp)
```

### RLS Policies

#### BRAC Staff Access
- **SELECT**: Can read all comments (internal + external)
- **INSERT**: Can create comments with any `is_internal` value
- **UPDATE**: Can modify any comments

#### Vendor Access
- **SELECT**: Can ONLY see comments where `is_internal = false` AND the ticket belongs to their vendor
- **INSERT**: Can ONLY create comments where `is_internal = false`
- **UPDATE**: Not allowed

## Integration

### 1. Apply Database Migration

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute the SQL from:
# supabase/migrations/20260503_comments_rls.sql
```

### 2. Add Component to Ticket Detail Pages

#### For Internal Staff (e.g., `/app/issues/[id]/page.tsx`)

```typescript
import { TicketComments } from '@/components';

export default function IssueDetailPage({ params }: { params: { id: string } }) {
  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* ... existing ticket details ... */}
      
      <TicketComments issueId={params.id} />
    </div>
  );
}
```

#### For Vendors (e.g., `/app/vendor/ticket/[id]/page.tsx`)

```typescript
import { TicketComments } from '@/components';

export default async function VendorTicketPage({ params }: { params: { id: string } }) {
  // ... existing vendor auth checks ...

  return (
    <div className="space-y-6">
      {/* ... existing vendor ticket details ... */}
      
      <TicketComments issueId={params.id} />
    </div>
  );
}
```

**Note**: No code changes needed for vendor access control—RLS policies automatically filter vendor-visible comments.

## Component Usage

### Props

```typescript
interface TicketCommentsProps {
  issueId: string;
}
```

### Features

#### For BRAC Staff
1. **View all comments**: Both internal (marked with amber badge) and external
2. **Mark as internal**: Toggle visible to the component determines if comment is hidden from vendors
3. **Visual distinction**: Internal comments have:
   - Amber/yellow background (`bg-amber-50`)
   - "Internal Only" badge (amber)
   - Border in amber tone

#### For Vendors
1. **View external comments only**: Filtered by RLS policy
2. **Cannot see internal comments**: Automatically hidden by database policy
3. **No internal toggle**: UI checkbox hidden, forced to `is_internal = false`
4. **Submit external comments**: All vendor comments are external by default

### Component Behavior

```
BRAC Staff Flow:
├─ Fetch all comments (RLS allows all)
├─ Display with internal badges
├─ Show internal toggle
└─ On submit: post with is_internal value from toggle

Vendor Flow:
├─ Fetch only is_internal=false comments (RLS enforces)
├─ Display all visible comments
├─ No internal toggle shown
└─ On submit: force is_internal=false
```

## Styling

### Internal Comment Badge
```
Background: bg-amber-100
Text: text-amber-800
Border: border-amber-300
```

### Internal Comment Container
```
Background: bg-amber-50
Border: border-amber-200
```

### External Comment Container
```
Background: bg-slate-50
Border: border-slate-200
```

## Security

### Database-Level Enforcement

All access control is enforced at the **Supabase RLS policy level**, not just the frontend:

1. **Vendor SELECT**: 
   - Policy checks `is_internal = false`
   - Policy verifies ticket belongs to vendor's scope
   - If either fails, row is not returned

2. **Vendor INSERT**:
   - Policy verifies `is_internal = false`
   - Policy verifies ticket is in vendor scope
   - If either fails, insert is rejected

3. **Vendor UPDATE/DELETE**:
   - Completely blocked by policy

### Frontend UI

Frontend role checks are supplementary and provide better UX:
- Hide internal toggle from vendors (cleaner UI)
- Disable form when not authenticated
- Show appropriate messages

But **the database policy is the ultimate security boundary**.

## Testing Checklist

- [ ] Apply migration to Supabase
- [ ] Test BRAC staff can create internal comments
- [ ] Test BRAC staff can create external comments
- [ ] Test BRAC staff sees both internal and external comments
- [ ] Test vendor cannot see internal comments
- [ ] Test vendor can see external comments
- [ ] Test vendor comment defaults to `is_internal=false`
- [ ] Test vendor cannot toggle internal flag
- [ ] Verify internal comment badge displays correctly
- [ ] Test comment timestamps display correctly
- [ ] Test form resets after successful submission
- [ ] Test error handling for failed submissions

## Future Enhancements

### 1. Real-time Subscriptions
```typescript
// Replace standard fetch with Supabase Realtime:
const subscription = supabase
  .channel(`comments:${issueId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
    // Update comments state
  })
  .subscribe();
```

### 2. Comment Editing
- Add UPDATE logic in component
- Show "Edit" button on user's own comments
- Include edited timestamp

### 3. Comment Deletion
- Add DELETE logic
- Soft-delete pattern: `deleted_at` column
- RLS policy: only author or admin can delete

### 4. Mentions & Notifications
- Add `@user` mention syntax
- Create notifications table
- Send email alerts to mentioned users

### 5. Comment Thread Replies
- Add `parent_comment_id` column
- Nest replies under parent comment
- Recursive RLS policies

## Troubleshooting

### Issue: Vendor cannot see any comments

**Cause**: Likely RLS policy issue or `is_internal` all set to true

**Fix**:
1. Check RLS policy syntax in migration
2. Verify `is_internal` column defaults to `false`
3. Check vendor's scope (vendor_id in users table matches issues.vendor_id)
4. Test with: `select * from comments where is_internal = false;` as vendor user

### Issue: Comments not showing real-time

**Solution**: Current implementation uses standard fetch. For real-time, add Supabase subscriptions (see Future Enhancements section).

### Issue: Form not submitting

**Check**:
1. Verify user is authenticated: `user` prop is defined
2. Check Supabase client is initialized: `createClient()` in client component
3. Verify user_id matches auth.uid() in RLS policies
4. Check textarea has text before submit

## File Locations

```
supabase/migrations/
└── 20260503_comments_rls.sql       (Database schema & RLS)

src/components/
├── TicketComments.tsx              (Main component)
└── index.ts                        (Export)

Integration points:
├── src/app/issues/[id]/page.tsx    (Internal staff view)
└── src/app/vendor/ticket/[id]/page.tsx  (Vendor view)
```
