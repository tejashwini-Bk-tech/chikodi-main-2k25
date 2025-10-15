import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-gray-800 mb-3">Welcome to Chikodi</h1>
          <p className="text-lg text-gray-600">
            Discover services around you or collaborate with us as a service provider.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Book Local Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Find Trusted Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Marketplace & Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">User Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Scheduling & Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Payments & Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-2xl sm:col-span-2 lg:col-span-3">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Collaborate with us</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                className="btn-primary h-12 px-8"
                onClick={() => navigate('/privacy')}
                data-testid="collab-with-us-btn"
              >
                Collab with us
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Home;
