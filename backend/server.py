from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Colaborador(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    ativo: bool = True
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ColaboradorCreate(BaseModel):
    nome: str

class ArticleItem(BaseModel):
    codigo: str
    designacao: str
    quantidade: int
    preco_unitario: float
    preco_total: float
    separado: bool = False

class OrderCreate(BaseModel):
    nome_cliente: str
    contacto: str
    tem_entrega: bool
    morada_entrega: Optional[str] = None
    distancia_kms: Optional[float] = None
    num_colaboradores: Optional[int] = None
    artigos: List[ArticleItem]
    subtotal_artigos: float
    custo_entrega: float
    total_final: float
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    colaborador_id: str
    tipo: str = "encomenda"  # encomenda ou orcamento
    nome_colaborador: Optional[str] = None  # Compatibilidade com versões antigas
    adiantamento: Optional[float] = None  # Valor do adiantamento pago
    pago_totalidade: bool = False  # Se o valor total foi pago

class HistoricoAlteracao(BaseModel):
    data_hora: str
    campo_alterado: str
    valor_anterior: str
    valor_novo: str

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    artigos: Optional[List[ArticleItem]] = None
    pago_totalidade: Optional[bool] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_encomenda: Optional[str] = None
    tipo: str = "encomenda"
    nome_cliente: str
    contacto: str
    tem_entrega: bool
    morada_entrega: Optional[str] = None
    distancia_kms: Optional[float] = None
    num_colaboradores: Optional[int] = None
    artigos: List[ArticleItem]
    subtotal_artigos: float
    custo_entrega: float
    total_final: float
    status: str = "Pendente"
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    data_levantada: Optional[str] = None
    colaborador_id: Optional[str] = None
    nome_colaborador: Optional[str] = None
    adiantamento: Optional[float] = None  # Valor do adiantamento pago
    pago_totalidade: bool = False  # Se o valor total foi pago
    historico: List[dict] = Field(default_factory=list)
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_atualizacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestão de Encomendas API"}

# Colaboradores routes
@api_router.post("/colaboradores", response_model=Colaborador)
async def create_colaborador(colab_data: ColaboradorCreate):
    colab_obj = Colaborador(**colab_data.model_dump())
    doc = colab_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    
    await db.colaboradores.insert_one(doc)
    return colab_obj

@api_router.get("/colaboradores", response_model=List[Colaborador])
async def get_colaboradores():
    colaboradores = await db.colaboradores.find({"ativo": True}, {"_id": 0}).to_list(1000)
    
    for colab in colaboradores:
        if isinstance(colab.get('data_criacao'), str):
            colab['data_criacao'] = datetime.fromisoformat(colab['data_criacao'])
    
    colaboradores.sort(key=lambda x: x.get('nome', ''))
    return colaboradores

@api_router.delete("/colaboradores/{colaborador_id}")
async def delete_colaborador(colaborador_id: str):
    # Marcar como inativo ao invés de deletar
    result = await db.colaboradores.update_one(
        {"id": colaborador_id},
        {"$set": {"ativo": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    
    return {"message": "Colaborador removido com sucesso"}

# Order routes (sem autenticação)
async def get_next_order_number(tipo: str = "encomenda"):
    # Definir prefixo baseado no tipo
    prefix = "ORC" if tipo == "orcamento" else "ENC"
    
    # Buscar o último número do mesmo tipo (ENC ou ORC)
    last_order = await db.orders.find_one(
        {"numero_encomenda": {"$regex": f"^{prefix}"}},
        {"_id": 0, "numero_encomenda": 1},
        sort=[("numero_encomenda", -1)]
    )
    
    if last_order and last_order.get('numero_encomenda'):
        # Extrair número e incrementar
        try:
            last_num = int(last_order['numero_encomenda'].replace(prefix, ""))
            next_num = last_num + 1
        except (ValueError, IndexError, AttributeError):
            next_num = 4000
    else:
        next_num = 4000
    
    return f"{prefix}{next_num}"

@api_router.get("/orders/next-number/{tipo}")
async def get_next_number(tipo: str):
    """Retorna o próximo número sequencial para encomenda ou orçamento"""
    next_number = await get_next_order_number(tipo)
    return {"next_number": next_number}

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    order_dict = order_data.model_dump()
    
    # Gerar número de encomenda baseado no tipo
    order_dict['numero_encomenda'] = await get_next_order_number(order_data.tipo)
    
    # Buscar nome do colaborador
    colaborador = await db.colaboradores.find_one({"id": order_data.colaborador_id})
    if colaborador:
        order_dict['nome_colaborador'] = colaborador['nome']
    
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
    
    await db.orders.insert_one(doc)
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('data_criacao'), str):
            order['data_criacao'] = datetime.fromisoformat(order['data_criacao'])
        if 'data_atualizacao' not in order:
            order['data_atualizacao'] = order.get('data_criacao', datetime.now(timezone.utc))
        elif isinstance(order['data_atualizacao'], str):
            order['data_atualizacao'] = datetime.fromisoformat(order['data_atualizacao'])
    
    # Sort by date descending
    orders.sort(key=lambda x: x['data_atualizacao'], reverse=True)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    if isinstance(order.get('data_criacao'), str):
        order['data_criacao'] = datetime.fromisoformat(order['data_criacao'])
    if 'data_atualizacao' not in order:
        order['data_atualizacao'] = order.get('data_criacao', datetime.now(timezone.utc))
    elif isinstance(order['data_atualizacao'], str):
        order['data_atualizacao'] = datetime.fromisoformat(order['data_atualizacao'])
    
    return order

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, update_data: OrderUpdate):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    # Não permitir edição se status for "Levantada"
    if order.get('status') == 'Levantada':
        raise HTTPException(status_code=403, detail="Não é possível editar encomendas já levantadas")
    
    # Prepare update data, excluding None values
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Create historico entry for changes
    historico = order.get('historico', [])
    data_hora_atual = datetime.now(timezone.utc).isoformat()
    
    for campo, novo_valor in update_dict.items():
        valor_anterior = order.get(campo, '')
        if valor_anterior != novo_valor:
            historico.append({
                'data_hora': data_hora_atual,
                'campo_alterado': campo,
                'valor_anterior': str(valor_anterior),
                'valor_novo': str(novo_valor)
            })
    
    # Add data_levantada when status changes to Levantada
    if update_data.status == 'Levantada' and order.get('status') != 'Levantada':
        update_dict['data_levantada'] = data_hora_atual
        historico.append({
            'data_hora': data_hora_atual,
            'campo_alterado': 'data_levantada',
            'valor_anterior': '',
            'valor_novo': data_hora_atual
        })
    
    # Add updated timestamp and historico
    update_dict['data_atualizacao'] = data_hora_atual
    update_dict['historico'] = historico
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0 and len(update_dict) > 2:
        raise HTTPException(status_code=400, detail="Não foi possível atualizar a encomenda")
    
    # Fetch and return updated order
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order.get('data_criacao'), str):
        updated_order['data_criacao'] = datetime.fromisoformat(updated_order['data_criacao'])
    if 'data_atualizacao' not in updated_order:
        updated_order['data_atualizacao'] = updated_order.get('data_criacao', datetime.now(timezone.utc))
    elif isinstance(updated_order['data_atualizacao'], str):
        updated_order['data_atualizacao'] = datetime.fromisoformat(updated_order['data_atualizacao'])
    
    return updated_order

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    result = await db.orders.delete_one({"id": order_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Não foi possível eliminar a encomenda")
    
    return {"message": "Encomenda eliminada com sucesso", "id": order_id}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()