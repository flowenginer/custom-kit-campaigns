-- Add quantity column to design_task_layouts table
ALTER TABLE design_task_layouts 
ADD COLUMN quantity INTEGER DEFAULT NULL;