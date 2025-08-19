import React, { useState, useMemo } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Service } from '../types';
import { CarIcon, CheckCircleIcon } from './icons';

type BookingStep = 'services' | 'schedule' | 'details' | 'confirm' | 'complete';

const BookingPage: React.FC = () => {
    const [step, setStep] = useState<BookingStep>('services');
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });
    const [vehicleInfo, setVehicleInfo] = useState({ make: '', model: '', year: new Date().getFullYear(), color: '' });
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const services = useQuery(api.booking.getPublicServices);
    const getAvailableSlots = useAction(api.booking.getAvailableSlots);
    const createBooking = useMutation(api.booking.createBooking);

    const [availableSlots, setAvailableSlots] = useState<string[]>([]);

    const totalDuration = useMemo(() => selectedServices.reduce((acc, s) => acc + (s.estimatedDurationHours || 1), 0), [selectedServices]);
    const totalPrice = useMemo(() => selectedServices.reduce((acc, s) => acc + s.basePrice, 0), [selectedServices]);

    const handleServiceToggle = (service: Service) => {
        setSelectedServices(prev =>
            prev.some(s => s._id === service._id)
                ? prev.filter(s => s._id !== service._id)
                : [...prev, service]
        );
    };

    const handleDateChange = async (date: Date) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setAvailableSlots([]);
        setIsLoadingSlots(true);
        try {
            const slots = await getAvailableSlots({
                date: date.toISOString().split('T')[0],
                totalDurationMinutes: totalDuration * 60,
            });
            setAvailableSlots(slots);
        } catch (error) {
            console.error(error);
            alert('Failed to load available slots. Please try another date.');
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'customer' | 'vehicle') => {
        const { name, value } = e.target;
        if (type === 'customer') {
            setCustomerInfo(prev => ({ ...prev, [name]: value }));
        } else {
            setVehicleInfo(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmitBooking = async () => {
        if (!selectedTime) return;
        setIsBooking(true);
        try {
            await createBooking({
                customerInfo,
                vehicleInfo,
                serviceIds: selectedServices.map(s => s._id),
                startTime: new Date(selectedTime).getTime(),
                totalPrice,
                totalDurationMinutes: totalDuration * 60,
            });
            setStep('complete');
        } catch (error: any) {
            console.error("Booking submission error:", error);
            if (error?.data?.kind === 'RateLimitError') {
                alert('Too many booking attempts have been made recently. Please wait a while before trying again.');
            } else {
                alert('There was an error creating your booking. Please try again.');
            }
        } finally {
            setIsBooking(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 'services':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Select Your Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                            {(services || []).map(s => (
                                <button key={s._id} onClick={() => handleServiceToggle(s)} className={`p-4 bg-gray-700 rounded-lg text-left transition-all duration-200 border-2 ${selectedServices.some(sel => sel._id === s._id) ? 'border-primary' : 'border-transparent hover:border-gray-500'}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-white">{s.name}</h3>
                                        <p className="font-bold text-primary">${s.basePrice}</p>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{s.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">{s.estimatedDurationHours || 1} hr(s)</p>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'schedule':
                const today = new Date();
                today.setHours(0,0,0,0);
                const dates = Array.from({ length: 14 }).map((_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() + i);
                    return d;
                });
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Choose a Date & Time</h2>
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Select a Date:</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {dates.map(date => (
                                <button key={date.toISOString()} onClick={() => handleDateChange(date)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${selectedDate?.toDateString() === date.toDateString() ? 'bg-primary text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </button>
                            ))}
                        </div>
                         <h3 className="text-sm font-semibold text-gray-300 mb-2">Select a Time Slot:</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {isLoadingSlots ? <p className="text-gray-400 col-span-full text-center">Loading slots...</p> : 
                             availableSlots.length > 0 ? availableSlots.map(slot => (
                                <button key={slot} onClick={() => setSelectedTime(slot)} className={`p-3 rounded-lg text-sm transition-colors ${selectedTime === slot ? 'bg-primary text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </button>
                            )) : selectedDate && <p className="text-gray-500 col-span-full text-center">No available slots for this day.</p>
                            }
                         </div>
                    </div>
                );
            case 'details':
                return (
                    <div>
                         <h2 className="text-2xl font-bold text-white mb-4">Your Information</h2>
                         <div className="space-y-4">
                            <div><label className="text-sm text-gray-400">Full Name</label><input type="text" name="name" value={customerInfo.name} onChange={(e) => handleInfoChange(e, 'customer')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                            <div><label className="text-sm text-gray-400">Email</label><input type="email" name="email" value={customerInfo.email} onChange={(e) => handleInfoChange(e, 'customer')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                            <div><label className="text-sm text-gray-400">Phone</label><input type="tel" name="phone" value={customerInfo.phone} onChange={(e) => handleInfoChange(e, 'customer')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                         </div>
                         <h2 className="text-xl font-bold text-white mt-8 mb-4">Vehicle Information</h2>
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-sm text-gray-400">Make</label><input type="text" name="make" value={vehicleInfo.make} onChange={(e) => handleInfoChange(e, 'vehicle')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                            <div><label className="text-sm text-gray-400">Model</label><input type="text" name="model" value={vehicleInfo.model} onChange={(e) => handleInfoChange(e, 'vehicle')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                            <div><label className="text-sm text-gray-400">Year</label><input type="number" name="year" value={vehicleInfo.year} onChange={(e) => handleInfoChange(e, 'vehicle')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                            <div><label className="text-sm text-gray-400">Color</label><input type="text" name="color" value={vehicleInfo.color} onChange={(e) => handleInfoChange(e, 'vehicle')} className="w-full bg-gray-700 p-2 rounded mt-1" /></div>
                         </div>
                    </div>
                );
             case 'confirm':
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Confirm Your Booking</h2>
                        <div className="bg-gray-700/50 p-4 rounded-lg space-y-3">
                            <div><h3 className="font-semibold text-gray-300">Services:</h3><ul className="list-disc list-inside text-gray-400">{selectedServices.map(s => <li key={s._id}>{s.name}</li>)}</ul></div>
                            <div><h3 className="font-semibold text-gray-300">Appointment:</h3><p className="text-gray-400">{selectedTime ? new Date(selectedTime).toLocaleString() : 'Not selected'}</p></div>
                             <div><h3 className="font-semibold text-gray-300">Vehicle:</h3><p className="text-gray-400">{`${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`}</p></div>
                             <div className="text-right text-2xl font-bold text-primary pt-3 border-t border-gray-600">Total: ${totalPrice.toFixed(2)}</div>
                        </div>
                    </div>
                );
            case 'complete':
                return (
                    <div className="text-center">
                        <CheckCircleIcon className="w-24 h-24 text-primary mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white">Booking Confirmed!</h2>
                        <p className="text-gray-400 mt-2">Thank you, {customerInfo.name}. We've received your appointment request and will be in touch shortly if we have any questions. You will receive a confirmation email.</p>
                    </div>
                );
        }
    };
    
    const isNextDisabled = () => {
        if (step === 'services' && selectedServices.length === 0) return true;
        if (step === 'schedule' && !selectedTime) return true;
        if (step === 'details' && (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !vehicleInfo.make || !vehicleInfo.model)) return true;
        return false;
    };

    const nextStep = () => {
        if (step === 'services') setStep('schedule');
        if (step === 'schedule') setStep('details');
        if (step === 'details') setStep('confirm');
    };

    const prevStep = () => {
        if (step === 'schedule') setStep('services');
        if (step === 'details') setStep('schedule');
        if (step === 'confirm') setStep('details');
    };


    return (
        <div className="bg-gray-900 min-h-screen text-gray-100 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
                <CarIcon className="w-16 h-16 text-primary mx-auto" />
                <h1 className="text-4xl font-extrabold text-white mt-2">Book Your Appointment</h1>
                <p className="text-gray-400">Fast, easy, and convenient online booking.</p>
            </div>
            
            <div className="w-full max-w-3xl bg-gray-800 rounded-xl shadow-2xl">
                <div className="p-6 md:p-8 min-h-[400px]">
                    {renderStep()}
                </div>

                {step !== 'complete' && (
                    <div className="bg-gray-800 border-t border-gray-700 p-4 flex justify-between items-center rounded-b-xl">
                        <div>
                            {step !== 'services' && <button onClick={prevStep} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">Back</button>}
                        </div>
                        <div className="text-right">
                           <p className="text-sm text-gray-400">Total: <span className="font-bold text-lg text-primary">${totalPrice.toFixed(2)}</span></p>
                        </div>
                        <div>
                             {step === 'confirm' ? (
                                <button onClick={handleSubmitBooking} disabled={isBooking} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:bg-gray-500">{isBooking ? 'Booking...' : 'Confirm Booking'}</button>
                            ) : (
                                <button onClick={nextStep} disabled={isNextDisabled()} className="px-6 py-2 bg-primary hover:opacity-90 rounded-lg transition-colors disabled:bg-gray-500">Next</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingPage;