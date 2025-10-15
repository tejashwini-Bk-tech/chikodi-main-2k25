import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { mockProviders } from '../utils/mockData';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from '../hooks/use-toast';

const BookNow = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [date, setDate] = useState();
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const found = mockProviders.find(p => p.id === id);
    if (found) {
      setProvider(found);
    } else {
      navigate('/providers');
    }
  }, [id, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Booking Request Sent!",
      description: `${provider.name} will contact you shortly to confirm`,
    });
    setTimeout(() => navigate('/profile'), 1500);
  };

  if (!provider) return null;

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
    '4:00 PM', '5:00 PM', '6:00 PM'
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 animate-in fade-in duration-500">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
            Book Service
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Schedule your appointment with {provider.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <Card className="lg:col-span-2 border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-2"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? date.toLocaleDateString() : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => date < new Date(new Date().toDateString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Selection */}
                <div>
                  <Label>Select Time</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={time === slot ? 'default' : 'outline'}
                        onClick={() => setTime(slot)}
                        className={`transition-all duration-200 ${
                          time === slot
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white'
                            : ''
                        }`}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address">Service Address</Label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-24"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!date || !time || !address}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-6 text-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  Confirm Booking
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Provider Summary */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
              <CardHeader>
                <CardTitle>Service Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-16 h-16 ring-2 ring-blue-600">
                    <AvatarImage src={provider.image} alt={provider.name} />
                    <AvatarFallback>{provider.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{provider.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{provider.service}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Rating</span>
                    <span className="font-semibold">{provider.rating} / 5.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Distance</span>
                    <span className="font-semibold">{provider.distance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Starting Rate</span>
                    <span className="font-semibold text-blue-600">{provider.price}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/provider/${provider.id}`)}
                >
                  View Full Profile
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-bottom duration-700">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Need Help?</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Contact our support team if you have any questions about the booking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookNow;