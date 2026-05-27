import requests
from bs4 import BeautifulSoup
import socket


class Discover:

    def get_http_title(self, netloc:str, schema=None):
        if netloc.startswith("192.168.100.10"):
            print("")
        try:
            if schema is None:
                schema = 'http'
            url = f'{schema}://{netloc}'
            print(f"Consultando {url}")
            response = requests.get(url, timeout=10, verify=False)
            soup = BeautifulSoup(response.text, 'html.parser')
            if soup.title:
                title_text = soup.title.string
                return title_text
            return None
        except Exception as e:
            print(e)
            if schema != 'https':
                return self.get_http_title(netloc, 'https')
    

    def get_banner(self, ip, port) -> str:
        
        family = socket.AF_INET6 if ':' in ip else socket.AF_INET
        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((ip, port))
        try:
            banner = sock.recv(1024).decode(errors='ignore').strip()
            return banner
        #     while True:
        #         part = sock.recv(4096)
        #         if not part:
        #             break
        #         data.append(part.decode(errors='ignore'))
            
        except socket.timeout:
            # Esto ocurrirá cuando el servidor deje de enviar datos
            pass
        finally:
            sock.close()

