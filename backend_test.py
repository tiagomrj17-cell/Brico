import requests
import sys
import json
from datetime import datetime

class OrderManagementAPITester:
    def __init__(self, base_url="https://ordersystem-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_colaborador_id = None
        self.created_order_id = None

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