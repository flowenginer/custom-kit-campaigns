-- Limpar dados de teste gerados pelo seed-test-data
-- Identificados pelo padrão de email nome.sobrenome@dominio
-- Ordem corrigida respeitando foreign keys

-- 1. Deletar histórico das tasks de teste
DELETE FROM design_task_history 
WHERE task_id IN (
  SELECT dt.id FROM design_tasks dt
  JOIN orders o ON dt.order_id = o.id
  WHERE o.session_id IN (
    SELECT session_id FROM leads 
    WHERE email LIKE '%.%@gmail.com' 
       OR email LIKE '%.%@hotmail.com' 
       OR email LIKE '%.%@outlook.com' 
       OR email LIKE '%.%@yahoo.com.br'
  )
);

-- 2. Deletar eventos de funil de teste
DELETE FROM funnel_events 
WHERE session_id IN (
  SELECT session_id FROM leads 
  WHERE email LIKE '%.%@gmail.com' 
     OR email LIKE '%.%@hotmail.com' 
     OR email LIKE '%.%@outlook.com' 
     OR email LIKE '%.%@yahoo.com.br'
);

-- 3. Deletar design_tasks de teste
DELETE FROM design_tasks 
WHERE order_id IN (
  SELECT o.id FROM orders o
  WHERE o.session_id IN (
    SELECT session_id FROM leads 
    WHERE email LIKE '%.%@gmail.com' 
       OR email LIKE '%.%@hotmail.com' 
       OR email LIKE '%.%@outlook.com' 
       OR email LIKE '%.%@yahoo.com.br'
  )
);

-- 4. Deletar leads de teste (antes dos orders porque leads.order_id referencia orders)
DELETE FROM leads 
WHERE email LIKE '%.%@gmail.com' 
   OR email LIKE '%.%@hotmail.com' 
   OR email LIKE '%.%@outlook.com' 
   OR email LIKE '%.%@yahoo.com.br';

-- 5. Deletar orders de teste
DELETE FROM orders 
WHERE session_id IN (
  SELECT session_id FROM (
    VALUES 
      ('%.%@gmail.com'),
      ('%.%@hotmail.com'),
      ('%.%@outlook.com'),
      ('%.%@yahoo.com.br')
  ) AS patterns(pattern)
  WHERE session_id NOT IN (SELECT session_id FROM leads)
)
OR session_id LIKE 'test-%';