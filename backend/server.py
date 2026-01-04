from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

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

class OrderUpdate(BaseModel):
    nome_cliente: Optional[str] = None
    contacto: Optional[str] = None
    tem_entrega: Optional[bool] = None
    morada_entrega: Optional[str] = None
    distancia_kms: Optional[float] = None
    num_colaboradores: Optional[int] = None
    artigos: Optional[List[ArticleItem]] = None
    subtotal_artigos: Optional[float] = None
    custo_entrega: Optional[float] = None
    total_final: Optional[float] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    data_entrega_real: Optional[str] = None

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
    status: str = "Pendente"  # Pendente, Em Preparação, Pronta para Levantamento, Entregue, Levantada, Cancelada
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    data_entrega_real: Optional[str] = None
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_atualizacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffLogin(BaseModel):
    username: str
    password: str

class StaffCreate(BaseModel):
    username: str
    password: str
    nome: str

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    nome: str
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(staff_id: str, username: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'staff_id': staff_id,
        'username': username,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_staff(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        staff_id = payload.get('staff_id')
        
        if not staff_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
        if not staff:
            raise HTTPException(status_code=401, detail="Staff não encontrado")
        
        return staff
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestão de Encomendas API"}

# Staff authentication routes
@api_router.post("/staff/register")
async def register_staff(staff_data: StaffCreate):
    # Check if username already exists
    existing = await db.staff.find_one({"username": staff_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username já existe")
    
    staff_dict = staff_data.model_dump()
    hashed_password = hash_password(staff_dict.pop('password'))
    
    staff_obj = Staff(**staff_dict)
    doc = staff_obj.model_dump()
    doc['password'] = hashed_password
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    
    await db.staff.insert_one(doc)
    return {"message": "Staff registado com sucesso", "username": staff_obj.username}

@api_router.post("/staff/login")
async def login_staff(login_data: StaffLogin):
    staff = await db.staff.find_one({"username": login_data.username})
    if not staff:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(login_data.password, staff['password']):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_token(staff['id'], staff['username'])
    return {
        "token": token,
        "staff": {
            "id": staff['id'],
            "username": staff['username'],
            "nome": staff['nome']
        }
    }

@api_router.get("/staff/me")
async def get_current_staff_info(current_staff: dict = Depends(get_current_staff)):
    return {
        "id": current_staff['id'],
        "username": current_staff['username'],
        "nome": current_staff['nome']
    }

# Order routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_staff: dict = Depends(get_current_staff)):
    order_dict = order_data.model_dump()
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
    
    await db.orders.insert_one(doc)
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_staff: dict = Depends(get_current_staff)):
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
async def get_order(order_id: str, current_staff: dict = Depends(get_current_staff)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    if isinstance(order['data_criacao'], str):
        order['data_criacao'] = datetime.fromisoformat(order['data_criacao'])
    if isinstance(order['data_atualizacao'], str):
        order['data_atualizacao'] = datetime.fromisoformat(order['data_atualizacao'])
    
    return order

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, update_data: OrderUpdate, current_staff: dict = Depends(get_current_staff)):
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
    
    if result.modified_count == 0 and len(update_dict) > 1:  # > 1 because data_atualizacao is always present
        raise HTTPException(status_code=400, detail="Não foi possível atualizar a encomenda")
    
    # Fetch and return updated order
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order['data_criacao'], str):
        updated_order['data_criacao'] = datetime.fromisoformat(updated_order['data_criacao'])
    if isinstance(updated_order['data_atualizacao'], str):
        updated_order['data_atualizacao'] = datetime.fromisoformat(updated_order['data_atualizacao'])
    
    return updated_order

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_staff: dict = Depends(get_current_staff)):
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