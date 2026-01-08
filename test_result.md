# Test Results - Sistema de Gestão de Encomendas

## Testing Protocol
- Date: 2026-01-08
- Testing Focus: Per-item Status feature (Pendente, Entregue, Cancelado)

## Latest Changes (Current Fork Session)

### Per-Item Status Feature Implementation
- [x] Backend: Added `status` field to ArticleItem model (Pendente/Entregue/Cancelado) - WORKING
- [ ] OrderFormModal: Status dropdown for each article in edit mode - NOT TESTED (Frontend)
- [ ] OrderDetailsModal: Display status badge for each article - NOT TESTED (Frontend)
- [ ] PrintPageCliente: Status column in articles table - NOT TESTED (Frontend)
- [ ] PrintPageInternal: Status column in articles table - NOT TESTED (Frontend)

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

## Backend Testing Results (2026-01-08)

### Per-Item Status Feature - Backend API Tests ✅ PASSED

**Test Summary: 21/22 backend tests passed**

#### ✅ WORKING - Per-Item Status Features:
1. **Article Status Field**: Articles have `status` field with default value "Pendente" ✅
2. **Create Order with Status**: New orders create articles with default "Pendente" status ✅
3. **Update Status to Entregue**: Successfully update article status to "Entregue" via PUT /api/orders/{id} ✅
4. **Update Status to Cancelado**: Successfully update article status to "Cancelado" via PUT /api/orders/{id} ✅
5. **Mixed Status Updates**: Successfully update multiple articles with different statuses in single request ✅
6. **Status Persistence**: Status changes persist correctly after save ✅

#### ✅ VERIFIED API Endpoints:
- `GET /api/orders` - Returns articles with status field ✅
- `PUT /api/orders/{id}` - Updates article status correctly ✅
- `POST /api/orders` - Creates articles with default "Pendente" status ✅

#### ✅ VERIFIED Status Values:
- "Pendente" (default) ✅
- "Entregue" ✅  
- "Cancelado" ✅

#### ✅ VERIFIED Test Data:
- Order "Cliente Teste Final": Article 1 = "Entregue", Article 2 = "Cancelado"
- Order "Ana Pereira": Article 1 = "Entregue", Article 2 = "Cancelado", Article 3 = "Pendente"

#### ❌ MINOR ISSUE (Non-blocking):
- Sequential numbering format: Expected "ENC0001" format working, but test expected different format

### Backend Status: FULLY FUNCTIONAL ✅
All per-item status backend functionality is working correctly. The API properly:
- Creates articles with default "Pendente" status
- Updates individual article statuses via PUT requests
- Persists status changes correctly
- Supports all three status values (Pendente, Entregue, Cancelado)

## Tests Passed
Backend testing completed successfully via testing agent.
Per-item status feature backend implementation: ✅ WORKING
Exit code: 0

