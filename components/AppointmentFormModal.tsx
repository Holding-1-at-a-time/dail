import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Appointment, Job } from '../types';
import Modal from './Modal';
import { SparklesIcon } from './icons';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentToEdit: Appointment | null;
  jobToScheduleId: Id<'jobs'> | null;
}

const toDateTimeLocal = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
};

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose, appointmentToEdit, jobToScheduleId }) => {
  const [jobId, setJobId] = useState<Id<'jobs'> | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('scheduled');
  
  const [suggestedSlots, setSuggestedSlots] = useState<{startTime: string, endTime: string}[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const data = useQuery(api.appointments.getDataForForm);
  const saveAppointment = useMutation(api.appointments.save);
  const suggestSlotsAction = useAction(api.ai.suggestAppointmentSlots);

  const allJobs = data?.jobs ?? [];
  
  useEffect(() => {
    if (isOpen) {
        if (appointmentToEdit) {
            setJobId(appointmentToEdit.jobId);
            setStartTime(toDateTimeLocal(new Date(appointmentToEdit.startTime)));
            setEndTime(toDateTimeLocal(new Date(appointmentToEdit.endTime)));
            setDescription(appointmentToEdit.description || '');
            setStatus(appointmentToEdit.status);
        } else {
            const now = new Date();
            now.setSeconds(0, 0);
            setJobId(jobToScheduleId || '');
            setStartTime(toDateTimeLocal(now));
            setEndTime(toDateTimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000)));
            setDescription(''); setStatus('scheduled');
        }
        setSuggestedSlots([]); setIsSuggesting(false);
    }
  }, [appointmentToEdit, jobToScheduleId, isOpen]);

  const handleSuggestSlots = async () => {
    if (!jobId) return alert("Please select a job first.");
    setIsSuggesting(true); setSuggestedSlots([]);
    try {
        const slots = await suggestSlotsAction({ jobId });
        setSuggestedSlots(slots || []);
    } catch (error: any) {
        console.error("Error suggesting slots:", error);
         if (error?.data?.kind === 'RateLimitError') {
            alert("You've made too many AI requests. Please wait a moment before trying again.");
        } else {
            alert("Failed to suggest time slots.");
        }
    } finally {
        setIsSuggesting(false);
    }
  };

  const applySuggestion = (slot: {startTime: string, endTime: string}) => {
    setStartTime(toDateTimeLocal(new Date(slot.startTime)));
    setEndTime(toDateTimeLocal(new Date(slot.endTime)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !startTime || !endTime) return alert("Please fill out all required fields.");
    const startTimestamp = new Date(startTime).getTime();
    const endTimestamp = new Date(endTime).getTime();
    if (startTimestamp >= endTimestamp) return alert("End time must be after start time.");
    
    await saveAppointment({
        id: appointmentToEdit?._id,
        jobId, startTime: startTimestamp, endTime: endTimestamp, description, status,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={appointmentToEdit ? 'Edit Appointment' : 'Schedule Job'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label htmlFor="jobId" className="block text-sm font-medium text-gray-300">Job</label><select id="jobId" value={jobId} onChange={e => setJobId(e.target.value as Id<'jobs'>)} required disabled={!!jobToScheduleId || !!appointmentToEdit} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white disabled:bg-gray-800"><option value="" disabled>Select a job...</option>{allJobs.map(job => (<option key={job._id} value={job._id}>Job #{job._id.substring(0, 6)} ({job.customerName})</option>))}</select></div>
        
        {!appointmentToEdit && (
            <div className="pt-4 border-t border-gray-700">
                <button type="button" onClick={handleSuggestSlots} disabled={isSuggesting || !jobId} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:bg-gray-500"><SparklesIcon className="w-5 h-5 mr-2" />{isSuggesting ? 'Finding Slots...' : 'AI Assist: Suggest Times'}</button>
                {suggestedSlots.length > 0 && (<div className="mt-4 space-y-2"><p className="text-xs text-center text-gray-400">Click to apply:</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{suggestedSlots.map((slot, index) => (<button key={index} type="button" onClick={() => applySuggestion(slot)} className="text-center text-sm bg-gray-700 hover:bg-gray-600 rounded-md p-2"><p>{new Date(slot.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p><p className="font-semibold">{new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></button>))}</div></div>)}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label htmlFor="startTime" className="block text-sm font-medium text-gray-300">Start Time</label><input type="datetime-local" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} required className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
             <div><label htmlFor="endTime" className="block text-sm font-medium text-gray-300">End Time</label><input type="datetime-local" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} required className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
        </div>
        <div><label htmlFor="description" className="block text-sm font-medium text-gray-300">Notes</label><textarea name="description" id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"></textarea></div>
        <div><label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label><select id="status" value={status} onChange={e => setStatus(e.target.value as Appointment['status'])} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"><option value="scheduled">Scheduled</option><option value="inProgress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Appointment</button>
        </div>
      </form>
    </Modal>
  );
};

export default AppointmentFormModal;