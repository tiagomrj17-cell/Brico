import requests
import sys
import json
from datetime import datetime

class OrderManagementAPITester:
    def __init__(self, base_url="https://ordersystem-12.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

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

    def test_staff_login(self, username="admin", password="admin123"):
        """Test staff login"""
        success, response = self.run_test(
            "Staff Login",
            "POST",
            "staff/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Token Extraction", True, "JWT token obtained")
            return True
        else:
            self.log_test("Token Extraction", False, "No token in response")
            return False

    def test_staff_me(self):
        """Test getting current staff info"""
        if not self.token:
            self.log_test("Staff Me (No Token)", False, "No authentication token available")
            return False
        
        return self.run_test("Get Current Staff Info", "GET", "staff/me", 200)

    def test_create_order(self):
        """Test creating a new order"""
        order_data = {
            "nome_cliente": "João Silva",
            "contacto": "+351 912 345 678",
            "tem_entrega": True,
            "morada_entrega": "Rua Example, 123, Lisboa",
            "distancia_kms": 10.5,
            "num_colaboradores": 2,
            "artigos": [
                {
                    "codigo": "ART001",
                    "designacao": "Produto Teste",
                    "quantidade": 2,
                    "preco_unitario": 25.50,
                    "preco_total": 51.00
                }
            ],
            "subtotal_artigos": 51.00,
            "custo_entrega": 51.00,  # (10.5 * 2) + (2 * 15) = 21 + 30 = 51
            "total_final": 102.00
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
            return True
        return False

    def test_get_orders(self):
        """Test getting all orders (requires authentication)"""
        if not self.token:
            self.log_test("Get Orders (No Token)", False, "No authentication token available")
            return False
        
        return self.run_test("Get All Orders", "GET", "orders", 200)

    def test_get_single_order(self):
        """Test getting a single order by ID"""
        if not self.token:
            self.log_test("Get Single Order (No Token)", False, "No authentication token available")
            return False
        
        if not hasattr(self, 'created_order_id'):
            self.log_test("Get Single Order (No Order ID)", False, "No order ID available from creation test")
            return False
        
        return self.run_test(
            "Get Single Order",
            "GET",
            f"orders/{self.created_order_id}",
            200
        )

    def test_update_order_status(self):
        """Test updating order status"""
        if not self.token:
            self.log_test("Update Order Status (No Token)", False, "No authentication token available")
            return False
        
        if not hasattr(self, 'created_order_id'):
            self.log_test("Update Order Status (No Order ID)", False, "No order ID available from creation test")
            return False
        
        return self.run_test(
            "Update Order Status",
            "PATCH",
            f"orders/{self.created_order_id}",
            200,
            data={"status": "Entregue"}
        )

    def test_order_calculations(self):
        """Test order calculation logic"""
        # Test order without delivery
        order_no_delivery = {
            "nome_cliente": "Maria Santos",
            "contacto": "+351 987 654 321",
            "tem_entrega": False,
            "morada_entrega": None,
            "distancia_kms": None,
            "num_colaboradores": None,
            "artigos": [
                {
                    "codigo": "ART002",
                    "designacao": "Produto Sem Entrega",
                    "quantidade": 1,
                    "preco_unitario": 100.00,
                    "preco_total": 100.00
                }
            ],
            "subtotal_artigos": 100.00,
            "custo_entrega": 0.00,
            "total_final": 100.00
        }
        
        return self.run_test(
            "Create Order Without Delivery",
            "POST",
            "orders",
            200,
            data=order_no_delivery
        )

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        return self.run_test(
            "Invalid Staff Login",
            "POST",
            "staff/login",
            401,
            data={"username": "invalid", "password": "wrong"}
        )

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Unauthorized Access to Orders",
            "GET",
            "orders",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Order Management System API Tests")
        print("=" * 60)
        
        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_invalid_login()
        self.test_unauthorized_access()
        self.test_staff_login()
        self.test_staff_me()
        
        # Order management tests
        self.test_create_order()
        self.test_order_calculations()
        self.test_get_orders()
        self.test_get_single_order()
        self.test_update_order_status()
        
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