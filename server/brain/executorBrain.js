export async function executeBrainPlan({ plan, safety }) {
  // Primeira versão: execução supervisionada. Não roda terminal sozinho.
  return plan.map(step => ({
    stepId: step.id,
    title: step.title,
    status: step.status === 'done' ? 'done' : (safety.allowedToExecute ? 'ready' : 'waiting_approval'),
    note: safety.allowedToExecute ? 'Pronto para execução automática futura.' : 'Planejado. A execução real fica supervisionada.'
  }));
}
