'use client';

import { CustomerHeader } from '@/components/CustomerHeader';
import { customerApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@allgo/ui';
import { useState } from 'react';

export default function CustomerRidesPage() {
  const [pickupAddress, setPickupAddress] = useState('Anna Nagar, Chennai');
  const [dropoffAddress, setDropoffAddress] = useState('T. Nagar, Chennai');
  const [pickupLat] = useState(13.085);
  const [pickupLng] = useState(80.2101);
  const [dropoffLat] = useState(13.0418);
  const [dropoffLng] = useState(80.2341);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('AUTO');
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customerApi.estimateRideFare({
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
      });
      setEstimates(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to estimate fare');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const ride = await customerApi.bookRide({
        vehicleCategory: selectedCategory,
        pickupLat,
        pickupLng,
        pickupAddress,
        dropoffLat,
        dropoffLng,
        dropoffAddress,
      });
      setActiveRide(ride);
    } catch (err: any) {
      setError(err?.message || 'Please sign in to book a ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div>
          <Badge variant="secondary">AllGo Mobility</Badge>
          <h1 className="mt-1 text-2xl font-bold">AllGo Rides</h1>
          <p className="text-sm text-muted-foreground">
            Compare Bike, Auto, and Cab fares in real time and book instantly.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {activeRide ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Active Ride #{activeRide.rideNumber || activeRide.id?.slice(0, 8)}
                </CardTitle>
                <Badge>{activeRide.status}</Badge>
              </div>
              <CardDescription>
                {activeRide.pickupAddress} → {activeRide.dropoffAddress}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {activeRide.startOtp && (
                <div className="rounded-md bg-amber-50 p-3 font-bold text-amber-900">
                  Start Ride PIN: {activeRide.startOtp}
                </div>
              )}
              <div>Estimated Fare: ₹{Number(activeRide.totalFareInr || 0).toFixed(0)}</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const fresh = await customerApi.getRide(activeRide.id);
                    setActiveRide(fresh);
                  }}
                >
                  Refresh Status
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await customerApi.cancelRide(activeRide.id, 'Cancelled by customer');
                    setActiveRide(null);
                  }}
                >
                  Cancel Ride
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Your Trip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Pickup location"
              />
              <Input
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                placeholder="Dropoff location"
              />
              <Button variant="outline" onClick={handleEstimate} disabled={loading}>
                {loading ? 'Calculating...' : 'Compare Ride Fares'}
              </Button>

              {estimates.length > 0 && (
                <div className="space-y-2 pt-2">
                  {estimates.map((est) => {
                    const cat = est.vehicleCategory;
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                          active ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{String(cat).replaceAll('_', ' ')}</div>
                          <div className="text-xs text-muted-foreground">
                            ~{est.estimatedDurationMinutes} mins •{' '}
                            {Number(est.estimatedDistanceKm).toFixed(1)} km
                          </div>
                        </div>
                        <span className="font-bold text-base">
                          ₹{Number(est.totalFareInr).toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                  <Button className="w-full" onClick={handleBook} disabled={loading}>
                    Book {selectedCategory.replaceAll('_', ' ')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
