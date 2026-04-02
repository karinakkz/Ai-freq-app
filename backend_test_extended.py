#!/usr/bin/env python3
"""
FreqFlow Backend API Extended Test Suite
Additional tests for edge cases and specific behaviors
"""

import requests
import json
import time
from datetime import datetime, timedelta
import uuid

# Backend URL from frontend environment
BACKEND_URL = "https://freq-flow-test.preview.emergentagent.com/api"

class ExtendedAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        
    def test_task_expiration_logic(self):
        """Test that tasks have proper 24h expiry and saved tasks don't get deleted"""
        print("🕒 Testing Task Expiration Logic...")
        
        try:
            # Create a task
            task_data = {
                "title": "Test expiration task",
                "description": "This task should expire in 24h",
                "type": "note"
            }
            
            response = self.session.post(
                f"{self.base_url}/tasks",
                json=task_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                task = response.json()
                created_at = datetime.fromisoformat(task["created_at"].replace("Z", "+00:00"))
                expires_at = datetime.fromisoformat(task["expires_at"].replace("Z", "+00:00"))
                
                # Check if expiry is approximately 24 hours from creation
                expected_expiry = created_at + timedelta(hours=24)
                time_diff = abs((expires_at - expected_expiry).total_seconds())
                
                if time_diff < 60:  # Allow 1 minute tolerance
                    print("✅ Task expiration set correctly (24h from creation)")
                    
                    # Test that saved tasks don't get deleted
                    task_id = task["id"]
                    
                    # Mark task as saved
                    save_response = self.session.put(f"{self.base_url}/tasks/{task_id}?saved=true")
                    if save_response.status_code == 200:
                        print("✅ Task marked as saved")
                        
                        # Run cleanup - saved tasks should not be deleted
                        cleanup_response = self.session.post(f"{self.base_url}/tasks/cleanup")
                        if cleanup_response.status_code == 200:
                            print("✅ Cleanup endpoint works")
                            
                            # Verify saved task still exists
                            tasks_response = self.session.get(f"{self.base_url}/tasks")
                            if tasks_response.status_code == 200:
                                tasks = tasks_response.json()
                                saved_task_exists = any(t["id"] == task_id for t in tasks)
                                if saved_task_exists:
                                    print("✅ Saved task not deleted by cleanup")
                                    return True
                                else:
                                    print("❌ Saved task was incorrectly deleted")
                            else:
                                print("❌ Could not verify saved task existence")
                        else:
                            print("❌ Cleanup endpoint failed")
                    else:
                        print("❌ Could not mark task as saved")
                else:
                    print(f"❌ Task expiration incorrect. Expected ~24h, got {time_diff}s difference")
            else:
                print(f"❌ Could not create test task: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ Exception in expiration test: {str(e)}")
            
        return False

    def test_stress_level_variations(self):
        """Test different stress levels and their effects on streak"""
        print("📊 Testing Stress Level Variations...")
        
        stress_levels = ["calm", "moderate", "stressed"]
        
        try:
            # Get initial streak
            initial_response = self.session.get(f"{self.base_url}/streak/current")
            if initial_response.status_code != 200:
                print("❌ Could not get initial streak")
                return False
                
            initial_data = initial_response.json()
            initial_sessions = initial_data.get("today_sessions", 0)
            
            for stress_level in stress_levels:
                test_metrics = {
                    "speech_rate": 1.5,
                    "volume_variance": 0.3,
                    "pause_count": 2,
                    "stress_level": stress_level
                }
                
                response = self.session.post(
                    f"{self.base_url}/stress/analyze",
                    json=test_metrics,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") and data.get("stress_level") == stress_level:
                        print(f"✅ Stress level '{stress_level}' logged successfully")
                    else:
                        print(f"❌ Failed to log stress level '{stress_level}'")
                        return False
                else:
                    print(f"❌ HTTP error for stress level '{stress_level}': {response.status_code}")
                    return False
            
            # Check if only calm sessions incremented the streak
            final_response = self.session.get(f"{self.base_url}/streak/current")
            if final_response.status_code == 200:
                final_data = final_response.json()
                final_sessions = final_data.get("today_sessions", 0)
                
                # Should have incremented by 1 (only the calm session)
                if final_sessions == initial_sessions + 1:
                    print("✅ Only calm stress level incremented today's sessions")
                    return True
                else:
                    print(f"❌ Session count incorrect. Expected {initial_sessions + 1}, got {final_sessions}")
            else:
                print("❌ Could not get final streak data")
                
        except Exception as e:
            print(f"❌ Exception in stress level test: {str(e)}")
            
        return False

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("🚨 Testing Error Handling...")
        
        try:
            # Test updating non-existent task
            fake_id = str(uuid.uuid4())
            response = self.session.put(f"{self.base_url}/tasks/{fake_id}?status=completed")
            
            if response.status_code == 404:
                print("✅ Correctly returns 404 for non-existent task update")
            else:
                print(f"❌ Expected 404 for non-existent task, got {response.status_code}")
                return False
            
            # Test deleting non-existent task
            response = self.session.delete(f"{self.base_url}/tasks/{fake_id}")
            
            if response.status_code == 404:
                print("✅ Correctly returns 404 for non-existent task deletion")
            else:
                print(f"❌ Expected 404 for non-existent task deletion, got {response.status_code}")
                return False
            
            # Test creating task with missing required fields
            invalid_task = {"description": "Missing title"}
            response = self.session.post(
                f"{self.base_url}/tasks",
                json=invalid_task,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 422:  # FastAPI validation error
                print("✅ Correctly validates required fields")
                return True
            else:
                print(f"❌ Expected 422 for invalid task data, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ Exception in error handling test: {str(e)}")
            
        return False

    def test_task_types(self):
        """Test all task types work correctly"""
        print("📝 Testing Task Types...")
        
        task_types = ["note", "reminder", "calendar"]
        created_tasks = []
        
        try:
            for task_type in task_types:
                task_data = {
                    "title": f"Test {task_type} task",
                    "description": f"This is a {task_type} type task",
                    "type": task_type
                }
                
                response = self.session.post(
                    f"{self.base_url}/tasks",
                    json=task_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    task = response.json()
                    if task.get("type") == task_type:
                        print(f"✅ Task type '{task_type}' created successfully")
                        created_tasks.append(task["id"])
                    else:
                        print(f"❌ Task type mismatch for '{task_type}'")
                        return False
                else:
                    print(f"❌ Failed to create '{task_type}' task: HTTP {response.status_code}")
                    return False
            
            # Verify all tasks appear in the list
            response = self.session.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                tasks = response.json()
                for task_id in created_tasks:
                    if any(t["id"] == task_id for t in tasks):
                        continue
                    else:
                        print(f"❌ Created task {task_id} not found in task list")
                        return False
                
                print("✅ All task types appear in task list")
                return True
            else:
                print("❌ Could not retrieve task list for verification")
                
        except Exception as e:
            print(f"❌ Exception in task types test: {str(e)}")
            
        return False

    def run_extended_tests(self):
        """Run all extended tests"""
        print("🔬 Starting Extended Backend API Tests")
        print("=" * 50)
        
        tests = [
            ("Task Expiration Logic", self.test_task_expiration_logic),
            ("Stress Level Variations", self.test_stress_level_variations),
            ("Error Handling", self.test_error_handling),
            ("Task Types", self.test_task_types),
        ]
        
        results = []
        for test_name, test_func in tests:
            print(f"\n🧪 {test_name}")
            print("-" * 30)
            result = test_func()
            results.append(result)
            print()
        
        # Summary
        print("=" * 50)
        print("📊 EXTENDED TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(results)
        total = len(results)
        
        print(f"Extended Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        return passed, total

if __name__ == "__main__":
    tester = ExtendedAPITester()
    passed, total = tester.run_extended_tests()
    
    if passed == total:
        print(f"\n🎉 All extended tests passed! ({passed}/{total})")
    else:
        print(f"\n⚠️  Some extended tests failed. ({passed}/{total})")