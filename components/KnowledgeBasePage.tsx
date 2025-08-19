import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { BookOpenIcon, CloudArrowUpIcon, SparklesIcon } from './icons';

const KnowledgeBasePage = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<{ answer: string; context: any } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const askQuestion = useAction(api.rag.askQuestion);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setUploadMessage('');
        try {
            const response = await fetch('/uploadKnowledgeFile', {
                method: 'POST',
                headers: { 'Content-Type': file.type, 'X-Filename': file.name },
                body: file,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }
            setUploadMessage(`Successfully uploaded ${file.name}. It is now being processed and will be available for questions shortly.`);
            setFile(null);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadMessage(`Error uploading file. Check console for details.`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAskQuestion = async () => {
        if (!question.trim()) return;
        setIsLoading(true);
        setAnswer(null);
        try {
            const result = await askQuestion({ prompt: question });
            setAnswer(result);
        } catch (error: any) {
            console.error('Error asking question:', error);
            if (error?.data?.kind === 'RateLimitError') {
                 setAnswer({ answer: "You've asked too many questions. Please wait a moment before trying again.", context: null });
            } else {
                setAnswer({ answer: "Sorry, I encountered an error. The AI model may be unavailable or the query could not be processed. Please check the console for details.", context: null });
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-12 text-center">
                <BookOpenIcon className="w-16 h-16 mx-auto text-primary mb-4" />
                <h1 className="text-4xl font-bold text-white">AI-Powered Knowledge Base</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Upload documents and ask questions to get instant, context-aware answers from your business data.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                     <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                         <h2 className="text-xl font-bold text-white mb-4">Add to Knowledge Base</h2>
                         <div className="space-y-4">
                             <p className="text-sm text-gray-400">Upload text files (.txt, .md) containing service procedures, company policies, or any other information you want to search.</p>
                             <div>
                                 <label htmlFor="file-upload" className="w-full cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-center block transition-colors">
                                     {file ? `Selected: ${file.name}` : "Choose a file..."}
                                 </label>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.text" />
                             </div>
                             <button
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                                {isUploading ? "Uploading..." : "Upload & Process"}
                             </button>
                             {uploadMessage && <p className="text-xs text-center text-green-400 mt-2">{uploadMessage}</p>}
                         </div>
                     </div>
                </div>

                <div className="lg:col-span-3">
                     <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Ask a Question</h2>
                        <div className="flex space-x-2">
                             <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleAskQuestion()}
                                placeholder="e.g., What are the steps for a basic wash?"
                                className="flex-grow bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:ring-primary focus:border-primary"
                             />
                             <button
                                onClick={handleAskQuestion}
                                disabled={isLoading || !question.trim()}
                                className="flex-shrink-0 flex items-center bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500"
                            >
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                {isLoading ? "Thinking..." : "Ask AI"}
                             </button>
                        </div>
                        
                        <div className="mt-6 min-h-[200px]">
                            {isLoading && <p className="text-center text-gray-400">Searching knowledge base and generating answer...</p>}
                            {answer && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="bg-gray-900/50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-lg text-primary mb-2">Answer:</h3>
                                        <p className="text-gray-200 whitespace-pre-wrap">{answer.answer}</p>
                                    </div>
                                    {answer.context?.entries && answer.context.entries.length > 0 && (
                                         <div className="p-4 rounded-lg bg-gray-700/50">
                                            <h4 className="font-semibold text-sm text-gray-300 mb-2">Sources:</h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                {answer.context.entries.map((entry: any) => (
                                                    <div key={entry.entryId} className="text-xs p-2 bg-gray-800 rounded">
                                                         <p className="font-bold text-gray-400 truncate">{entry.title || 'Untitled Document'}</p>
                                                         <p className="text-gray-500 mt-1 italic line-clamp-2">"...{entry.text}..."</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default KnowledgeBasePage;