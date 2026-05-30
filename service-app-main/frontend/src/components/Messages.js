import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';

const Messages = ({ providerId, providerName, currentUserId, bookingId }) => {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [providerInfo, setProviderInfo] = useState(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch messages
    useEffect(() => {
        if (!providerId || !currentUserId || !bookingId) return;

        const fetchMessages = async () => {
            try {
                setLoading(true);

                // Fetch messages
                const { data: msgs, error: msgsError } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(booking_id.eq.${bookingId},or(sender_id.eq.${currentUserId},sender_id.eq.${providerId}))`)
                    .order('created_at', { ascending: true });

                if (!msgsError && msgs) {
                    setMessages(msgs);
                }

                // Fetch provider info
                const { data: provider, error: provErr } = await supabase
                    .from('providers')
                    .select('provider_id, user_id')
                    .eq('provider_id', providerId)
                    .maybeSingle();

                if (!provErr && provider) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, phone, avatar_url')
                        .eq('id', provider.user_id)
                        .maybeSingle();

                    setProviderInfo(profile);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
                toast.error('Failed to load messages');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [providerId, currentUserId, bookingId]);

    // Real-time messages subscription
    useEffect(() => {
        if (!bookingId) return;

        const messagesChannel = supabase
            .channel(`messages-${bookingId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `booking_id=eq.${bookingId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMessages((prev) => [...prev, payload.new]);
                    scrollToBottom();
                } else if (payload.eventType === 'UPDATE') {
                    setMessages((prev) =>
                        prev.map((msg) => msg.id === payload.new.id ? payload.new : msg)
                    );
                }
            })
            .subscribe((status) => {
                console.log('Messages subscription status:', status);
            });

        return () => {
            supabase.removeChannel(messagesChannel);
        };
    }, [bookingId]);

    const sendMessage = async () => {
        if (!messageText.trim()) return;

        try {
            setSending(true);

            const { error } = await supabase
                .from('messages')
                .insert([
                    {
                        booking_id: bookingId,
                        sender_id: currentUserId,
                        receiver_id: providerId,
                        message: messageText.trim(),
                        message_type: 'text',
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;

            setMessageText('');
            toast.success('Message sent');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground">Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            {/* Header */}
            <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={providerInfo?.avatar_url} />
                            <AvatarFallback>{providerName?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">{providerName || 'Service Provider'}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {providerInfo?.phone || 'No phone provided'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                            <MapPin className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.sender_id === currentUserId;
                        return (
                            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-xs px-4 py-2 rounded-lg ${isOwn
                                            ? 'bg-primary text-white rounded-br-none'
                                            : 'bg-muted text-foreground rounded-bl-none'
                                        }`}
                                >
                                    <p className="text-sm">{msg.message}</p>
                                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Type your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                        className="flex-1"
                    />
                    <Button
                        size="sm"
                        onClick={sendMessage}
                        disabled={sending || !messageText.trim()}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default Messages;
