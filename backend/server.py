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

# ============================================
# SISTEMA DE GERAÇÃO DE CÓDIGOS ÚNICOS
# ============================================
# Formato: PREFIXO + 4 DÍGITOS
# Exemplo: ENC0001, ORC0042
#
# A unicidade é garantida por:
# 1. Índice UNIQUE no MongoDB no campo 'numero_encomenda'
# 2. Operação atómica de busca e incremento
# 3. Retry logic em caso de colisão
# ============================================

async def generate_unique_order_code(tipo: str = "encomenda", max_retries: int = 10) -> str:
    """
    Gera um código único para encomenda ou orçamento.
    
    Formato: PREFIXO + 4 DÍGITOS (ENC0001, ORC0042)
    
    Args:
        tipo: "encomenda" ou "orcamento"
        max_retries: Número máximo de tentativas em caso de colisão
    
    Returns:
        Código único garantido
    """
    prefix = "ORC" if tipo == "orcamento" else "ENC"
    
    for attempt in range(max_retries):
        # Buscar o último número sequencial do mesmo tipo
        last_order = await db.orders.find_one(
            {"numero_encomenda": {"$regex": f"^{prefix}"}},
            {"_id": 0, "numero_encomenda": 1},
            sort=[("numero_encomenda", -1)]
        )
        
        if last_order and last_order.get('numero_encomenda'):
            try:
                # Extrair o número (ex: de "ENC0042" extrair "0042")
                num_str = last_order['numero_encomenda'].replace(prefix, "")
                seq_num = int(num_str) + 1
            except (ValueError, IndexError):
                seq_num = 1
        else:
            seq_num = 1
        
        # Formatar número com 4 dígitos
        seq_str = str(seq_num).zfill(4)
        codigo = f"{prefix}{seq_str}"
        
        # Verificar se já existe
        existing = await db.orders.find_one(
            {"numero_encomenda": codigo},
            {"_id": 1}
        )
        
        if not existing:
            return codigo
        
        # Se existir, incrementar e tentar novamente
        logging.warning(f"Código {codigo} já existe. Tentativa {attempt + 1}/{max_retries}")
    
    # Fallback: usar número mais alto + 1
    all_orders = await db.orders.find(
        {"numero_encomenda": {"$regex": f"^{prefix}"}},
        {"_id": 0, "numero_encomenda": 1}
    ).to_list(10000)
    
    max_num = 0
    for order in all_orders:
        try:
            num = int(order['numero_encomenda'].replace(prefix, ""))
            if num > max_num:
                max_num = num
        except:
            pass
    
    return f"{prefix}{str(max_num + 1).zfill(4)}"

async def ensure_unique_index():
    """
    Cria índice único no campo numero_encomenda.
    """
    try:
        await db.orders.create_index(
            "numero_encomenda",
            unique=True,
            sparse=True,
            name="unique_numero_encomenda"
        )
        logging.info("Índice único 'numero_encomenda' criado/verificado com sucesso")
    except Exception as e:
        logging.warning(f"Erro ao criar índice único: {e}")

@app.on_event("startup")
async def startup_event():
    await ensure_unique_index()
    logging.info("Aplicação iniciada - índices verificados")

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
    status: str = "Pendente"  # Pendente, Entregue, Cancelado

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
    """
    Retorna preview do próximo número sequencial.
    """
    prefix = "ORC" if tipo == "orcamento" else "ENC"
    
    last_order = await db.orders.find_one(
        {"numero_encomenda": {"$regex": f"^{prefix}"}},
        {"_id": 0, "numero_encomenda": 1},
        sort=[("numero_encomenda", -1)]
    )
    
    if last_order and last_order.get('numero_encomenda'):
        try:
            num_str = last_order['numero_encomenda'].replace(prefix, "")
            seq_num = int(num_str) + 1
        except (ValueError, IndexError):
            seq_num = 1
    else:
        seq_num = 1
    
    return f"{prefix}{str(seq_num).zfill(4)}"

@api_router.get("/orders/next-number/{tipo}")
async def get_next_number(tipo: str):
    """Retorna preview do próximo número"""
    next_number = await get_next_order_number(tipo)
    return {"next_number": next_number}

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    order_dict = order_data.model_dump()
    
    # Gerar código único garantido
    order_dict['numero_encomenda'] = await generate_unique_order_code(order_data.tipo)
    
    # Buscar nome do colaborador
    colaborador = await db.colaboradores.find_one({"id": order_data.colaborador_id})
    if colaborador:
        order_dict['nome_colaborador'] = colaborador['nome']
    
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
    
    # Inserir com tratamento de erro de duplicação
    try:
        await db.orders.insert_one(doc)
    except Exception as e:
        if "duplicate key" in str(e).lower() or "E11000" in str(e):
            # Tentar novamente com novo código (caso extremamente raro)
            order_dict['numero_encomenda'] = await generate_unique_order_code(order_data.tipo)
            order_obj = Order(**order_dict)
            doc = order_obj.model_dump()
            doc['data_criacao'] = doc['data_criacao'].isoformat()
            doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
            await db.orders.insert_one(doc)
        else:
            raise HTTPException(status_code=500, detail=f"Erro ao criar encomenda: {str(e)}")
    
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
            # Tratamento especial para artigos - detectar separados
            if campo == 'artigos':
                artigos_anteriores = order.get('artigos', [])
                artigos_novos = novo_valor if isinstance(novo_valor, list) else []
                
                # Verificar quais artigos foram marcados como separados
                artigos_separados = []
                for i, artigo_novo in enumerate(artigos_novos):
                    if i < len(artigos_anteriores):
                        artigo_anterior = artigos_anteriores[i]
                        if artigo_novo.get('separado') and not artigo_anterior.get('separado'):
                            nome_artigo = artigo_novo.get('designacao') or artigo_novo.get('codigo') or f'Artigo {i+1}'
                            artigos_separados.append(nome_artigo)
                
                if artigos_separados:
                    historico.append({
                        'data_hora': data_hora_atual,
                        'campo_alterado': 'artigos_separados',
                        'valor_anterior': '',
                        'valor_novo': ', '.join(artigos_separados)
                    })
                else:
                    # Mudança geral nos artigos
                    historico.append({
                        'data_hora': data_hora_atual,
                        'campo_alterado': campo,
                        'valor_anterior': str(valor_anterior),
                        'valor_novo': str(novo_valor)
                    })
            else:
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