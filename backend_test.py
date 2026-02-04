import requests
import sys
import json
from datetime import datetime

class OrderManagementAPITester:
    def __init__(self, base_url="https://seq-num-primary.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_colaborador_id = None
        self.created_order_id = None
        self.status_test_order_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_colaboradores(self):
        """Test getting all colaboradores"""
        return self.run_test("Get All Colaboradores", "GET", "colaboradores", 200)

    def test_create_colaborador(self):
        """Test creating a new colaborador"""
        colaborador_data = {
            "nome": "João Santos"
        }
        
        success, response = self.run_test(
            "Create Colaborador",
            "POST",
            "colaboradores",
            200,
            data=colaborador_data
        )
        
        if success and 'id' in response:
            self.created_colaborador_id = response['id']
            return True
        return False

    def test_get_orders(self):
        """Test getting all orders"""
        return self.run_test("Get All Orders", "GET", "orders", 200)

    def test_create_order(self):
        """Test creating a new order"""
        # First ensure we have a colaborador
        if not self.created_colaborador_id:
            self.log_test("Create Order (No Colaborador)", False, "No colaborador ID available")
            return False
            
        order_data = {
            "nome_cliente": "Cliente Teste Final",
            "contacto": "999888777",
            "tem_entrega": False,
            "colaborador_id": self.created_colaborador_id,
            "tipo": "encomenda",
            "artigos": [
                {
                    "codigo": "ART001",
                    "designacao": "Produto Teste",
                    "quantidade": 2,
                    "preco_unitario": 25.50,
                    "preco_total": 51.00,
                    "separado": False
                },
                {
                    "codigo": "ART002", 
                    "designacao": "Produto Teste 2",
                    "quantidade": 1,
                    "preco_unitario": 15.00,
                    "preco_total": 15.00,
                    "separado": False
                }
            ],
            "subtotal_artigos": 66.00,
            "custo_entrega": 0.00,
            "total_final": 66.00,
            "observacoes": "Teste de criação de encomenda"
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.created_order_id = response['id']
            # Verify sequential numbering (2026-XXXX)
            if 'numero_encomenda' in response:
                numero = response['numero_encomenda']
                if numero.startswith('2026-'):
                    self.log_test("Sequential Numbering Check", True, f"Order number: {numero}")
                else:
                    self.log_test("Sequential Numbering Check", False, f"Invalid format: {numero}")
            return True
        return False

    def test_get_single_order(self):
        """Test getting a single order by ID"""
        if not self.created_order_id:
            self.log_test("Get Single Order (No Order ID)", False, "No order ID available from creation test")
            return False
        
        return self.run_test(
            "Get Single Order",
            "GET",
            f"orders/{self.created_order_id}",
            200
        )

    def test_update_order_status(self):
        """Test updating order status to 'Em Preparação'"""
        if not self.created_order_id:
            self.log_test("Update Order Status (No Order ID)", False, "No order ID available from creation test")
            return False
        
        return self.run_test(
            "Update Order Status",
            "PUT",
            f"orders/{self.created_order_id}",
            200,
            data={"status": "Em Preparação"}
        )

    def test_create_orcamento(self):
        """Test creating a new orçamento (quote)"""
        if not self.created_colaborador_id:
            self.log_test("Create Orçamento (No Colaborador)", False, "No colaborador ID available")
            return False
            
        orcamento_data = {
            "nome_cliente": "Cliente Orçamento Teste",
            "contacto": "888777666",
            "tem_entrega": True,
            "morada_entrega": "Rua Teste, 123, Porto",
            "distancia_kms": 5.0,
            "num_colaboradores": 1,
            "colaborador_id": self.created_colaborador_id,
            "tipo": "orcamento",
            "artigos": [
                {
                    "codigo": "ORC001",
                    "designacao": "Serviço Orçamento",
                    "quantidade": 1,
                    "preco_unitario": 100.00,
                    "preco_total": 100.00,
                    "separado": False
                }
            ],
            "subtotal_artigos": 100.00,
            "custo_entrega": 20.00,  # 5km * 2 + 1 colaborador * 10
            "total_final": 120.00
        }
        
        return self.run_test(
            "Create Orçamento",
            "POST",
            "orders",
            200,
            data=orcamento_data
        )

    def test_delete_order_with_levantada_status(self):
        """Test deleting an order with 'Levantada' status - specific requirement from review"""
        # First create a new order specifically for this test
        if not self.created_colaborador_id:
            self.log_test("Delete Levantada Order (No Colaborador)", False, "No colaborador ID available")
            return False
            
        order_data = {
            "nome_cliente": "Maria Silva",
            "contacto": "912345678",
            "tem_entrega": False,
            "colaborador_id": self.created_colaborador_id,
            "tipo": "encomenda",
            "artigos": [
                {
                    "codigo": "DEL001",
                    "designacao": "Produto para Teste Delete",
                    "quantidade": 1,
                    "preco_unitario": 50.00,
                    "preco_total": 50.00,
                    "separado": False
                }
            ],
            "subtotal_artigos": 50.00,
            "custo_entrega": 0.00,
            "total_final": 50.00,
            "observacoes": "Encomenda para teste de eliminação com status Levantada"
        }
        
        # Create the order
        success, response = self.run_test(
            "Create Order for Delete Test",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if not success or 'id' not in response:
            self.log_test("Delete Levantada Order - Creation Failed", False, "Could not create order for delete test")
            return False
            
        order_id = response['id']
        
        # Update status to 'Levantada'
        success, _ = self.run_test(
            "Update Order to Levantada Status",
            "PUT",
            f"orders/{order_id}",
            200,
            data={"status": "Levantada"}
        )
        
        if not success:
            self.log_test("Delete Levantada Order - Status Update Failed", False, "Could not update order to Levantada")
            return False
        
        # Now try to delete the order with 'Levantada' status
        success, _ = self.run_test(
            "Delete Order with Levantada Status",
            "DELETE",
            f"orders/{order_id}",
            200
        )
        
        return success

    def test_order_number_format(self):
        """Test that new orders return number in 2026-XXXX format"""
        if not self.created_colaborador_id:
            self.log_test("Order Number Format Test (No Colaborador)", False, "No colaborador ID available")
            return False
            
        order_data = {
            "nome_cliente": "António Costa",
            "contacto": "963852741",
            "tem_entrega": True,
            "morada_entrega": "Avenida da Liberdade, 100, Lisboa",
            "distancia_kms": 3.0,
            "num_colaboradores": 2,
            "colaborador_id": self.created_colaborador_id,
            "tipo": "encomenda",
            "artigos": [
                {
                    "codigo": "NUM001",
                    "designacao": "Produto Teste Numeração",
                    "quantidade": 3,
                    "preco_unitario": 33.33,
                    "preco_total": 99.99,
                    "separado": False
                }
            ],
            "subtotal_artigos": 99.99,
            "custo_entrega": 26.00,  # 3km * 2 + 2 colaboradores * 10
            "total_final": 125.99
        }
        
        success, response = self.run_test(
            "Create Order - Number Format Test",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'numero_encomenda' in response:
            numero = response['numero_encomenda']
            if numero.startswith('2026-') and len(numero.split('-')[1]) >= 4:
                self.log_test("Order Number Format Validation", True, f"Correct format: {numero}")
                return True
            else:
                self.log_test("Order Number Format Validation", False, f"Invalid format: {numero}")
                return False
        else:
            self.log_test("Order Number Format Validation", False, "No order number in response")
            return False

    def test_orders_data_structure(self):
        """Test GET /api/orders returns proper data structure"""
        success, response = self.run_test("Get Orders - Data Structure", "GET", "orders", 200)
        
        if success and isinstance(response, list):
            if len(response) > 0:
                # Check first order structure
                order = response[0]
                required_fields = ['id', 'numero_encomenda', 'nome_cliente', 'contacto', 'status', 'data_criacao']
                missing_fields = [field for field in required_fields if field not in order]
                
                if not missing_fields:
                    self.log_test("Orders Data Structure Validation", True, f"All required fields present in {len(response)} orders")
                    return True
                else:
                    self.log_test("Orders Data Structure Validation", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Orders Data Structure Validation", True, "Empty orders list - structure cannot be validated but endpoint works")
                return True
        else:
            self.log_test("Orders Data Structure Validation", False, "Response is not a list or request failed")
            return False

    def test_article_status_field(self):
        """Test that articles have status field with default 'Pendente'"""
        if not self.created_order_id:
            self.log_test("Article Status Field Test (No Order ID)", False, "No order ID available")
            return False
        
        success, response = self.run_test(
            "Get Order for Article Status Check",
            "GET",
            f"orders/{self.created_order_id}",
            200
        )
        
        if success and 'artigos' in response:
            artigos = response['artigos']
            if len(artigos) > 0:
                # Check if articles have status field
                article = artigos[0]
                if 'status' in article:
                    status = article['status']
                    if status == "Pendente":
                        self.log_test("Article Status Field Test", True, f"Article has status field with default value: {status}")
                        return True
                    else:
                        self.log_test("Article Status Field Test", False, f"Article status is not 'Pendente': {status}")
                        return False
                else:
                    self.log_test("Article Status Field Test", False, "Article does not have status field")
                    return False
            else:
                self.log_test("Article Status Field Test", False, "No articles found in order")
                return False
        else:
            self.log_test("Article Status Field Test", False, "Could not get order or no artigos field")
            return False

    def test_update_article_status_to_entregue(self):
        """Test updating article status to 'Entregue'"""
        if not self.created_order_id:
            self.log_test("Update Article Status to Entregue (No Order ID)", False, "No order ID available")
            return False
        
        # First get the current order
        success, response = self.run_test(
            "Get Order for Status Update",
            "GET",
            f"orders/{self.created_order_id}",
            200
        )
        
        if not success or 'artigos' not in response:
            self.log_test("Update Article Status to Entregue - Get Failed", False, "Could not get order")
            return False
        
        # Update the first article status to 'Entregue'
        artigos = response['artigos']
        if len(artigos) > 0:
            artigos[0]['status'] = 'Entregue'
            
            update_data = {
                "artigos": artigos
            }
            
            success, update_response = self.run_test(
                "Update Article Status to Entregue",
                "PUT",
                f"orders/{self.created_order_id}",
                200,
                data=update_data
            )
            
            if success and 'artigos' in update_response:
                updated_artigos = update_response['artigos']
                if len(updated_artigos) > 0 and updated_artigos[0]['status'] == 'Entregue':
                    self.log_test("Verify Article Status Updated to Entregue", True, "Article status successfully updated to Entregue")
                    return True
                else:
                    self.log_test("Verify Article Status Updated to Entregue", False, f"Status not updated correctly: {updated_artigos[0].get('status', 'missing')}")
                    return False
            else:
                self.log_test("Update Article Status to Entregue - Update Failed", False, "Update request failed")
                return False
        else:
            self.log_test("Update Article Status to Entregue - No Articles", False, "No articles in order")
            return False

    def test_update_article_status_to_cancelado(self):
        """Test updating article status to 'Cancelado'"""
        if not self.created_order_id:
            self.log_test("Update Article Status to Cancelado (No Order ID)", False, "No order ID available")
            return False
        
        # First get the current order
        success, response = self.run_test(
            "Get Order for Cancelado Status Update",
            "GET",
            f"orders/{self.created_order_id}",
            200
        )
        
        if not success or 'artigos' not in response:
            self.log_test("Update Article Status to Cancelado - Get Failed", False, "Could not get order")
            return False
        
        # Update the second article status to 'Cancelado' (if exists)
        artigos = response['artigos']
        if len(artigos) > 1:
            artigos[1]['status'] = 'Cancelado'
            
            update_data = {
                "artigos": artigos
            }
            
            success, update_response = self.run_test(
                "Update Article Status to Cancelado",
                "PUT",
                f"orders/{self.created_order_id}",
                200,
                data=update_data
            )
            
            if success and 'artigos' in update_response:
                updated_artigos = update_response['artigos']
                if len(updated_artigos) > 1 and updated_artigos[1]['status'] == 'Cancelado':
                    self.log_test("Verify Article Status Updated to Cancelado", True, "Article status successfully updated to Cancelado")
                    return True
                else:
                    self.log_test("Verify Article Status Updated to Cancelado", False, f"Status not updated correctly: {updated_artigos[1].get('status', 'missing')}")
                    return False
            else:
                self.log_test("Update Article Status to Cancelado - Update Failed", False, "Update request failed")
                return False
        else:
            self.log_test("Update Article Status to Cancelado - Insufficient Articles", False, "Need at least 2 articles for this test")
            return False

    def test_create_order_with_status_fields(self):
        """Test creating a new order specifically for per-item status testing"""
        if not self.created_colaborador_id:
            self.log_test("Create Order with Status Fields (No Colaborador)", False, "No colaborador ID available")
            return False
            
        order_data = {
            "nome_cliente": "Ana Pereira",
            "contacto": "987654321",
            "tem_entrega": False,
            "colaborador_id": self.created_colaborador_id,
            "tipo": "encomenda",
            "artigos": [
                {
                    "codigo": "STATUS001",
                    "designacao": "Produto Status Teste 1",
                    "quantidade": 1,
                    "preco_unitario": 30.00,
                    "preco_total": 30.00,
                    "separado": False,
                    "status": "Pendente"  # Explicitly set status
                },
                {
                    "codigo": "STATUS002", 
                    "designacao": "Produto Status Teste 2",
                    "quantidade": 2,
                    "preco_unitario": 20.00,
                    "preco_total": 40.00,
                    "separado": False,
                    "status": "Pendente"  # Explicitly set status
                },
                {
                    "codigo": "STATUS003", 
                    "designacao": "Produto Status Teste 3",
                    "quantidade": 1,
                    "preco_unitario": 50.00,
                    "preco_total": 50.00,
                    "separado": False,
                    "status": "Pendente"  # Explicitly set status
                }
            ],
            "subtotal_artigos": 120.00,
            "custo_entrega": 0.00,
            "total_final": 120.00,
            "observacoes": "Encomenda para teste de status por artigo"
        }
        
        success, response = self.run_test(
            "Create Order with Status Fields",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success and 'id' in response:
            self.status_test_order_id = response['id']
            # Verify all articles have status field
            if 'artigos' in response:
                artigos = response['artigos']
                all_have_status = all('status' in artigo for artigo in artigos)
                all_pendente = all(artigo.get('status') == 'Pendente' for artigo in artigos)
                
                if all_have_status and all_pendente:
                    self.log_test("Verify Created Order Articles Have Status", True, f"All {len(artigos)} articles have status 'Pendente'")
                    return True
                else:
                    self.log_test("Verify Created Order Articles Have Status", False, "Not all articles have correct status")
                    return False
            else:
                self.log_test("Create Order with Status Fields - No Articles", False, "No articles in response")
                return False
        return False

    def test_mixed_article_status_update(self):
        """Test updating multiple articles with different statuses"""
        if not hasattr(self, 'status_test_order_id'):
            self.log_test("Mixed Article Status Update (No Status Test Order)", False, "No status test order ID available")
            return False
        
        # Get the order
        success, response = self.run_test(
            "Get Order for Mixed Status Update",
            "GET",
            f"orders/{self.status_test_order_id}",
            200
        )
        
        if not success or 'artigos' not in response:
            self.log_test("Mixed Article Status Update - Get Failed", False, "Could not get order")
            return False
        
        # Update articles with different statuses
        artigos = response['artigos']
        if len(artigos) >= 3:
            artigos[0]['status'] = 'Entregue'    # First article: Entregue
            artigos[1]['status'] = 'Cancelado'   # Second article: Cancelado  
            artigos[2]['status'] = 'Pendente'    # Third article: Keep Pendente
            
            update_data = {
                "artigos": artigos
            }
            
            success, update_response = self.run_test(
                "Update Mixed Article Statuses",
                "PUT",
                f"orders/{self.status_test_order_id}",
                200,
                data=update_data
            )
            
            if success and 'artigos' in update_response:
                updated_artigos = update_response['artigos']
                if (len(updated_artigos) >= 3 and 
                    updated_artigos[0]['status'] == 'Entregue' and
                    updated_artigos[1]['status'] == 'Cancelado' and
                    updated_artigos[2]['status'] == 'Pendente'):
                    self.log_test("Verify Mixed Article Status Update", True, "All articles updated with correct mixed statuses")
                    return True
                else:
                    statuses = [art.get('status', 'missing') for art in updated_artigos[:3]]
                    self.log_test("Verify Mixed Article Status Update", False, f"Incorrect statuses: {statuses}")
                    return False
            else:
                self.log_test("Mixed Article Status Update - Update Failed", False, "Update request failed")
                return False
        else:
            self.log_test("Mixed Article Status Update - Insufficient Articles", False, f"Need at least 3 articles, got {len(artigos)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Order Management System API Tests")
        print("=" * 60)
        
        # Basic connectivity
        self.test_root_endpoint()
        
        # Colaboradores tests
        self.test_get_colaboradores()
        self.test_create_colaborador()
        
        # Orders tests
        self.test_get_orders()
        self.test_create_order()
        self.test_get_single_order()
        self.test_update_order_status()
        
        # Per-Item Status Feature Tests
        print("\n🔍 Testing Per-Item Status Feature...")
        self.test_article_status_field()
        self.test_update_article_status_to_entregue()
        self.test_update_article_status_to_cancelado()
        self.test_create_order_with_status_fields()
        self.test_mixed_article_status_update()
        
        # Orçamento test
        self.test_create_orcamento()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = OrderManagementAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())