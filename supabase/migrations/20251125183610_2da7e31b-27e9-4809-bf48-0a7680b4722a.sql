-- Criar o trigger para copiar workflow_config automaticamente
CREATE TRIGGER trigger_copy_workflow_config
  BEFORE INSERT OR UPDATE OF workflow_template_id ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION copy_workflow_config_to_campaign();

-- Sincronizar campanhas existentes com seus respectivos templates
UPDATE campaigns c
SET workflow_config = wt.workflow_config
FROM workflow_templates wt
WHERE c.workflow_template_id = wt.id
  AND c.workflow_config IS DISTINCT FROM wt.workflow_config;