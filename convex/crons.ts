import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily('schedule upcoming gifts', { hourUTC: 12, minuteUTC: 0 }, internal.gifts.scheduleUpcoming, {});

export default crons;
