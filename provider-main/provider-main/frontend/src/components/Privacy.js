import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

function Privacy() {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (accepted) navigate('/register/step/1');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-950 dark:to-black py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
          <Card className="border-0 bg-transparent">
            <CardHeader className="text-center pb-2 relative z-10">
              <CardTitle className="display-font text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 transition-colors">Privacy & Terms</CardTitle>
              <p className="text-slate-700 dark:text-slate-300 mt-2">Please review and accept to continue</p>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3 text-slate-800 dark:text-slate-200">
                <p className="font-semibold">What you should know:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We collect only the information needed to onboard you as a service professional.</li>
                  <li>Your documents are used to verify your professional identity and improve trust.</li>
                  <li>You can update your professional details from your dashboard later.</li>
                  <li>We do not share your personal data with third parties without consent.</li>
                  <li>By continuing, you agree to our fair use, authenticity, and safety guidelines.</li>
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Checkbox id="accept" checked={accepted} onCheckedChange={setAccepted} />
                <Label htmlFor="accept" className="text-sm text-slate-700 dark:text-slate-300">I have read and accept the Privacy & Terms</Label>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!accepted}
                  onClick={handleNext}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Privacy;