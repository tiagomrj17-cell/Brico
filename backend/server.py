from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import html
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from functools import wraps
import hashlib
import time
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============================================
# CONFIGURAÇÃO DE LOGGING AVANÇADO
# ============================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# RATE LIMITING - Proteção contra abuso
# ============================================
class RateLimiter:
    """
    Sistema de rate limiting por IP para proteger contra:
    - Ataques de força bruta
    - DDoS básico
    - Abuso de API
    """
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, client_ip: str) -> bool:
        async with self._lock:
            now = time.time()
            # Limpar requests antigas
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if now - req_time < self.window_seconds
            ]
            
            if len(self.requests[client_ip]) >= self.max_requests:
                logger.warning(f"Rate limit excedido para IP: {client_ip}")
                return False
            
            self.requests[client_ip].append(now)
            return True
    
    def get_remaining(self, client_ip: str) -> int:
        now = time.time()
        valid_requests = [
            req_time for req_time in self.requests.get(client_ip, [])
            if now - req_time < self.window_seconds
        ]
        return max(0, self.max_requests - len(valid_requests))

rate_limiter = RateLimiter(max_requests=200, window_seconds=60)

# ============================================
# SANITIZAÇÃO E VALIDAÇÃO DE INPUTS
# ============================================
class InputSanitizer:
    """
    Sanitização de inputs para prevenir:
    - XSS (Cross-Site Scripting)
    - Injeção de SQL/NoSQL
    - Caracteres maliciosos
    """
    
    # Padrões perigosos
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Scripts
        r'javascript:',                  # JavaScript inline
        r'on\w+\s*=',                    # Event handlers
        r'\$\{.*?\}',                    # Template injection
        r'\{\{.*?\}\}',                  # Template injection
        r'<!--.*?-->',                   # HTML comments
        r'<iframe[^>]*>',                # Iframes
        r'<object[^>]*>',                # Objects
        r'<embed[^>]*>',                 # Embeds
    ]
    
    # Padrões de injeção NoSQL
    NOSQL_PATTERNS = [
        r'\$where',
        r'\$gt',
        r'\$lt',
        r'\$ne',
        r'\$regex',
        r'\$or',
        r'\$and',
        r'\$in',
        r'\$nin',
        r'\$exists',
    ]
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 1000) -> str:
        """Sanitiza uma string removendo caracteres perigosos"""
        if not value:
            return value
        
        # Truncar se muito longo
        if len(value) > max_length:
            value = value[:max_length]
        
        # Escapar HTML
        value = html.escape(value)
        
        # Remover padrões perigosos
        for pattern in cls.DANGEROUS_PATTERNS:
            value = re.sub(pattern, '', value, flags=re.IGNORECASE | re.DOTALL)
        
        # Verificar padrões NoSQL
        for pattern in cls.NOSQL_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Possível tentativa de injeção NoSQL detectada: {pattern}")
                value = re.sub(pattern, '', value, flags=re.IGNORECASE)
        
        return value.strip()
    
    @classmethod
    def sanitize_phone(cls, phone: str) -> str:
        """Sanitiza número de telefone"""
        if not phone:
            return phone
        # Manter apenas dígitos, espaços, + e -
        return re.sub(r'[^\d\s+\-()]', '', phone)[:20]
    
    @classmethod
    def sanitize_email(cls, email: str) -> str:
        """Sanitiza email"""
        if not email:
            return email
        # Validação básica de email
        email = email.strip().lower()[:100]
        if '@' in email and '.' in email.split('@')[-1]:
            return email
        return email
    
    @classmethod
    def sanitize_price(cls, price: float) -> float:
        """Valida e sanitiza preço"""
        if price is None:
            return 0.0
        price = float(price)
        if price < 0:
            return 0.0
        if price > 1000000:  # Limite máximo de 1 milhão
            return 1000000.0
        return round(price, 2)
    
    @classmethod
    def sanitize_quantity(cls, qty: int) -> int:
        """Valida e sanitiza quantidade"""
        if qty is None:
            return 1
        qty = int(qty)
        if qty < 1:
            return 1
        if qty > 10000:  # Limite máximo
            return 10000
        return qty

