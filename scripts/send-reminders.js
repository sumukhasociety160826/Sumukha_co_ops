/**
 * Sumukha Co-Op Society - Automated 3-Stage Email Reminder Worker
 * Designed to run via GitHub Actions Cron (100% free) or Node serverless function.
 *
 * Schedule:
 * - 7 Days before collection date (Advance Notice)
 * - 3 Days before collection date (Pending Reminder)
 * - 1 Day before collection date (Urgent Notice)
 */

import fs from 'fs';
import path from 'path';

// Load society state
const statePath = path.resolve(process.cwd(), 'src/js/state.js');
console.log('--- Sumukha Co-Op Society: Automated Email Reminder Worker ---');
console.log('Worker started at:', new Date().toISOString());

const COLLECTION_DAY_OF_MONTH = 10; // Society collection due date (e.g. 10th of every month)

function runReminderCheck() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // Due date for this month
  const dueDate = new Date(currentYear, currentMonth, COLLECTION_DAY_OF_MONTH);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  console.log(`Today's Date: ${today.toISOString().slice(0, 10)}`);
  console.log(`Collection Due Date: ${dueDate.toISOString().slice(0, 10)} (${diffDays} days away)`);

  let stage = null;
  if (diffDays === 7) {
    stage = '7_day';
  } else if (diffDays === 3) {
    stage = '3_day';
  } else if (diffDays === 1) {
    stage = '1_day';
  } else {
    console.log(`No automated reminder scheduled for today (${diffDays} days before due date).`);
    console.log('Reminders trigger on exactly 7, 3, and 1 days before the due date.');
    return;
  }

  console.log(`Triggering Stage: [${stage}] reminders...`);
  // Dispatch logic using Resend or free SMTP
  console.log('Simulating automated email dispatch to pending members...');
  console.log('✅ Automated reminder run completed successfully.');
}

runReminderCheck();
