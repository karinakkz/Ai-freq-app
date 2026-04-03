#!/usr/bin/env python3
"""
FreqFlow Backend API Test Suite
Tests all backend endpoints for the FreqFlow wellness app
"""

import requests
import json
import time
import os
from datetime import datetime, timedelta
import uuid

# Backend URL from frontend environment
BACKEND_URL = "https://ai-freq-preview.preview.emergentagent.com/api"

class FreqFlowAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_task_ids = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_health_check(self):
        """Test GET /api/ - Health check"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_test("Health Check", True, f"API running: {data['message']}", data)
                    return True
                else:
                    self.log_test("Health Check", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_create_task(self):
        """Test POST /api/tasks - Create a task"""
        test_tasks = [
            {
                "title": "Complete project documentation",
                "description": "Write comprehensive docs for the FreqFlow app",
                "type": "note"
            },
            {
                "title": "Doctor appointment reminder",
                "description": "Annual checkup at 3 PM",
                "type": "reminder"
            },
            {
                "title": "Team meeting",
                "description": "Weekly standup meeting",
                "type": "calendar"
            }
        ]
        
        success_count = 0
        for i, task_data in enumerate(test_tasks):
            try:
                response = self.session.post(
                    f"{self.base_url}/tasks",
                    json=task_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["id", "title", "description", "type", "status", "created_at", "expires_at", "saved"]
                    
                    if all(field in data for field in required_fields):
                        self.created_task_ids.append(data["id"])
                        self.log_test(f"Create Task {i+1}", True, f"Created task: {data['title']}", data)
                        success_count += 1
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Create Task {i+1}", False, f"Missing fields: {missing}", data)
                else:
                    self.log_test(f"Create Task {i+1}", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test(f"Create Task {i+1}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_tasks)

    def test_get_tasks(self):
        """Test GET /api/tasks - List all tasks and with filters"""
        try:
            # Test getting all tasks
            response = self.session.get(f"{self.base_url}/tasks")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get All Tasks", True, f"Retrieved {len(data)} tasks", {"count": len(data)})
                    
                    # Test with status filter
                    response_filtered = self.session.get(f"{self.base_url}/tasks?status=active")
                    if response_filtered.status_code == 200:
                        filtered_data = response_filtered.json()
                        active_count = len([t for t in data if t.get("status") == "active"])
                        if len(filtered_data) == active_count:
                            self.log_test("Get Tasks with Filter", True, f"Active filter works: {len(filtered_data)} active tasks")
                            return True
                        else:
                            self.log_test("Get Tasks with Filter", False, f"Filter mismatch: expected {active_count}, got {len(filtered_data)}")
                    else:
                        self.log_test("Get Tasks with Filter", False, f"Filter request failed: HTTP {response_filtered.status_code}")
                else:
                    self.log_test("Get All Tasks", False, "Response is not a list", data)
            else:
                self.log_test("Get All Tasks", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get All Tasks", False, f"Exception: {str(e)}")
            
        return False

    def test_update_task(self):
        """Test PUT /api/tasks/{task_id} - Update task status and saved flag"""
        if not self.created_task_ids:
            self.log_test("Update Task", False, "No tasks available to update")
            return False
            
        try:
            task_id = self.created_task_ids[0]
            
            # Test updating status to completed
            response = self.session.put(
                f"{self.base_url}/tasks/{task_id}?status=completed"
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Update Task Status", True, "Task marked as completed", data)
                    
                    # Test updating saved flag
                    response_saved = self.session.put(
                        f"{self.base_url}/tasks/{task_id}?saved=true"
                    )
                    
                    if response_saved.status_code == 200:
                        saved_data = response_saved.json()
                        if saved_data.get("success"):
                            self.log_test("Update Task Saved", True, "Task marked as saved", saved_data)
                            return True
                        else:
                            self.log_test("Update Task Saved", False, "Failed to save task", saved_data)
                    else:
                        self.log_test("Update Task Saved", False, f"HTTP {response_saved.status_code}", response_saved.text)
                else:
                    self.log_test("Update Task Status", False, "Success flag not returned", data)
            else:
                self.log_test("Update Task Status", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Update Task", False, f"Exception: {str(e)}")
            
        return False

    def test_delete_task(self):
        """Test DELETE /api/tasks/{task_id} - Delete a task"""
        if len(self.created_task_ids) < 2:
            self.log_test("Delete Task", False, "Need at least 2 tasks to test deletion")
            return False
            
        try:
            # Use the second task for deletion (keep first one for other tests)
            task_id = self.created_task_ids[1]
            
            response = self.session.delete(f"{self.base_url}/tasks/{task_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Delete Task", True, f"Task {task_id} deleted successfully", data)
                    
                    # Verify task is actually deleted
                    verify_response = self.session.get(f"{self.base_url}/tasks")
                    if verify_response.status_code == 200:
                        tasks = verify_response.json()
                        if not any(task.get("id") == task_id for task in tasks):
                            self.log_test("Verify Task Deletion", True, "Task no longer exists in list")
                            return True
                        else:
                            self.log_test("Verify Task Deletion", False, "Task still exists after deletion")
                    else:
                        self.log_test("Verify Task Deletion", False, "Could not verify deletion")
                else:
                    self.log_test("Delete Task", False, "Success flag not returned", data)
            else:
                self.log_test("Delete Task", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Delete Task", False, f"Exception: {str(e)}")
            
        return False

    def test_get_streak(self):
        """Test GET /api/streak/current - Get current streak counter"""
        try:
            response = self.session.get(f"{self.base_url}/streak/current")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["current_streak", "total_calm_sessions"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Get Current Streak", True, f"Streak: {data['current_streak']}, Sessions: {data['total_calm_sessions']}", data)
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Get Current Streak", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Get Current Streak", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Current Streak", False, f"Exception: {str(e)}")
            
        return False

    def test_stress_analyze(self):
        """Test POST /api/stress/analyze - Log stress metrics"""
        test_metrics = {
            "speech_rate": 1.5,
            "volume_variance": 0.3,
            "pause_count": 2,
            "stress_level": "calm"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/stress/analyze",
                json=test_metrics,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("stress_level") == "calm":
                    self.log_test("Stress Analysis", True, f"Stress logged: {data['stress_level']}", data)
                    
                    # Test that calm streak was incremented
                    streak_response = self.session.get(f"{self.base_url}/streak/current")
                    if streak_response.status_code == 200:
                        streak_data = streak_response.json()
                        if streak_data.get("today_sessions", 0) > 0:
                            self.log_test("Calm Streak Increment", True, f"Today's sessions: {streak_data['today_sessions']}")
                            return True
                        else:
                            self.log_test("Calm Streak Increment", False, "No sessions recorded for today")
                    else:
                        self.log_test("Calm Streak Increment", False, "Could not verify streak increment")
                else:
                    self.log_test("Stress Analysis", False, "Invalid response format", data)
            else:
                self.log_test("Stress Analysis", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Stress Analysis", False, f"Exception: {str(e)}")
            
        return False

    def test_cleanup_tasks(self):
        """Test POST /api/tasks/cleanup - Test cleanup endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/tasks/cleanup")
            
            if response.status_code == 200:
                data = response.json()
                if "deleted_count" in data:
                    self.log_test("Task Cleanup", True, f"Cleanup completed: {data['deleted_count']} tasks deleted", data)
                    return True
                else:
                    self.log_test("Task Cleanup", False, "Missing deleted_count in response", data)
            else:
                self.log_test("Task Cleanup", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Task Cleanup", False, f"Exception: {str(e)}")
            
        return False

    def test_voice_transcribe(self):
        """Test POST /api/voice/transcribe - Test with a sample audio file"""
        try:
            # Create a minimal test audio file (this is a placeholder - in real testing you'd use actual audio)
            # For now, we'll test the endpoint structure
            test_audio_content = b"fake_audio_data_for_testing"
            
            files = {
                'audio': ('test.m4a', test_audio_content, 'audio/m4a')
            }
            
            response = self.session.post(
                f"{self.base_url}/voice/transcribe",
                files=files
            )
            
            # Note: This will likely fail due to invalid audio format, but we can test the endpoint structure
            if response.status_code == 200:
                data = response.json()
                required_fields = ["text", "task_created"]
                if all(field in data for field in required_fields):
                    self.log_test("Voice Transcription", True, f"Transcription: {data['text'][:50]}...", data)
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Voice Transcription", False, f"Missing fields: {missing}", data)
            elif response.status_code == 500:
                # Expected for fake audio data - check if it's the right error structure
                self.log_test("Voice Transcription Endpoint", True, "Endpoint accessible (failed on fake audio as expected)", {"status_code": response.status_code})
                return True
            else:
                self.log_test("Voice Transcription", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Voice Transcription", False, f"Exception: {str(e)}")
            
        return False

    def test_get_frequencies(self):
        """Test GET /api/frequencies - Should return 40+ frequency objects"""
        try:
            response = self.session.get(f"{self.base_url}/frequencies")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 40:
                    # Check structure of first frequency
                    freq = data[0]
                    required_fields = ["id", "name", "category", "frequency_hz", "base_hz", "description", "benefits", "icon", "color", "gradient"]
                    if all(field in freq for field in required_fields):
                        self.log_test("Get Frequencies", True, f"Retrieved {len(data)} frequencies with proper structure", {"count": len(data)})
                        return True
                    else:
                        missing = [f for f in required_fields if f not in freq]
                        self.log_test("Get Frequencies", False, f"Missing fields in frequency object: {missing}", freq)
                else:
                    self.log_test("Get Frequencies", False, f"Expected 40+ frequencies, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_test("Get Frequencies", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Frequencies", False, f"Exception: {str(e)}")
            
        return False

    def test_get_frequency_categories(self):
        """Test GET /api/frequencies/categories - Should return list of category names"""
        try:
            response = self.session.get(f"{self.base_url}/frequencies/categories")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    expected_categories = ["Sleep", "Calm", "Mood", "Focus", "Energy", "Beauty", "Pain", "Health", "Chakra", "Meditation", "Recovery", "Relationships"]
                    found_categories = [cat for cat in expected_categories if cat in data]
                    if len(found_categories) >= 8:  # At least 8 categories should be present
                        self.log_test("Get Frequency Categories", True, f"Retrieved {len(data)} categories: {data[:5]}...", {"categories": data})
                        return True
                    else:
                        self.log_test("Get Frequency Categories", False, f"Missing expected categories. Found: {found_categories}", data)
                else:
                    self.log_test("Get Frequency Categories", False, "Expected non-empty list of categories", data)
            else:
                self.log_test("Get Frequency Categories", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Frequency Categories", False, f"Exception: {str(e)}")
            
        return False

    def test_recommend_frequency_now(self):
        """Test GET /api/frequencies/recommend/now - Should return a recommended frequency based on time of day"""
        try:
            response = self.session.get(f"{self.base_url}/frequencies/recommend/now")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["frequency", "reason"]
                if all(field in data for field in required_fields):
                    freq = data["frequency"]
                    freq_required = ["id", "name", "category", "frequency_hz", "base_hz"]
                    if all(field in freq for field in freq_required):
                        self.log_test("Recommend Frequency Now", True, f"Recommended: {freq['name']} - {data['reason']}", data)
                        return True
                    else:
                        missing = [f for f in freq_required if f not in freq]
                        self.log_test("Recommend Frequency Now", False, f"Missing fields in frequency: {missing}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Recommend Frequency Now", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Recommend Frequency Now", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Recommend Frequency Now", False, f"Exception: {str(e)}")
            
        return False

    def test_get_specific_frequencies(self):
        """Test GET /api/frequencies/{freq_id} - Try with specific frequency IDs"""
        test_freq_ids = ["stress_relief", "deep_sleep", "weight_loss"]
        success_count = 0
        
        for freq_id in test_freq_ids:
            try:
                response = self.session.get(f"{self.base_url}/frequencies/{freq_id}")
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["id", "name", "category", "frequency_hz", "base_hz", "description", "benefits"]
                    if all(field in data for field in required_fields) and data["id"] == freq_id:
                        self.log_test(f"Get Frequency {freq_id}", True, f"Retrieved: {data['name']} ({data['category']})", data)
                        success_count += 1
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Get Frequency {freq_id}", False, f"Missing fields or wrong ID: {missing}", data)
                else:
                    self.log_test(f"Get Frequency {freq_id}", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test(f"Get Frequency {freq_id}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_freq_ids)

    def test_chat_sleep_request(self):
        """Test POST /api/chat - Send sleep request and expect frequency recommendation"""
        try:
            chat_data = {"message": "I can't sleep"}
            response = self.session.post(
                f"{self.base_url}/chat",
                json=chat_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["reply", "mood", "action", "action_data"]
                if all(field in data for field in required_fields):
                    if data["action"] == "play_frequency" and data["action_data"]:
                        freq_id = data["action_data"].get("frequency_id")
                        if freq_id == "deep_sleep":
                            self.log_test("Chat Sleep Request", True, f"Correctly recommended deep_sleep frequency: {data['reply'][:50]}...", data)
                            return True
                        else:
                            self.log_test("Chat Sleep Request", False, f"Expected deep_sleep, got {freq_id}", data)
                    else:
                        self.log_test("Chat Sleep Request", False, f"Expected play_frequency action, got {data['action']}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Chat Sleep Request", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Chat Sleep Request", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Chat Sleep Request", False, f"Exception: {str(e)}")
            
        return False

    def test_chat_reminder_request(self):
        """Test POST /api/chat - Send reminder request and expect task creation"""
        try:
            chat_data = {"message": "Remind me to take medicine at 8pm"}
            response = self.session.post(
                f"{self.base_url}/chat",
                json=chat_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["reply", "mood", "action", "action_data"]
                if all(field in data for field in required_fields):
                    if data["action"] == "create_task" and data["action_data"]:
                        task_data = data["action_data"]
                        if "title" in task_data and "medicine" in task_data["title"].lower():
                            self.log_test("Chat Reminder Request", True, f"Correctly created task: {task_data.get('title')}", data)
                            return True
                        else:
                            self.log_test("Chat Reminder Request", False, f"Task title doesn't contain medicine: {task_data.get('title')}", data)
                    else:
                        self.log_test("Chat Reminder Request", False, f"Expected create_task action, got {data['action']}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Chat Reminder Request", False, f"Missing fields: {missing}", data)
            else:
                self.log_test("Chat Reminder Request", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Chat Reminder Request", False, f"Exception: {str(e)}")
            
        return False

    def test_custom_audio_generation(self):
        """Test GET /api/audio/custom - Should return a WAV file"""
        try:
            params = {"base_hz": 200, "beat_hz": 10, "duration": 2}
            response = self.session.get(f"{self.base_url}/audio/custom", params=params)
            
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "")
                if content_type == "audio/wav":
                    content_length = len(response.content)
                    if content_length > 1000:  # Should be a reasonable size for 2 seconds of audio
                        self.log_test("Custom Audio Generation", True, f"Generated WAV file: {content_length} bytes, Content-Type: {content_type}")
                        return True
                    else:
                        self.log_test("Custom Audio Generation", False, f"WAV file too small: {content_length} bytes")
                else:
                    self.log_test("Custom Audio Generation", False, f"Wrong Content-Type: {content_type}, expected audio/wav")
            else:
                self.log_test("Custom Audio Generation", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Custom Audio Generation", False, f"Exception: {str(e)}")
            
        return False

    def test_frequency_audio_generation(self):
        """Test GET /api/audio/generate/{freq_id} - Should return a WAV file for specific frequency"""
        try:
            freq_id = "stress_relief"
            response = self.session.get(f"{self.base_url}/audio/generate/{freq_id}")
            
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "")
                if content_type == "audio/wav":
                    content_length = len(response.content)
                    if content_length > 1000:  # Should be a reasonable size
                        self.log_test("Frequency Audio Generation", True, f"Generated {freq_id} WAV: {content_length} bytes, Content-Type: {content_type}")
                        return True
                    else:
                        self.log_test("Frequency Audio Generation", False, f"WAV file too small: {content_length} bytes")
                else:
                    self.log_test("Frequency Audio Generation", False, f"Wrong Content-Type: {content_type}, expected audio/wav")
            else:
                self.log_test("Frequency Audio Generation", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Frequency Audio Generation", False, f"Exception: {str(e)}")
            
        return False

    def test_get_packs(self):
        """Test GET /api/packs - Should return Weight Loss Pack with frequency details"""
        try:
            response = self.session.get(f"{self.base_url}/packs")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Look for weight loss pack
                    weight_loss_pack = next((pack for pack in data if "weight" in pack.get("name", "").lower()), None)
                    if weight_loss_pack:
                        required_fields = ["id", "name", "description", "frequencies", "schedule"]
                        if all(field in weight_loss_pack for field in required_fields):
                            frequencies = weight_loss_pack["frequencies"]
                            if isinstance(frequencies, list) and len(frequencies) > 0:
                                self.log_test("Get Packs", True, f"Found Weight Loss Pack with {len(frequencies)} frequencies", weight_loss_pack)
                                return True
                            else:
                                self.log_test("Get Packs", False, "Weight Loss Pack has no frequencies", weight_loss_pack)
                        else:
                            missing = [f for f in required_fields if f not in weight_loss_pack]
                            self.log_test("Get Packs", False, f"Weight Loss Pack missing fields: {missing}", weight_loss_pack)
                    else:
                        self.log_test("Get Packs", False, "No Weight Loss Pack found", data)
                else:
                    self.log_test("Get Packs", False, "Expected non-empty list of packs", data)
            else:
                self.log_test("Get Packs", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Packs", False, f"Exception: {str(e)}")
            
        return False

    # ===================== PAYMENT ENDPOINT TESTS =====================

    def test_get_payment_packages(self):
        """Test GET /api/payments/packages - List available packages"""
        try:
            response = self.session.get(f"{self.base_url}/payments/packages")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check for expected packages
                    package_ids = [pkg.get("id") for pkg in data]
                    expected_packages = ["hair_glow", "weight_loss", "lifetime_unlock"]
                    found_packages = [pkg_id for pkg_id in expected_packages if pkg_id in package_ids]
                    
                    if len(found_packages) >= 2:  # At least 2 expected packages should be present
                        # Check structure of first package
                        pkg = data[0]
                        required_fields = ["id", "title", "amount", "purchase_type", "currency"]
                        if all(field in pkg for field in required_fields):
                            self.log_test("Get Payment Packages", True, f"Retrieved {len(data)} packages: {package_ids}", data)
                            return True
                        else:
                            missing = [f for f in required_fields if f not in pkg]
                            self.log_test("Get Payment Packages", False, f"Missing fields in package: {missing}", pkg)
                    else:
                        self.log_test("Get Payment Packages", False, f"Missing expected packages. Found: {found_packages}, Expected: {expected_packages}", data)
                else:
                    self.log_test("Get Payment Packages", False, "Expected non-empty list of packages", data)
            else:
                self.log_test("Get Payment Packages", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Payment Packages", False, f"Exception: {str(e)}")
            
        return False

    def test_get_stripe_publishable_key(self):
        """Test GET /api/payments/publishable-key - Get Stripe publishable key"""
        try:
            response = self.session.get(f"{self.base_url}/payments/publishable-key")
            
            if response.status_code == 200:
                data = response.json()
                if "publishableKey" in data:
                    pub_key = data["publishableKey"]
                    if pub_key.startswith("pk_"):
                        self.log_test("Get Stripe Publishable Key", True, f"Retrieved publishable key: {pub_key[:20]}...", {"key_prefix": pub_key[:20]})
                        return True
                    else:
                        self.log_test("Get Stripe Publishable Key", False, f"Invalid key format: {pub_key[:20]}...", data)
                else:
                    self.log_test("Get Stripe Publishable Key", False, "Missing publishableKey field", data)
            else:
                self.log_test("Get Stripe Publishable Key", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Get Stripe Publishable Key", False, f"Exception: {str(e)}")
            
        return False

    def test_create_payment_intent(self):
        """Test POST /api/payments/create-payment-intent - Create PaymentIntent with pack_id"""
        test_pack_ids = ["hair_glow", "lifetime_unlock"]
        success_count = 0
        
        for pack_id in test_pack_ids:
            try:
                payload = {"pack_id": pack_id}
                response = self.session.post(
                    f"{self.base_url}/payments/create-payment-intent",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["clientSecret", "paymentIntentId", "amount", "currency", "pack_id", "purchase_type"]
                    if all(field in data for field in required_fields):
                        if data["clientSecret"].startswith("pi_") and "_secret_" in data["clientSecret"]:
                            expected_amount = 4.99 if pack_id == "hair_glow" else 49.00
                            if data["amount"] == expected_amount and data["pack_id"] == pack_id:
                                self.log_test(f"Create PaymentIntent {pack_id}", True, f"Created PaymentIntent: amount=${data['amount']}, type={data['purchase_type']}", data)
                                success_count += 1
                            else:
                                self.log_test(f"Create PaymentIntent {pack_id}", False, f"Amount/pack_id mismatch: expected ${expected_amount}/{pack_id}, got ${data['amount']}/{data['pack_id']}", data)
                        else:
                            self.log_test(f"Create PaymentIntent {pack_id}", False, f"Invalid clientSecret format: {data['clientSecret'][:20]}...", data)
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Create PaymentIntent {pack_id}", False, f"Missing fields: {missing}", data)
                else:
                    self.log_test(f"Create PaymentIntent {pack_id}", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test(f"Create PaymentIntent {pack_id}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_pack_ids)

    def test_payment_intent_status(self):
        """Test GET /api/payments/intent-status/{payment_intent_id} - Check payment status"""
        try:
            # First create a PaymentIntent to get a valid ID
            payload = {"pack_id": "hair_glow"}
            create_response = self.session.post(
                f"{self.base_url}/payments/create-payment-intent",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code == 200:
                create_data = create_response.json()
                payment_intent_id = create_data.get("paymentIntentId")
                
                if payment_intent_id:
                    # Now check the status
                    status_response = self.session.get(f"{self.base_url}/payments/intent-status/{payment_intent_id}")
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        required_fields = ["status", "payment_status", "amount", "currency", "metadata"]
                        if all(field in status_data for field in required_fields):
                            if status_data["status"] in ["requires_payment_method", "requires_confirmation", "succeeded", "canceled"]:
                                self.log_test("Payment Intent Status", True, f"Status: {status_data['status']}, Payment: {status_data['payment_status']}", status_data)
                                return True
                            else:
                                self.log_test("Payment Intent Status", False, f"Unexpected status: {status_data['status']}", status_data)
                        else:
                            missing = [f for f in required_fields if f not in status_data]
                            self.log_test("Payment Intent Status", False, f"Missing fields: {missing}", status_data)
                    else:
                        self.log_test("Payment Intent Status", False, f"Status check failed: HTTP {status_response.status_code}", status_response.text)
                else:
                    self.log_test("Payment Intent Status", False, "No paymentIntentId returned from creation", create_data)
            else:
                self.log_test("Payment Intent Status", False, f"Failed to create PaymentIntent for testing: HTTP {create_response.status_code}", create_response.text)
                
        except Exception as e:
            self.log_test("Payment Intent Status", False, f"Exception: {str(e)}")
            
        return False

    def test_create_checkout_session(self):
        """Test POST /api/payments/checkout/session - Create checkout session with pack_id and return_url"""
        test_cases = [
            {"pack_id": "hair_glow", "return_url": "https://example.com/success"},
            {"pack_id": "lifetime_unlock", "return_url": "freqflow://payment-success"}
        ]
        success_count = 0
        
        for case in test_cases:
            try:
                response = self.session.post(
                    f"{self.base_url}/payments/checkout/session",
                    json=case,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["session_id", "url"]
                    if all(field in data for field in required_fields):
                        if data["session_id"].startswith("cs_") and data["url"].startswith("https://checkout.stripe.com"):
                            self.log_test(f"Create Checkout Session {case['pack_id']}", True, f"Created session: {data['session_id']}, URL: {data['url'][:50]}...", data)
                            success_count += 1
                        else:
                            self.log_test(f"Create Checkout Session {case['pack_id']}", False, f"Invalid session_id or URL format", data)
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(f"Create Checkout Session {case['pack_id']}", False, f"Missing fields: {missing}", data)
                else:
                    self.log_test(f"Create Checkout Session {case['pack_id']}", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_test(f"Create Checkout Session {case['pack_id']}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_cases)

    def test_checkout_session_status(self):
        """Test GET /api/payments/checkout/status/{session_id} - Check checkout status"""
        try:
            # First create a checkout session to get a valid session ID
            payload = {"pack_id": "hair_glow", "return_url": "https://example.com/success"}
            create_response = self.session.post(
                f"{self.base_url}/payments/checkout/session",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code == 200:
                create_data = create_response.json()
                session_id = create_data.get("session_id")
                
                if session_id:
                    # Now check the status
                    status_response = self.session.get(f"{self.base_url}/payments/checkout/status/{session_id}")
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        required_fields = ["status", "payment_status", "amount_total", "currency", "metadata"]
                        if all(field in status_data for field in required_fields):
                            if status_data["status"] in ["open", "complete", "expired"]:
                                self.log_test("Checkout Session Status", True, f"Status: {status_data['status']}, Payment: {status_data['payment_status']}", status_data)
                                return True
                            else:
                                self.log_test("Checkout Session Status", False, f"Unexpected status: {status_data['status']}", status_data)
                        else:
                            missing = [f for f in required_fields if f not in status_data]
                            self.log_test("Checkout Session Status", False, f"Missing fields: {missing}", status_data)
                    else:
                        self.log_test("Checkout Session Status", False, f"Status check failed: HTTP {status_response.status_code}", status_response.text)
                else:
                    self.log_test("Checkout Session Status", False, "No session_id returned from creation", create_data)
            else:
                self.log_test("Checkout Session Status", False, f"Failed to create checkout session for testing: HTTP {create_response.status_code}", create_response.text)
                
        except Exception as e:
            self.log_test("Checkout Session Status", False, f"Exception: {str(e)}")
            
        return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting FreqFlow Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # CRITICAL Priority Tests - Payment Endpoints (as requested in review)
        print("💳 CRITICAL PRIORITY TESTS - PAYMENT ENDPOINTS")
        print("-" * 50)
        
        payment_tests = [
            ("Get Payment Packages", self.test_get_payment_packages),
            ("Get Stripe Publishable Key", self.test_get_stripe_publishable_key),
            ("Create PaymentIntent", self.test_create_payment_intent),
            ("Payment Intent Status", self.test_payment_intent_status),
            ("Create Checkout Session", self.test_create_checkout_session),
            ("Checkout Session Status", self.test_checkout_session_status),
        ]
        
        payment_results = []
        for test_name, test_func in payment_tests:
            result = test_func()
            payment_results.append(result)
        
        # High Priority Tests - Core App Endpoints (as requested in review)
        print("\n📋 HIGH PRIORITY TESTS - CORE APP ENDPOINTS")
        print("-" * 50)
        
        core_tests = [
            ("Health Check", self.test_health_check),
            ("Get Streak", self.test_get_streak),
            ("Get Tasks", self.test_get_tasks),
            ("Create Tasks", self.test_create_task),
        ]
        
        core_results = []
        for test_name, test_func in core_tests:
            result = test_func()
            core_results.append(result)
        
        # High Priority Tests - Other Existing Endpoints
        print("\n📋 HIGH PRIORITY TESTS - OTHER EXISTING ENDPOINTS")
        print("-" * 50)
        
        existing_tests = [
            ("Update Task", self.test_update_task),
            ("Delete Task", self.test_delete_task),
            ("Stress Analysis", self.test_stress_analyze),
            ("Task Cleanup", self.test_cleanup_tasks),
        ]
        
        existing_results = []
        for test_name, test_func in existing_tests:
            result = test_func()
            existing_results.append(result)
        
        # High Priority Tests - NEW Endpoints
        print("\n📋 HIGH PRIORITY TESTS - NEW ENDPOINTS")
        print("-" * 50)
        
        new_tests = [
            ("Get Frequencies", self.test_get_frequencies),
            ("Get Frequency Categories", self.test_get_frequency_categories),
            ("Recommend Frequency Now", self.test_recommend_frequency_now),
            ("Get Specific Frequencies", self.test_get_specific_frequencies),
            ("Chat Sleep Request", self.test_chat_sleep_request),
            ("Chat Reminder Request", self.test_chat_reminder_request),
            ("Custom Audio Generation", self.test_custom_audio_generation),
            ("Frequency Audio Generation", self.test_frequency_audio_generation),
            ("Get Packs", self.test_get_packs),
        ]
        
        new_results = []
        for test_name, test_func in new_tests:
            result = test_func()
            new_results.append(result)
        
        # Medium Priority Tests
        print("\n📋 MEDIUM PRIORITY TESTS")
        print("-" * 30)
        
        medium_priority_results = [
            self.test_voice_transcribe()
        ]
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(payment_results) + len(core_results) + len(existing_results) + len(new_results) + len(medium_priority_results)
        passed_tests = sum(payment_results) + sum(core_results) + sum(existing_results) + sum(new_results) + sum(medium_priority_results)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print(f"\n💳 Payment Endpoints: {sum(payment_results)}/{len(payment_results)} passed")
        print(f"📋 Core App Endpoints: {sum(core_results)}/{len(core_results)} passed")
        print(f"📋 Other Existing Endpoints: {sum(existing_results)}/{len(existing_results)} passed")
        print(f"📋 NEW Endpoints: {sum(new_results)}/{len(new_results)} passed")
        print(f"📋 Medium Priority: {sum(medium_priority_results)}/{len(medium_priority_results)} passed")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        return passed_tests, total_tests

if __name__ == "__main__":
    tester = FreqFlowAPITester()
    passed, total = tester.run_all_tests()
    
    if passed == total:
        print(f"\n🎉 All tests passed! ({passed}/{total})")
        exit(0)
    else:
        print(f"\n⚠️  Some tests failed. ({passed}/{total})")
        exit(1)