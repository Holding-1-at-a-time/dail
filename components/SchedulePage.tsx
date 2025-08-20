

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Appointment, User } from '../types';
import AppointmentFormModal from './AppointmentFormModal';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useToasts } from './ToastProvider';

interface SchedulePageProps {
    currentUser: User | null;
    onViewJob: (jobId: string) => void;
}

const SchedulePage: React.FC<SchedulePageProps> = ({ currentUser, onViewJob }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
    const [defaultStartTimeForModal, setDefaultStartTimeForModal] = useState<number | null>(null);

    const scheduleData = useQuery(api.appointments.getScheduleData);
    const rescheduleAppointment = useMutation(api.appointments.reschedule);
    const { addToast } = useToasts();

    const events = useMemo(() => {
        if (!scheduleData) return [];
        const { appointmentsForCurrentUser, jobsForCurrentUser, customers, vehicles } = scheduleData;

        return appointmentsForCurrentUser.map(appt => {
            const job = jobsForCurrentUser.find(j => j._id === appt.jobId);
            const customer = customers.find(c => c?._id === job?.customerId);
            const vehicle = vehicles.find(v => v?._id === job?.vehicleId);
            const title = customer ? `${customer.name} - ${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'}` : 'Appointment';
            
            return {
                id: appt._id,
                title,
                start: new Date(appt.startTime),
                end: new Date(appt.endTime),
                extendedProps: {
                    jobId: appt.jobId,
                },
                backgroundColor: 'var(--primary-color)',
                borderColor: 'var(--primary-color)',
            };
        });
    }, [scheduleData]);

    const handleDateClick = (arg: { date: Date, allDay: boolean }) => {
        setDefaultStartTimeForModal(arg.date.getTime());
        setAppointmentToEdit(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo: any) => {
        onViewJob(clickInfo.event.extendedProps.jobId);
    };
    
    const handleEventDrop = async (dropInfo: any) => {
        try {
            await rescheduleAppointment({
                id: dropInfo.event.id as Id<'appointments'>,
                startTime: dropInfo.event.start!.getTime(),
                endTime: dropInfo.event.end!.getTime(),
            });
            addToast('Appointment rescheduled successfully!', 'success');
        } catch (error) {
            console.error('Failed to reschedule:', error);
            addToast('Failed to reschedule appointment.', 'error');
            dropInfo.revert();
        }
    };
    
    if (!scheduleData) {
        return <div className="p-8 text-center">Loading schedule...</div>;
    }

    return (
        <>
            <div className="container mx-auto p-4 md:p-8 h-full flex flex-col">
                <header className="flex-shrink-0 mb-6">
                    <h1 className="text-3xl font-bold text-white">Schedule</h1>
                </header>
                <div className="flex-grow">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        initialView="timeGridWeek"
                        editable={true}
                        selectable={true}
                        selectMirror={true}
                        dayMaxEvents={true}
                        weekends={true}
                        events={events}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDrop}
                        height="100%"
                        contentHeight="auto"
                        slotMinTime="07:00:00"
                        slotMaxTime="20:00:00"
                    />
                </div>
            </div>
            <AppointmentFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                appointmentToEdit={appointmentToEdit} 
                jobToScheduleId={null}
                defaultStartTime={defaultStartTimeForModal}
            />
             <style>{`
                .fc { 
                    color: var(--fc-neutral-text-color, #E0E0E0);
                }
                .fc .fc-toolbar-title {
                    color: #F5F5F5;
                }
                .fc .fc-button-primary {
                    background-color: #3E3E3E;
                    border-color: #5A5A5A;
                }
                .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
                    background-color: var(--primary-color);
                    border-color: var(--primary-color);
                }
                .fc-daygrid-dot-event .fc-event-title {
                    color: white;
                }
                .fc-day-today {
                     background-color: rgba(0, 174, 152, 0.1) !important;
                }
                .fc-timegrid-slot-label, .fc-daygrid-day-number {
                    color: #9E9E9E;
                }
                .fc-col-header-cell-cushion {
                     color: #CCCCCC;
                }
                .fc-border {
                    border-color: #3E3E3E;
                }
                .fc-timegrid-slot-lane {
                     border-color: #3E3E3E;
                }
                 .fc-timegrid-event-harness > .fc-timegrid-event {
                    box-shadow: none;
                }
            `}</style>
        </>
    );
};

export default SchedulePage;