# ============================================
# AUDITORIA E LOGGING DE AÇÕES
# ============================================
class AuditLogger:
    """
    Sistema de auditoria para rastrear:
    - Criações
    - Atualizações
    - Eliminações
    - Acessos suspeitos
    """
    
    @staticmethod
    async def log_action(
        action: str,
        resource_type: str,
        resource_id: str,
        client_ip: str,
        details: Dict[str, Any] = None,
        user_agent: str = None
    ):
        """Regista uma ação no log de auditoria"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "details": details or {}
        }
        
        # Log para consola
        logger.info(f"AUDIT: {action} - {resource_type}/{resource_id} - IP: {client_ip}")
        
        # Guardar na base de dados (opcional, pode ser ativado)
        try:
            await db.audit_logs.insert_one(log_entry)
        except Exception as e:
            logger.error(f"Erro ao guardar log de auditoria: {e}")
    
    @staticmethod
    async def log_security_event(
        event_type: str,
        client_ip: str,
        details: str
    ):
        """Regista um evento de segurança"""
        logger.warning(f"SECURITY: {event_type} - IP: {client_ip} - {details}")
        
        try:
            await db.security_logs.insert_one({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": event_type,
                "client_ip": client_ip,
                "details": details
            })
        except Exception as e:
            logger.error(f"Erro ao guardar log de segurança: {e}")

# ============================================
# VALIDADORES DE NEGÓCIO
# ============================================
class BusinessValidator:
    """
    Validações de regras de negócio:
    - Estados válidos
    - Transições de estado permitidas
    - Limites de valores
    """
    
    VALID_ORDER_STATUSES = [
        "Pendente",
        "Em Preparação",
        "Pronta para Levantamento",
        "Entregue",
        "Levantada",
        "Cancelada"
    ]
    
    VALID_ARTICLE_STATUSES = [
        "Pendente",
        "Entregue",
        "Cancelado"
    ]
    
    # Transições de estado permitidas
    ALLOWED_TRANSITIONS = {
        "Pendente": ["Em Preparação", "Cancelada"],
        "Em Preparação": ["Pronta para Levantamento", "Entregue", "Cancelada"],
        "Pronta para Levantamento": ["Levantada", "Entregue", "Cancelada"],
        "Entregue": [],  # Estado final
        "Levantada": [],  # Estado final
        "Cancelada": ["Pendente"]  # Pode reativar
    }
    
    @classmethod
    def validate_status(cls, status: str) -> bool:
        """Valida se o status é válido"""
        return status in cls.VALID_ORDER_STATUSES
    
    @classmethod
    def validate_article_status(cls, status: str) -> bool:
        """Valida se o status do artigo é válido"""
        return status in cls.VALID_ARTICLE_STATUSES
    
    @classmethod
    def validate_status_transition(cls, current_status: str, new_status: str) -> tuple[bool, str]:
        """
        Valida se a transição de estado é permitida.
        Retorna (is_valid, error_message)
        """
        if current_status == new_status:
            return True, ""
        
        if not cls.validate_status(new_status):
            return False, f"Estado '{new_status}' não é válido"
        
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            return False, f"Transição de '{current_status}' para '{new_status}' não é permitida"
        
        return True, ""
    
    @classmethod
    def validate_order_totals(cls, artigos: list, subtotal: float, custo_entrega: float, total: float) -> tuple[bool, str]:
        """Valida se os totais estão corretos"""
        calculated_subtotal = sum(
            (art.get('preco_total', 0) if isinstance(art, dict) else art.preco_total)
            for art in artigos
        )
        
        # Permitir pequena margem de erro por arredondamentos
        if abs(calculated_subtotal - subtotal) > 0.01:
            return False, f"Subtotal incorreto: esperado {calculated_subtotal:.2f}, recebido {subtotal:.2f}"
        
        expected_total = subtotal + custo_entrega
        if abs(expected_total - total) > 0.01:
            return False, f"Total incorreto: esperado {expected_total:.2f}, recebido {total:.2f}"
        
        return True, ""
    
    @classmethod
    def can_edit_order(cls, status: str) -> bool:
        """Verifica se a encomenda pode ser editada"""
        return status not in ["Levantada", "Entregue", "Cancelada"]
    
    @classmethod
    def can_delete_order(cls, status: str) -> bool:
        """Verifica se a encomenda pode ser eliminada"""
        return status in ["Pendente", "Cancelada"]

# ============================================
# INTEGRIDADE DE DADOS
# ============================================
class DataIntegrity:
    """
    Verificações de integridade de dados:
    - Checksums
    - Validação de referências
    - Consistência
    """
    
    @staticmethod
    def generate_checksum(data: dict) -> str:
        """Gera checksum para verificação de integridade"""
        # Campos críticos para o checksum
        critical_fields = ['id', 'numero_encomenda', 'total_final', 'artigos']
        checksum_data = {k: data.get(k) for k in critical_fields}
        checksum_str = str(sorted(checksum_data.items()))
        return hashlib.sha256(checksum_str.encode()).hexdigest()[:16]
    
    @staticmethod
    async def verify_colaborador_exists(colaborador_id: str) -> bool:
        """Verifica se o colaborador existe e está ativo"""
        if not colaborador_id:
            return False
        colaborador = await db.colaboradores.find_one({
            "id": colaborador_id,
            "ativo": True
        })
        return colaborador is not None
    
    @staticmethod
    async def verify_order_exists(order_id: str) -> bool:
        """Verifica se a encomenda existe"""
        if not order_id:
            return False
        order = await db.orders.find_one({"id": order_id})
        return order is not None

# ============================================
# MONGODB CONNECTION
# ============================================
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'order_management')]

# ============================================
# FASTAPI APP
# ============================================
app = FastAPI(
    title="Sistema de Gestão de Encomendas",
    description="API para gestão de encomendas e orçamentos",
    version="2.0.0"
)

api_router = APIRouter(prefix="/api")

# ============================================
# MIDDLEWARE DE RATE LIMITING
# ============================================
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Middleware para aplicar rate limiting"""
    client_ip = request.client.host if request.client else "unknown"
    
    # Ignorar health checks
    if request.url.path in ["/", "/api/", "/health"]:
        return await call_next(request)
    
    if not await rate_limiter.is_allowed(client_ip):
        await AuditLogger.log_security_event(
            "RATE_LIMIT_EXCEEDED",
            client_ip,
            f"Path: {request.url.path}"
        )
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Demasiados pedidos. Por favor aguarde.",
                "retry_after": rate_limiter.window_seconds
            }
        )
    
    response = await call_next(request)
    
    # Adicionar headers de rate limit
    remaining = rate_limiter.get_remaining(client_ip)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
    
    return response

