import type { Metadata } from 'next';
import ToolsPageClient from '@/components/tools/ToolsPageClient';

export const metadata: Metadata = {
  title: 'Free AI Tools — 8 Business Tools Powered by Claude',
  description: 'Eight free AI-powered business tools. Invoice scanner, quote generator, competitor analysis, email drafter, document summariser, meeting actions, job ads, contract review. No signup.',
};

export default function ToolsPage() {
  return <ToolsPageClient />;
}
