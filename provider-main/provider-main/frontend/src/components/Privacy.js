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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Card className="glass-card border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-gray-800">Privacy & Terms</CardTitle>
            <p className="text-gray-600 mt-2">Please review and accept to continue</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-gray-700">
              <p className="font-semibold">What you should know:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We collect only the information needed to onboard you as a service professional.</li>
                <li>Your documents are used to verify your professional identity and improve trust.</li>
                <li>You can update your professional details from your dashboard later.</li>
                <li>We do not share your personal data with third parties without consent.</li>
                <li>By continuing, you agree to our fair use, authenticity, and safety guidelines.</li>
              </ul>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Checkbox id="accept" checked={accepted} onCheckedChange={setAccepted} />
              <Label htmlFor="accept" className="text-sm">I have read and accept the Privacy & Terms</Label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="h-12 px-6" disabled={!accepted} onClick={handleNext}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Privacy;