# ============================================
# MIDDLEWARE DE LOGGING DE REQUESTS
# ============================================
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """Middleware para logging de requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log apenas para endpoints de API
    if request.url.path.startswith("/api"):
        logger.info(
            f"REQUEST: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.3f}s - "
            f"IP: {request.client.host if request.client else 'unknown'}"
        )
    
    return response

# ============================================
# SISTEMA DE GERAÇÃO DE CÓDIGOS ÚNICOS
# ============================================
async def generate_unique_order_code(tipo: str = "encomenda", max_retries: int = 10) -> str:
    """
    Gera um código único para encomenda ou orçamento.
    Formato: PREFIXO + 4 DÍGITOS (ENC0001, ORC0042)
    """
    prefix = "ORC" if tipo == "orcamento" else "ENC"
    
    for attempt in range(max_retries):
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
        
        seq_str = str(seq_num).zfill(4)
        codigo = f"{prefix}{seq_str}"
        
        existing = await db.orders.find_one(
            {"numero_encomenda": codigo},
            {"_id": 1}
        )
        
        if not existing:
            return codigo
        
        logger.warning(f"Código {codigo} já existe. Tentativa {attempt + 1}/{max_retries}")
    
    # Fallback
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
        except (ValueError, TypeError, KeyError):
            pass
    
    return f"{prefix}{str(max_num + 1).zfill(4)}"

async def ensure_indexes():
    """Cria índices necessários na base de dados"""
    try:
        # Índice único no número da encomenda
        await db.orders.create_index(
            "numero_encomenda",
            unique=True,
            sparse=True,
            name="unique_numero_encomenda"
        )
        
        # Índice para pesquisa por status
        await db.orders.create_index("status", name="idx_status")
        
        # Índice para pesquisa por colaborador
        await db.orders.create_index("colaborador_id", name="idx_colaborador")
        
        # Índice para pesquisa por data
        await db.orders.create_index("data_criacao", name="idx_data_criacao")
        
        # Índice para tipo (encomenda/orcamento)
        await db.orders.create_index("tipo", name="idx_tipo")
        
        # Índice composto para filtros comuns
        await db.orders.create_index(
            [("status", 1), ("tipo", 1), ("data_criacao", -1)],
            name="idx_status_tipo_data"
        )
        
        # Índices para colaboradores
        await db.colaboradores.create_index("id", unique=True, name="unique_colab_id")
        await db.colaboradores.create_index("ativo", name="idx_colab_ativo")
        
        # Índices para logs de auditoria
        await db.audit_logs.create_index("timestamp", name="idx_audit_timestamp")
        await db.audit_logs.create_index(
            "timestamp",
            expireAfterSeconds=30*24*60*60,  # 30 dias
            name="ttl_audit_logs"
        )
        
        # Índices para logs de segurança
        await db.security_logs.create_index("timestamp", name="idx_security_timestamp")
        await db.security_logs.create_index(
            "timestamp",
            expireAfterSeconds=90*24*60*60,  # 90 dias
            name="ttl_security_logs"
        )
        
        logger.info("Índices criados/verificados com sucesso")
    except Exception as e:
        logger.warning(f"Erro ao criar índices: {e}")

@app.on_event("startup")
async def startup_event():
    """Inicialização da aplicação"""
    logger.info("Iniciando aplicação...")
    await ensure_indexes()
    logger.info("Aplicação iniciada com sucesso")

@app.on_event("shutdown")
async def shutdown_event():
    """Encerramento da aplicação"""
    logger.info("Encerrando aplicação...")
    client.close()
    logger.info("Conexão com MongoDB fechada")

# ============================================
# MODELS COM VALIDAÇÃO
# ============================================
class Colaborador(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    ativo: bool = True
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator('nome')
    @classmethod
    def sanitize_nome(cls, v):
        return InputSanitizer.sanitize_string(v, max_length=100)

class ColaboradorCreate(BaseModel):
    nome: str
    
    @field_validator('nome')
    @classmethod
    def validate_nome(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Nome deve ter pelo menos 2 caracteres')
        return InputSanitizer.sanitize_string(v, max_length=100)

class ArticleItem(BaseModel):
    codigo: str
    designacao: str
    quantidade: int
    preco_unitario: float
    preco_total: float
    separado: bool = False
    status: str = "Pendente"
    
    @field_validator('codigo', 'designacao')
    @classmethod
    def sanitize_strings(cls, v):
        return InputSanitizer.sanitize_string(v, max_length=200)
    
    @field_validator('quantidade')
    @classmethod
    def validate_quantidade(cls, v):
        return InputSanitizer.sanitize_quantity(v)
    
    @field_validator('preco_unitario', 'preco_total')
    @classmethod
    def validate_precos(cls, v):
        return InputSanitizer.sanitize_price(v)
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if not BusinessValidator.validate_article_status(v):
            raise ValueError(f"Status de artigo inválido: {v}")
        return v

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
    tipo: str = "encomenda"
    nome_colaborador: Optional[str] = None
    adiantamento: Optional[float] = None
    pago_totalidade: bool = False
    
    @field_validator('nome_cliente')
    @classmethod
    def validate_nome_cliente(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Nome do cliente deve ter pelo menos 2 caracteres')
        return InputSanitizer.sanitize_string(v, max_length=200)
    
    @field_validator('contacto')
    @classmethod
    def validate_contacto(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('Contacto deve ter pelo menos 5 caracteres')
        return InputSanitizer.sanitize_phone(v) or InputSanitizer.sanitize_email(v)
    
    @field_validator('morada_entrega', 'observacoes')
    @classmethod
    def sanitize_text_fields(cls, v):
        if v:
            return InputSanitizer.sanitize_string(v, max_length=500)
        return v
    
    @field_validator('subtotal_artigos', 'custo_entrega', 'total_final')
    @classmethod
    def validate_values(cls, v):
        return InputSanitizer.sanitize_price(v)
    
    @field_validator('adiantamento')
    @classmethod
    def validate_adiantamento(cls, v):
        if v is not None:
            return InputSanitizer.sanitize_price(v)
        return v
    
    @field_validator('tipo')
    @classmethod
    def validate_tipo(cls, v):
        if v not in ['encomenda', 'orcamento']:
            raise ValueError('Tipo deve ser "encomenda" ou "orcamento"')
        return v
    
    @field_validator('artigos')
    @classmethod
    def validate_artigos(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Deve incluir pelo menos um artigo')
        if len(v) > 100:
            raise ValueError('Máximo de 100 artigos por encomenda')
        return v

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    observacoes: Optional[str] = None
    data_entrega_prevista: Optional[str] = None
    artigos: Optional[List[ArticleItem]] = None
    pago_totalidade: Optional[bool] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v and not BusinessValidator.validate_status(v):
            raise ValueError(f"Estado inválido: {v}")
        return v
    
    @field_validator('observacoes')
    @classmethod
    def sanitize_observacoes(cls, v):
        if v:
            return InputSanitizer.sanitize_string(v, max_length=500)
        return v

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
    adiantamento: Optional[float] = None
    pago_totalidade: bool = False
    historico: List[dict] = Field(default_factory=list)
    data_criacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_atualizacao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============================================
# HELPER PARA OBTER IP DO CLIENTE
# ============================================
def get_client_ip(request: Request) -> str:
    """Obtém o IP real do cliente"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ============================================
# ROUTES - COLABORADORES
# ============================================
@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestão de Encomendas API", "version": "2.0.0"}

@api_router.post("/colaboradores", response_model=Colaborador)
async def create_colaborador(colab_data: ColaboradorCreate, request: Request):
    """Cria um novo colaborador"""
    client_ip = get_client_ip(request)
    
    colab_obj = Colaborador(**colab_data.model_dump())
    doc = colab_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    
    await db.colaboradores.insert_one(doc)
    
    await AuditLogger.log_action(
        action="CREATE",
        resource_type="colaborador",
        resource_id=colab_obj.id,
        client_ip=client_ip,
        details={"nome": colab_obj.nome}
    )
    
    return colab_obj

@api_router.get("/colaboradores", response_model=List[Colaborador])
async def get_colaboradores():
    """Lista todos os colaboradores ativos"""
    colaboradores = await db.colaboradores.find({"ativo": True}, {"_id": 0}).to_list(1000)
    
    for colab in colaboradores:
        if isinstance(colab.get('data_criacao'), str):
            colab['data_criacao'] = datetime.fromisoformat(colab['data_criacao'])
    
    colaboradores.sort(key=lambda x: x.get('nome', ''))
    return colaboradores

@api_router.delete("/colaboradores/{colaborador_id}")
async def delete_colaborador(colaborador_id: str, request: Request):
    """Remove um colaborador (soft delete)"""
    client_ip = get_client_ip(request)
    
    # Verificar se existe
    colaborador = await db.colaboradores.find_one({"id": colaborador_id})
    if not colaborador:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    
    # Soft delete
    result = await db.colaboradores.update_one(
        {"id": colaborador_id},
        {"$set": {"ativo": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Não foi possível remover o colaborador")
    
    await AuditLogger.log_action(
        action="DELETE",
        resource_type="colaborador",
        resource_id=colaborador_id,
        client_ip=client_ip,
        details={"nome": colaborador.get('nome')}
    )
    
    return {"message": "Colaborador removido com sucesso"}

# ============================================
# ROUTES - ORDERS
# ============================================
async def get_next_order_number(tipo: str = "encomenda"):
    """Retorna preview do próximo número sequencial"""
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
    if tipo not in ['encomenda', 'orcamento']:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    next_number = await get_next_order_number(tipo)
    return {"next_number": next_number}

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, request: Request):
    """Cria uma nova encomenda ou orçamento"""
    client_ip = get_client_ip(request)
    
    # Verificar se colaborador existe
    if not await DataIntegrity.verify_colaborador_exists(order_data.colaborador_id):
        raise HTTPException(status_code=400, detail="Colaborador não encontrado ou inativo")
    
    # Validar totais
    artigos_dict = [art.model_dump() for art in order_data.artigos]
    is_valid, error_msg = BusinessValidator.validate_order_totals(
        artigos_dict,
        order_data.subtotal_artigos,
        order_data.custo_entrega,
        order_data.total_final
    )
    if not is_valid:
        logger.warning(f"Validação de totais falhou: {error_msg}")
        # Não bloquear, apenas avisar (pode haver arredondamentos)
    
    order_dict = order_data.model_dump()
    
    # Gerar código único
    order_dict['numero_encomenda'] = await generate_unique_order_code(order_data.tipo)
    
    # Buscar nome do colaborador
    colaborador = await db.colaboradores.find_one({"id": order_data.colaborador_id})
    if colaborador:
        order_dict['nome_colaborador'] = colaborador['nome']
    
    order_obj = Order(**order_dict)
    
    doc = order_obj.model_dump()
    doc['data_criacao'] = doc['data_criacao'].isoformat()
    doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
    doc['checksum'] = DataIntegrity.generate_checksum(doc)
    
    try:
        await db.orders.insert_one(doc)
    except Exception as e:
        if "duplicate key" in str(e).lower() or "E11000" in str(e):
            # Retry com novo código
            order_dict['numero_encomenda'] = await generate_unique_order_code(order_data.tipo)
            order_obj = Order(**order_dict)
            doc = order_obj.model_dump()
            doc['data_criacao'] = doc['data_criacao'].isoformat()
            doc['data_atualizacao'] = doc['data_atualizacao'].isoformat()
            doc['checksum'] = DataIntegrity.generate_checksum(doc)
            await db.orders.insert_one(doc)
        else:
            logger.error(f"Erro ao criar encomenda: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao criar encomenda")
    
    await AuditLogger.log_action(
        action="CREATE",
        resource_type="order",
        resource_id=order_obj.id,
        client_ip=client_ip,
        details={
            "numero": order_obj.numero_encomenda,
            "tipo": order_obj.tipo,
            "cliente": order_obj.nome_cliente,
            "total": order_obj.total_final
        }
    )
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    """Lista todas as encomendas"""
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('data_criacao'), str):
            order['data_criacao'] = datetime.fromisoformat(order['data_criacao'])
        if 'data_atualizacao' not in order:
            order['data_atualizacao'] = order.get('data_criacao', datetime.now(timezone.utc))
        elif isinstance(order['data_atualizacao'], str):
            order['data_atualizacao'] = datetime.fromisoformat(order['data_atualizacao'])
    
    orders.sort(key=lambda x: x['data_atualizacao'], reverse=True)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Obtém uma encomenda específica"""
    # Validar formato do ID
    if not order_id or len(order_id) < 10:
        raise HTTPException(status_code=400, detail="ID de encomenda inválido")
    
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
async def update_order(order_id: str, update_data: OrderUpdate, request: Request):
    """Atualiza uma encomenda"""
    client_ip = get_client_ip(request)
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    current_status = order.get('status', 'Pendente')
    
    # Validar se pode editar
    if not BusinessValidator.can_edit_order(current_status):
        if update_data.status and update_data.status != current_status:
            # Permitir apenas certas transições em estados finais
            pass
        else:
            raise HTTPException(
                status_code=403, 
                detail=f"Não é possível editar encomendas com estado '{current_status}'"
            )
    
    # Validar transição de estado
    if update_data.status:
        is_valid, error_msg = BusinessValidator.validate_status_transition(
            current_status, 
            update_data.status
        )
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
    
    # Preparar dados de atualização
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Criar histórico
    historico = order.get('historico', [])
    data_hora_atual = datetime.now(timezone.utc).isoformat()
    
    for campo, novo_valor in update_dict.items():
        valor_anterior = order.get(campo, '')
        if valor_anterior != novo_valor:
            if campo == 'artigos':
                artigos_anteriores = order.get('artigos', [])
                artigos_novos = novo_valor if isinstance(novo_valor, list) else []
                
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
    
    # Adicionar data_levantada quando muda para Levantada
    if update_data.status == 'Levantada' and current_status != 'Levantada':
        update_dict['data_levantada'] = data_hora_atual
        historico.append({
            'data_hora': data_hora_atual,
            'campo_alterado': 'data_levantada',
            'valor_anterior': '',
            'valor_novo': data_hora_atual
        })
    
    update_dict['data_atualizacao'] = data_hora_atual
    update_dict['historico'] = historico
    
    # Atualizar checksum
    updated_doc = {**order, **update_dict}
    update_dict['checksum'] = DataIntegrity.generate_checksum(updated_doc)
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0 and len(update_dict) > 2:
        raise HTTPException(status_code=400, detail="Não foi possível atualizar a encomenda")
    
    await AuditLogger.log_action(
        action="UPDATE",
        resource_type="order",
        resource_id=order_id,
        client_ip=client_ip,
        details={
            "numero": order.get('numero_encomenda'),
            "campos_alterados": list(update_dict.keys())
        }
    )
    
    # Buscar e retornar encomenda atualizada
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order.get('data_criacao'), str):
        updated_order['data_criacao'] = datetime.fromisoformat(updated_order['data_criacao'])
    if 'data_atualizacao' not in updated_order:
        updated_order['data_atualizacao'] = updated_order.get('data_criacao', datetime.now(timezone.utc))
    elif isinstance(updated_order['data_atualizacao'], str):
        updated_order['data_atualizacao'] = datetime.fromisoformat(updated_order['data_atualizacao'])
    
    return updated_order

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, request: Request):
    """Elimina uma encomenda"""
    client_ip = get_client_ip(request)
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    
    # Verificar se pode eliminar
    current_status = order.get('status', 'Pendente')
    if not BusinessValidator.can_delete_order(current_status):
        raise HTTPException(
            status_code=403, 
            detail=f"Não é possível eliminar encomendas com estado '{current_status}'"
        )
    
    result = await db.orders.delete_one({"id": order_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Não foi possível eliminar a encomenda")
    
    await AuditLogger.log_action(
        action="DELETE",
        resource_type="order",
        resource_id=order_id,
        client_ip=client_ip,
        details={
            "numero": order.get('numero_encomenda'),
            "cliente": order.get('nome_cliente')
        }
    )
    
    return {"message": "Encomenda eliminada com sucesso", "id": order_id}

# ============================================
# HEALTH CHECK
# ============================================
@api_router.get("/health")
async def health_check():
    """Endpoint de health check"""
    try:
        # Verificar conexão MongoDB
        await db.command('ping')
        mongo_status = "healthy"
    except Exception as e:
        mongo_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if mongo_status == "healthy" else "degraded",
        "mongodb": mongo_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============================================
# INCLUDE ROUTER E CORS
# ============================================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
