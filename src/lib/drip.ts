import fs from 'fs';
import path from 'path';

const DRIP_DIR = path.join(process.cwd(), 'content', 'drip');
const SUBSCRIBERS_FILE = path.join(DRIP_DIR, 'subscribers.json');

export interface DripSubscriber {
  email: string;
  name?: string;
  industry: string;
  source: 'quiz' | 'audit' | 'exit-intent';
  subscribedAt: string;
  emailsSent: number[]; // Day numbers of emails sent
  unsubscribed?: boolean;
}

function ensureDir() {
  if (!fs.existsSync(DRIP_DIR)) fs.mkdirSync(DRIP_DIR, { recursive: true });
}

export function getSubscribers(): DripSubscriber[] {
  ensureDir();
  try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

export function saveSubscribers(subs: DripSubscriber[]) {
  ensureDir();
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subs, null, 2));
}

export function addSubscriber(sub: Omit<DripSubscriber, 'subscribedAt' | 'emailsSent'>): boolean {
  const subs = getSubscribers();
  if (subs.some((s) => s.email.toLowerCase() === sub.email.toLowerCase() && !s.unsubscribed)) {
    return false; // duplicate
  }
  subs.push({ ...sub, subscribedAt: new Date().toISOString(), emailsSent: [] });
  saveSubscribers(subs);
  return true;
}

export function unsubscribeEmail(email: string): boolean {
  const subs = getSubscribers();
  const sub = subs.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (!sub) return false;
  sub.unsubscribed = true;
  saveSubscribers(subs);
  return true;
}

export const DRIP_SCHEDULE = [
  { day: 0, subject: 'Your AI readiness results are in' },
  { day: 2, subject: "The #1 mistake businesses make with AI (and how to avoid it)" },
  { day: 5, subject: '3 AI tools you can use for free right now' },
  { day: 9, subject: 'How {industry} businesses are using AI in 2026' },
  { day: 14, subject: 'Your AI action plan is waiting' },
];
