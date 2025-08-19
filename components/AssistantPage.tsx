import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SparklesIcon, UserCircleIcon } from './icons';
import { useRateLimit } from '@convex-dev/rate-limiter/react';

const AssistantPage = () => {
    const [threadId, setThreadId] = useState<string | null>(null);
    const messages = useQuery(api.chat.getMessages, threadId ? { threadId } : "skip");
    const sendMessage = useAction(api.chat.sendMessage);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [rateLimitError, setRateLimitError] = useState('');

    const { status: rateLimitStatus } = useRateLimit(api.rateLimiter.getRateLimit, {
        getServerTimeMutation: api.rateLimiter.getServerTime,
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !rateLimitStatus.ok) return;
        
        const messageToSend = input;
        setInput('');
        setIsLoading(true);
        setRateLimitError('');

        try {
            const newThreadId = await sendMessage({ message: messageToSend, threadId });
            if (!threadId) {
                setThreadId(newThreadId);
            }
        } catch (error: any) {
            console.error("Failed to send message:", error);
            if (error?.data?.kind === 'RateLimitError') {
                setRateLimitError("You're sending messages too fast. Please wait a moment.");
            } else {
                // Handle other errors if necessary
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const examplePrompts = [
        "What's on the schedule for tomorrow?",
        "How many microfiber towels are left?",
        "What is John Doe's phone number?",
        "Book a Basic Wash for Jane Smith's Ford F-150 for next Tuesday morning.",
    ];

    const isRateLimited = !rateLimitStatus.ok;
    const secondsRemaining = isRateLimited ? Math.ceil((rateLimitStatus.retryAt - Date.now()) / 1000) : 0;

    return (
        <div className="flex flex-col h-full container mx-auto p-4 md:p-8">
            <header className="mb-6 text-center">
                 <SparklesIcon className="w-16 h-16 mx-auto text-primary mb-4" />
                <h1 className="text-4xl font-bold text-white">AI Assistant</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Your conversational command center. Ask questions, schedule jobs, and manage your business using natural language.</p>
            </header>
            
            <div className="flex-grow bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div ref={messagesEndRef} className="flex-grow p-4 md:p-6 space-y-4 overflow-y-auto">
                    {messages && messages.length > 0 ? (
                        messages.map((msg, index) => (
                             <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && <div className="w-8 h-8 flex-shrink-0 bg-primary rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                                <div className={`max-w-xl px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 flex-shrink-0 bg-gray-600 rounded-full flex items-center justify-center"><UserCircleIcon className="w-5 h-5 text-white" /></div>}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-500 pt-8">
                            <p className="mb-6">No messages yet. Try one of these examples:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                                {examplePrompts.map(prompt => (
                                    <button key={prompt} onClick={() => setInput(prompt)} className="text-sm text-left bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg transition-colors">
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex items-start gap-3 justify-start">
                            <div className="w-8 h-8 flex-shrink-0 bg-primary rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5 text-white" /></div>
                            <div className="max-w-xl px-4 py-3 rounded-2xl bg-gray-700 text-gray-400 italic rounded-bl-none animate-pulse">
                                Assistant is thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <form onSubmit={handleSend} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask your assistant anything..."
                            className="w-full bg-gray-700 border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            disabled={isLoading || isRateLimited}
                        />
                        <button type="submit" disabled={isLoading || !input.trim() || isRateLimited} className="bg-primary hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            Send
                        </button>
                    </form>
                     {(rateLimitError || isRateLimited) && (
                        <p className="text-xs text-center text-yellow-400 mt-2">
                            {rateLimitError || `You're sending messages too fast. Please wait ${secondsRemaining}s.`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssistantPage;