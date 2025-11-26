-- Remover foreign keys antigas que apontam para auth.users
ALTER TABLE public.pending_urgent_requests 
  DROP CONSTRAINT IF EXISTS pending_urgent_requests_requested_by_fkey;

ALTER TABLE public.pending_urgent_requests 
  DROP CONSTRAINT IF EXISTS pending_urgent_requests_reviewed_by_fkey;

-- Adicionar novas foreign keys apontando para profiles
ALTER TABLE public.pending_urgent_requests 
  ADD CONSTRAINT pending_urgent_requests_requested_by_fkey 
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pending_urgent_requests 
  ADD CONSTRAINT pending_urgent_requests_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;