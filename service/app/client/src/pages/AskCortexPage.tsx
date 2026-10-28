import { Sparkles } from 'lucide-react';
import AskCortex from '@/components/AskCortex';

const SUGGESTIONS = [
  'What are the top three supply chain risks this quarter?',
  'Which plant needs attention first and why?',
  'Where is working capital tied up in inventory?',
  'Which work centers are bottlenecks?',
  'Which shipping point is least reliable?',
  'Is demand outrunning capacity?',
];

export default function AskCortexPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/60 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
          <Sparkles className="h-4 w-4" /> Cortex supply chain analysis
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Ask a question across production, inventory, logistics, work centers, projects and the supply network.
          Cortex answers from live facts queried from the SAP BDC data products in Snowflake. Fulfillment,
          equipment-health and component figures are representative enrichment data.
        </p>
      </div>
      <AskCortex topic="overview" label="Analyse the supply chain" suggestions={SUGGESTIONS} />
    </div>
  );
}
