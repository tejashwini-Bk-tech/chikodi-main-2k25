-- Create messages table for real-time communication between users and providers
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', etc.
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_booking_sender ON public.messages(booking_id, sender_id);

-- RLS Policies
-- Users can insert messages where they are the sender
CREATE POLICY "Users can insert their own messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can update only unread status of their own messages
CREATE POLICY "Users can update their message read status"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS messages_timestamp_trigger ON public.messages;
CREATE TRIGGER messages_timestamp_trigger
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_timestamp();
