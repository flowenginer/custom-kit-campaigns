-- Adicionar Foreign Key para assigned_to -> profiles
ALTER TABLE public.design_tasks
ADD CONSTRAINT design_tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES public.profiles(id)
ON DELETE SET NULL;