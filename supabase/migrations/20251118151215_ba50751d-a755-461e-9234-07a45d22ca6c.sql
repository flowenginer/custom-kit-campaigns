-- FASE 1.1: Adicionar role 'salesperson' ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'salesperson';