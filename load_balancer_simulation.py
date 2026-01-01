import threading
import time
import random
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Server:
    def __init__(self, name, capacity=10):
        self.name = name
        self.capacity = capacity
        self.active_connections = 0
        self.lock = threading.Lock()

    def handle_request(self, request_id, processing_time):
        with self.lock:
            if self.active_connections >= self.capacity:
                logging.warning(f"Request {request_id} dropped by {self.name}: Server at capacity.")
                return False
            self.active_connections += 1

        try:
            load = (self.active_connections / self.capacity) * 100
            logging.info(f"Request {request_id} assigned to {self.name}. Load: {load:.2f}%")
            if load > 90:
                logging.warning(f"ALERT: {self.name} is approaching 100% CPU load!")

            time.sleep(processing_time)
        finally:
            with self.lock:
                self.active_connections -= 1
                logging.info(f"Request {request_id} completed on {self.name}.")
        return True

    @property
    def current_load(self):
        with self.lock:
            return self.active_connections

class LoadBalancer:
    def __init__(self, servers):
        self.servers = servers
        self.lock = threading.Lock()

    def get_least_busy_server(self):
        with self.lock:
            if not self.servers:
                return None
            return min(self.servers, key=lambda s: s.current_load)

    def route_request(self, request_id, processing_time):
        server = self.get_least_busy_server()
        if server:
            logging.info(f"Routing request {request_id} to {server.name}...")
            thread = threading.Thread(target=server.handle_request, args=(request_id, processing_time))
            thread.start()
            return thread
        else:
            logging.error(f"Request {request_id} dropped: No servers available.")
            return None

def main():
    # Create servers
    servers = [Server(f"Server-{i}") for i in range(1, 4)]

    # Create a load balancer
    load_balancer = LoadBalancer(servers)

    # Simulate 50 concurrent requests
    threads = []
    for i in range(50):
        processing_time = random.uniform(0.5, 3.0)
        thread = load_balancer.route_request(i + 1, processing_time)
        if thread:
            threads.append(thread)

    # Wait for all requests to complete
    for thread in threads:
        thread.join()

if __name__ == "__main__":
    main()
