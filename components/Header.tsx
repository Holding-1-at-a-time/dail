import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { UserButton } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { BellIcon } from './icons';

const NotificationCenter = () => {
    const notifications = useQuery(api.notifications.getUnread) || [];
    const markAsRead = useMutation(api.notifications.markAsRead);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllAsRead = () => {
        if (notifications.length > 0) {
            markAsRead({ ids: notifications.map(n => n._id) });
        }
        setIsOpen(false);
    }
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700">
                <BellIcon className="w-6 h-6" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-gray-800"></span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-3 flex justify-between items-center border-b border-gray-700">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {notifications.length > 0 && (
                             <button onClick={handleMarkAllAsRead} className="text-xs text-blue-400 hover:underline">Mark all as read</button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n._id} className="p-3 border-b border-gray-700/50 hover:bg-gray-700">
                                    <p className="font-semibold text-sm text-white">{n.title}</p>
                                    <p className="text-xs text-gray-300 mt-1">{n.message}</p>
                                    <p className="text-xs text-gray-500 mt-2">{new Date(n.timestamp).toLocaleString()}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-8">No new notifications</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


interface HeaderProps {
    currentUser: User | null;
}

const Header: React.FC<HeaderProps> = ({ currentUser }) => {
    if (!currentUser) {
        return <header className="bg-gray-800 h-16 flex items-center justify-end px-8"></header>;
    }

    return (
        <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6 flex-shrink-0">
             <div>
                {/* Future space for breadcrumbs or page titles */}
            </div>
            <div className="flex items-center space-x-4">
                {currentUser.role === 'admin' && <NotificationCenter />}
                <div className="text-right">
                    <span className="text-white font-semibold text-sm">{currentUser.name}</span>
                    <span className="text-xs text-gray-400 block capitalize">{currentUser.role}</span>
                </div>
                <UserButton afterSignOutUrl="/" />
            </div>
        </header>
    );
};

export default Header;