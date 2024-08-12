'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { queryFlowise } from '../lib/actions/flowise';
import socketIOClient from 'socket.io-client';
import { CornerDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { useSession } from 'next-auth/react';
import { exampleMessages } from '@/lib/data/example-messages';
import { CustomSession } from '@/app/api/auth/[...nextauth]/option';

export default function Home() {
	const [messages, setMessages] = useState<
		{ role: 'userMessage' | 'apiMessage'; content: string }[]
	>([]);
	const [input, setInput] = useState('');
	const [socketIOClientId, setSocketIOClientId] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const { data: session, status } = useSession() as {
		data: CustomSession | null;
		status: 'loading' | 'authenticated' | 'unauthenticated';
	};
	const [sessionId, setSessionId] = useState<string | null>(null);

	useEffect(() => {
		if (!session) return;
		const socket = socketIOClient(
			process.env.NEXT_PUBLIC_FLOWISE_BASE_URL ?? 'http://localhost:3000'
		);

		const socketEvents = {
			connect: async () => {
				console.log('Connected with ID:', socket.id);
				setSocketIOClientId(socket.id ?? '');
			},
			start: () => {
				console.log('LLM started streaming');
				setMessages(prevMessages => [
					...prevMessages,
					{ role: 'apiMessage', content: '' },
				]);
			},
			token: (token: string) => {
				setMessages(prevMessages => {
					const updatedMessages = [...prevMessages];
					const lastMessage = updatedMessages[updatedMessages.length - 1];
					if (lastMessage?.role === 'apiMessage') {
						return [
							...updatedMessages.slice(0, -1),
							{ ...lastMessage, content: lastMessage.content + token },
						];
					}
					return updatedMessages;
				});
			},
			end: () => console.log('LLM finished streaming'),
			abort: () => console.log('Execution aborted'),
			connection_error: (error: Error) =>
				console.error('Connection error:', error),
			reconnect_attempt: (attemptNumber: number) =>
				console.log(`Reconnect attempt: ${attemptNumber}`),
			reconnect_failed: () => console.error('Reconnect failed'),
		};

		Object.entries(socketEvents).forEach(([event, handler]) => {
			socket.on(event, handler);
		});

		return () => {
			if (session && socket.connected) {
				console.log('Disconnecting socket');
				socket.disconnect();
			}
		};
	}, [session]);

	const resizeTextarea = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	};

	useEffect(() => {
		resizeTextarea();
	}, [input]);

	const scrollToBottom = useCallback(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	useEffect(() => {
		const init = async () => {
			if (!sessionId && !!session?.userId) {
				const sid = await queryFlowise({
					question: `My user ID is the number: ${session?.userId}; Strictly respond with: Hi, I'm Ginder, How can I help you today!`,
					socketIOClientId,
				});
				setSessionId(sid);
				console.log(`session id set to: ${sid}`);
			}
		};
		init();
	}, [session, socketIOClientId, sessionId]);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		resizeTextarea();
	};

	const sendMessage = useCallback(
		async (message?: string) => {
			if ((!input.trim() && !message) || isLoading || !session) return;

			const newMessage = message || input;
			setMessages(prev => [
				...prev,
				{ role: 'userMessage', content: newMessage },
			]);
			setInput('');
			setIsLoading(true);

			console.log(`sending new message with session id: ${sessionId}`);

			try {
				await queryFlowise({
					question: newMessage,
					socketIOClientId,
					overrideConfig: {
						sessionId,
					},
				});
			} catch (error) {
				console.error('Error:', error);
				setMessages(prev => [
					...prev,
					{
						role: 'apiMessage',
						content:
							'Oops! Something went wrong. Please try again or ask a different question.',
					},
				]);
			} finally {
				setIsLoading(false);
			}
		},
		[
			input,
			isLoading,
			session,
			socketIOClientId,
			sessionId,
			setMessages,
			setInput,
			setIsLoading,
		]
	);

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	if (status === 'loading') {
		return (
			<div className="flex items-center justify-center h-screen">
				<div>Loading...</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
			<ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
				<div className="max-w-2xl mx-auto">
					{messages.length === 0 ? (
						<>
							<Card className="p-6">
								<CardHeader>
									<CardTitle>Welcome to GINDER!</CardTitle>
								</CardHeader>
								<CardContent>
									<p>
										This chatbot is a tool to help you find the perfect open
										source repository to contribute to.
									</p>
									<p>Here are some instructions to get started:</p>
									<ul className="list-disc pl-6 mt-2">
										<li>
											Connect your GitHub account to GINDER in &quot;Data&quot; section
										</li>
										<li>Let the chatbot know your skills and interests</li>
										<li>The chatbot will suggest repositories to you</li>
										<li>
											Add repositories to &quot;Repositories&quot; section to monitor open
											issues
										</li>
									</ul>
								</CardContent>
							</Card>
						</>
					) : (
						<>
							{messages.map((message, index) => (
								<div
									key={index}
									className={`mb-4 flex ${message.role === 'userMessage' ? 'justify-end' : 'justify-start'}`}
								>
									{message.role === 'apiMessage' && (
										<div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
											<span className="text-sm">🤖</span>
										</div>
									)}
									<div
										className={`rounded-lg p-3 max-w-[70%] ${message.role === 'userMessage'
												? 'bg-blue-500 text-white'
												: 'bg-gray-200 text-gray-800'
											}`}
									>

										<ReactMarkdown>{message.content}</ReactMarkdown>
									</div>
									{message.role === 'userMessage' && (
										<div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-2">
											<span className="text-sm text-white">👤</span>
										</div>
									)}
								</div>
							))}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>
			</ScrollArea>

			{/* Example messages */}
			<div className="p-4 bg-white dark:bg-zinc-950">
				<div className="max-w-2xl mx-auto">
					<div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
						{messages.length <= 1 &&
							exampleMessages.map((example, index) => (
								<div
									key={index}
									className={`cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${index > 1 && 'hidden md:block'
									}`}
									onClick={() => {
										sendMessage(example.message);
									}}
								>
									<div className="text-sm font-semibold dark:text-white">
										{example.heading}
									</div>
									<div className="text-sm text-zinc-600 dark:text-white">
										{example.subheading}
									</div>
								</div>
							))}
					</div>
				</div>
			</div>

			{/* Send message area */}
			<div className="p-4 border-t">
				<div className="max-w-2xl mx-auto">
					<form
						onSubmit={e => {
							e.preventDefault();
							sendMessage();
						}}
						className="flex flex-col md:flex-row space-x-2 items-center"
					>
						<Textarea
							ref={textareaRef}
							value={input}
							onChange={handleInput}
							onKeyDown={handleKeyDown}
							placeholder="Send a message."
							className="flex-1 min-h-[50px] p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
						/>
						<Button
							type="submit"
							disabled={isLoading || messages.length === 0}
							className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800"
						>
							<CornerDownLeft size={24} />
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
};