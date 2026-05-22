from fastapi import FastAPI,APIRouter
from fastapi.middleware.cors import CORSMiddleware
from API.routes import services, projects, hosts, credentials

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()
api_router.include_router(services.router)
api_router.include_router(projects.router)
api_router.include_router(hosts.router)
api_router.include_router(credentials.router)

app.include_router(api_router, prefix="/api")



# import os
# import xml.etree.ElementTree as ET
# from flask import Flask, request, jsonify, make_response
# from db.data import NexusMapperDB

# app = Flask(__name__)
# DB_FILE = "nmap_vulns.db"

# db = NexusMapperDB("postgresql://postgres:3A9eQAHluSe7@10.0.0.253:5432/nmaphelix")
# SSL_PORTS = [443, 8443]
# HTTP_PORTS = [8080, 8081, 8082, 8000, 8180, 80]

# @app.after_request
# def add_cors_headers(response):
#     """Añade cabeceras CORS para permitir la interacción segura con el front-end AngularJS."""
#     response.headers["Access-Control-Allow-Origin"] = "*"
#     response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
#     response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
#     return response

# @app.route("/api/demo", methods=["GET", "OPTIONS"])
# def get_demo():
#     return make_response(jsonify({"status": "preflight-ok"}), 200)
    

# @app.route("/api/parse/<project_id>", methods=["POST", "OPTIONS"])
# def parse_xml(project_id):
#     if request.method == "OPTIONS":
#         return make_response(jsonify({"status": "preflight-ok"}), 200)
#     xml_data = ""
#     if request.files and "file" in request.files:
#         xml_data = request.files["file"].read().decode("utf-8")
#     elif request.json and "xml" in request.json:
#         xml_data = request.json["xml"]
#     else:
#         return jsonify({"error": "No se proporcionó información XML."}), 400

#     db.process_nmap_xml(int(project_id), xml_data)
#     return make_response(jsonify({"status":"Imported success"}), 200)

# @app.route('/api/data/<project_id>')
# def get_project_data(project_id:int):
    
#     data = db.get_project_data(project_id)
#     for item in data:
#         schema = ''
#         if int(item["port"]) in HTTP_PORTS:
#             schema='http'
#         elif int(item["port"]) in SSL_PORTS:
#             schema='https'
        
#         if schema:
#             url = f'{schema}://{item["ip"]}:{item["port"]}'
#             item["url"] = url

#     return make_response(jsonify(data),200)

# @app.route('/api/services/<project_id>', methods=['GET'])
# def get_services(project_id:int):
#     services = db.get_services(project_id)
#     return make_response(jsonify(services),200)

# @app.route('/api/project', methods=['POST'])
# def create_project():
#     params = request.json
    
#     if "name" in params:
#         project_id = db.create_project(params["name"])
#         return make_response(jsonify({"project_id": project_id}), 200)
#     else:
#         return make_response(jsonify({"status": "name not in params"}), 404)

# @app.route('/api/projects', methods=['GET'])
# def get_projects():
#     projects = db.get_projects()
#     return make_response(jsonify(projects), 200)


# @app.route('/api/ports/update/<port_id>', methods=['POST'])
# def updateport(port_id:int):
#     fields = {}
#     db.update_port(port_id, request.json)
#     return make_response(jsonify({"status": "OK"}), 200)




# if __name__ == "__main__":
    
#     print("----------------------------------------------------------------")
#     print("Servidor Backend de NMAPHelix Iniciado Correctamente.")
#     print("Escuchando de manera segura en http://127.0.0.1:5000")
#     print("----------------------------------------------------------------")
#     app.run(host="127.0.0.1", port=5000, debug=True)