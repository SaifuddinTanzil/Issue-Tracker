-- ============================================================================
-- DATA WIPE SCRIPT: Clear all dummy/test data from database
-- ============================================================================
-- WARNING: This script will DELETE all data from the following tables:
--   - public.issues (all dummy issue tickets)
--   - public.issue_comments (all comments on dummy tickets)
--   - public.notifications (all notifications)
--   - Test/dummy users (users with test emails)
-- 
-- This preserves the table structure and RLS policies.
-- Run this in Supabase SQL Editor when you're ready to start fresh.
-- ============================================================================

BEGIN;

-- Step 1: Disable RLS temporarily to allow deletions (if needed)
-- ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.issue_comments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete all comments first (foreign key constraint)
-- Comment out this if table name differs
DELETE FROM public.issue_comments
WHERE issue_id IN (
  SELECT id FROM public.issues
  WHERE created_at IS NOT NULL
);

-- Step 3: Delete all notifications
DELETE FROM public.notifications
WHERE created_at IS NOT NULL;

-- Step 4: Delete all dummy issues
-- This will delete ALL issues. Adjust the WHERE clause if you want to preserve some data
DELETE FROM public.issues
WHERE created_at IS NOT NULL;

-- Step 5: Delete test/dummy users (keep real users)
-- Identify dummy users by test email patterns
DELETE FROM public.users
WHERE lower(email) LIKE '%@test.%'
   OR lower(email) LIKE '%@vendor.%'
   OR lower(email) LIKE '%uat@%'
   OR lower(email) IN (
     'admin@company.com',
     'resolver.crmsquad@vendor.com',
     'reporter.uat@company.com',
     'maria.hossain@vendor.com',
     'rakib.rahman@uat.com'
   );

-- Step 6: Re-enable RLS
-- ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 7: Reset sequences (optional, for clean ID generation)
-- SELECT setval('public.issues_id_seq', 1, false);
-- SELECT setval('public.issue_comments_id_seq', 1, false);
-- SELECT setval('public.notifications_id_seq', 1, false);

COMMIT;

-- Verify deletion was successful
-- SELECT COUNT(*) as issues_remaining FROM public.issues;
-- SELECT COUNT(*) as comments_remaining FROM public.issue_comments;
-- SELECT COUNT(*) as notifications_remaining FROM public.notifications;
-- SELECT COUNT(*) as users_remaining FROM public.users WHERE lower(email) LIKE '%test%' OR lower(email) LIKE '%vendor%';
