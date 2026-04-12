-- 1. Create Plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL,
    mercadopago_plan_id text,
    trial_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserindo o plano inicial
INSERT INTO public.plans (name, price, trial_days) 
VALUES ('Premium', 14.99, 30);

-- 2. Add columns to existing perfis table
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Premium',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS mercadopago_subscription_id text,
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp with time zone;

-- 3. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    mercadopago_id text UNIQUE NOT NULL,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Payment Logs table (for idempotency and tracing)
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    event_id text UNIQUE NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Trigger to set trial and email on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, slug, nome_exibicao, email, trial_end, subscription_status)
  VALUES (
    new.id,
    'studio-' || substring(new.id::text from 1 for 5),
    'Meu Novo Studio',
    new.email,
    now() + interval '30 days',
    'trial'
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    trial_end = EXCLUDED.trial_end,
    subscription_status = EXCLUDED.subscription_status
  WHERE EXCLUDED.trial_end IS NOT NULL AND public.perfis.trial_end IS NULL;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Disable RLS temporarily or add policies for these tables (so backend can use service_role)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Allow reading plans for everyone
CREATE POLICY "Allow public read on plans" ON public.plans FOR SELECT USING (true);

-- Allow reading your own subscription
CREATE POLICY "Allow individual read on subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Define admin for droidmarx@gmail.com
UPDATE public.perfis SET role = 'admin' WHERE email = 'droidmarx@gmail.com';
