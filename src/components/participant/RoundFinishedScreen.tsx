import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const RoundFinishedScreen = ({ roundNumber }: { roundNumber: number }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center border border-slate-200">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
          Round {roundNumber} Completed
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed mb-8">
          Congratulations! Round {roundNumber} has been successfully completed. Your submissions will now be evaluated. Participants who qualify will move on to the next round. The judges' final decision will be announced at the end of Round {roundNumber}.
        </p>
      </div>
    </div>
  );
};
