-- Android builds without Google services receive push through UnifiedPush (Web Push to the user's distributor).
ALTER TYPE "PushPlatform" ADD VALUE 'UNIFIED_PUSH';
