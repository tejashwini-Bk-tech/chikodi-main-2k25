import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image

class ServiceProviderAPITester:
    def __init__(self, base_url="https://expert-signup.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def create_sample_image_base64(self):
        """Create a sample image and return as base64"""
        img = Image.new('RGB', (100, 100), color='red')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Response: {response.json()}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, str(e))
            return False

    def test_professions_endpoint(self):
        """Test professions endpoint"""
        try:
            response = requests.get(f"{self.api_url}/professions")
            success = response.status_code == 200
            if success:
                data = response.json()
                professions = data.get('professions', [])
                success = len(professions) > 0
                details = f"Found {len(professions)} professions"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Professions Endpoint", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Professions Endpoint", False, str(e))
            return False, {}

    def test_provider_registration(self):
        """Test provider registration with complete data"""
        try:
            # Create sample base64 images
            sample_image = self.create_sample_image_base64()
            
            registration_data = {
                "email": "test@example.com",
                "mobile_number": f"9876543{datetime.now().strftime('%H%M')}",  # Unique mobile
                "professions": ["electrician", "carpenter"],
                "trade_license": None,  # Not required for electrician/carpenter
                "health_permit": None,
                "certificates": [sample_image],
                "work_sample": sample_image,
                "aadhaar_card": sample_image,
                "pan_card": sample_image,
                "face_photo": sample_image
            }
            
            response = requests.post(f"{self.api_url}/register", json=registration_data)
            success = response.status_code == 200
            
            if success:
                provider_data = response.json()
                provider_id = provider_data.get('provider_id')
                details = f"Provider registered with ID: {provider_id}"
                self.registered_provider_id = provider_id
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Provider Registration", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Provider Registration", False, str(e))
            return False, {}

    def test_locksmith_registration_mandatory_license(self):
        """Test locksmith registration without mandatory trade license (should fail)"""
        try:
            sample_image = self.create_sample_image_base64()
            
            registration_data = {
                "email": "locksmith@example.com",
                "mobile_number": f"9876544{datetime.now().strftime('%H%M')}",
                "professions": ["locksmith"],
                "trade_license": None,  # Missing mandatory license
                "health_permit": None,
                "certificates": [],
                "work_sample": sample_image,
                "aadhaar_card": sample_image,
                "pan_card": sample_image,
                "face_photo": sample_image
            }
            
            response = requests.post(f"{self.api_url}/register", json=registration_data)
            # Should fail with 400
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Expected 400 for missing mandatory license"
            
            self.log_test("Locksmith Registration (No License)", success, details)
            return success
        except Exception as e:
            self.log_test("Locksmith Registration (No License)", False, str(e))
            return False

    def test_locksmith_registration_with_license(self):
        """Test locksmith registration with mandatory trade license (should pass)"""
        try:
            sample_image = self.create_sample_image_base64()
            
            registration_data = {
                "email": "locksmith2@example.com",
                "mobile_number": f"9876545{datetime.now().strftime('%H%M')}",
                "professions": ["locksmith"],
                "trade_license": sample_image,  # Mandatory license provided
                "health_permit": None,
                "certificates": [],
                "work_sample": sample_image,
                "aadhaar_card": sample_image,
                "pan_card": sample_image,
                "face_photo": sample_image
            }
            
            response = requests.post(f"{self.api_url}/register", json=registration_data)
            success = response.status_code == 200
            
            if success:
                provider_data = response.json()
                provider_id = provider_data.get('provider_id')
                details = f"Locksmith registered with ID: {provider_id}"
                self.locksmith_provider_id = provider_id
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Locksmith Registration (With License)", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Locksmith Registration (With License)", False, str(e))
            return False, {}

    def test_get_provider(self, provider_id):
        """Test getting provider details"""
        try:
            response = requests.get(f"{self.api_url}/provider/{provider_id}")
            success = response.status_code == 200
            
            if success:
                provider_data = response.json()
                details = f"Retrieved provider: {provider_data.get('provider_id')}"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Get Provider Details", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Get Provider Details", False, str(e))
            return False, {}

    def test_download_id_card(self, provider_id):
        """Test ID card download"""
        try:
            response = requests.get(f"{self.api_url}/provider/{provider_id}/id-card")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_id_card = 'id_card' in data and data['id_card']
                success = has_id_card
                details = f"ID card available: {has_id_card}"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Download ID Card", success, details)
            return success
        except Exception as e:
            self.log_test("Download ID Card", False, str(e))
            return False

    def test_wallet_update(self, provider_id):
        """Test wallet balance update"""
        try:
            response = requests.patch(f"{self.api_url}/provider/{provider_id}/wallet?amount=100.50")
            success = response.status_code == 200
            
            if success:
                details = "Wallet updated successfully"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("Wallet Update", success, details)
            return success
        except Exception as e:
            self.log_test("Wallet Update", False, str(e))
            return False

    def test_list_providers(self):
        """Test listing all providers"""
        try:
            response = requests.get(f"{self.api_url}/providers")
            success = response.status_code == 200
            
            if success:
                providers = response.json()
                details = f"Found {len(providers)} providers"
            else:
                details = f"Status: {response.status_code}"
            
            self.log_test("List Providers", success, details)
            return success
        except Exception as e:
            self.log_test("List Providers", False, str(e))
            return False

    def test_duplicate_mobile_registration(self):
        """Test registration with duplicate mobile number (should fail)"""
        try:
            sample_image = self.create_sample_image_base64()
            
            # Use the same mobile number as first registration
            registration_data = {
                "email": "duplicate@example.com",
                "mobile_number": f"9876543{datetime.now().strftime('%H%M')}",  # Same as first test
                "professions": ["plumber"],
                "trade_license": None,
                "health_permit": None,
                "certificates": [],
                "work_sample": sample_image,
                "aadhaar_card": sample_image,
                "pan_card": sample_image,
                "face_photo": sample_image
            }
            
            response = requests.post(f"{self.api_url}/register", json=registration_data)
            # Should fail with 400
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Expected 400 for duplicate mobile"
            
            self.log_test("Duplicate Mobile Registration", success, details)
            return success
        except Exception as e:
            self.log_test("Duplicate Mobile Registration", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Service Provider API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Initialize variables
        self.registered_provider_id = None
        self.locksmith_provider_id = None
        
        # Test basic endpoints
        if not self.test_root_endpoint():
            print("❌ Root endpoint failed - stopping tests")
            return self.generate_report()
        
        success, professions_data = self.test_professions_endpoint()
        if not success:
            print("❌ Professions endpoint failed - stopping tests")
            return self.generate_report()
        
        # Test registration flows
        success, provider_data = self.test_provider_registration()
        if success and self.registered_provider_id:
            # Test provider-specific endpoints
            self.test_get_provider(self.registered_provider_id)
            self.test_download_id_card(self.registered_provider_id)
            self.test_wallet_update(self.registered_provider_id)
        
        # Test locksmith specific flows
        self.test_locksmith_registration_mandatory_license()
        success, locksmith_data = self.test_locksmith_registration_with_license()
        
        # Test other endpoints
        self.test_list_providers()
        self.test_duplicate_mobile_registration()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = ServiceProviderAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())