# Test Results - Sistema de Gestão de Encomendas

## Testing Protocol
- Date: 2026-01-08
- Testing Focus: Per-item Status feature (Pendente, Entregue, Cancelado)

## Latest Changes (Current Fork Session)

### Per-Item Status Feature Implementation
- [ ] Backend: Added `status` field to ArticleItem model (Pendente/Entregue/Cancelado)
- [ ] OrderFormModal: Status dropdown for each article in edit mode
- [ ] OrderDetailsModal: Display status badge for each article
- [ ] PrintPageCliente: Status column in articles table
- [ ] PrintPageInternal: Status column in articles table

### Files Modified
- `/app/backend/server.py` - ArticleItem model updated
- `/app/frontend/src/components/OrderFormModal.js` - Status dropdown in edit mode
- `/app/frontend/src/components/OrderDetailsModal.js` - Status badges display
- `/app/frontend/src/pages/PrintPageCliente.js` - Status column added
- `/app/frontend/src/pages/PrintPageInternal.js` - Status column added

## Test Cases
1. Create new order - verify default status is "Pendente"
2. Edit order - change item status to "Entregue" and save
3. Edit order - change item status to "Cancelado" and save
4. View order details - verify status badges displayed
5. Print page - verify status column shows correctly

## Incorporate User Feedback
- User requested per-item status tracking
- Status options: Pendente (default), Entregue, Cancelado
- Visual indicators: Yellow for Pendente, Green for Entregue, Red for Cancelado

## Previous Completed Features

### Dashboard
- [x] Título "Encomendas e Orçamentos"
- [x] Número + Nome do cliente no título dos cards
- [x] Colaborador aparece antes do contacto
- [x] "Criada:" removido (não duplicado)
- [x] "Falta Pagar" exibido quando há adiantamento
- [x] Botão Eliminar removido (funcionalidade removida)
- [x] Botão Editar desativado para estados finais

### Formulário de Criação
- [x] Campo "Adiantamento (€)" disponível
- [x] Cálculo "Falta Pagar" em tempo real
- [x] Dropdown de colaboradores funcional
- [x] "Nova Encomenda" / "Novo Orçamento" no menu

### Modal de Sucesso
- [x] Após criação: mostra botões de impressão
- [x] Após edição: NÃO mostra botões de impressão (apenas "Fechar")

### Páginas de Impressão
- [x] Botões "Imprimir" e "Download PDF"
- [x] Número como sub-título
- [x] Adiantamento Pago e "FALTA PAGAR" exibidos
- [x] Versão Cliente: simplificada
- [x] Versão Interna: completa com colaborador, status, separado

### Backend
- [x] Campo adiantamento no modelo
- [x] Numeração sequencial ENC/ORC + 4 dígitos
- [x] Índice único no numero_encomenda

## Tests Passed
Pending testing via testing agent.
Exit code: 0

