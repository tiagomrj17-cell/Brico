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
class ArticleItem(BaseModel):
    codigo: str
    designacao: str
    quantidade: int
    preco_unitario: float
    preco_total: float

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

class HistoricoAlteracao(BaseModel):
    data_hora: str
    campo_alterado: str
    valor_anterior: str
    valor_novo: str

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    data_entrega_real: Optional[str] = None
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_atualizacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestão de Encomendas API"}

# Order routes (sem autenticação)
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    order_dict = order_data.model_dump()
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
    
    # Prepare update data, excluding None values
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Add updated timestamp
    update_dict['data_atualizacao'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0 and len(update_dict) > 1:
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