import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, UniqueConstraint, func, Boolean, Text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, scoped_session
from sqlalchemy.dialects.postgresql import insert
import xml.etree.ElementTree as ET

Base = declarative_base()

# --- Definición de Modelos ---
class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    hosts = relationship("Host", back_populates="project", cascade="all, delete-orphan")

class Host(Base):
    __tablename__ = 'hosts'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'))
    ip_address = Column(String, unique=True, nullable=False)
    hostname = Column(String)
    os_name = Column(String, nullable=True)
    os_family = Column(String, nullable=True)
    status = Column(String)
    project = relationship("Project", back_populates="hosts")
    ports = relationship("Port", back_populates="host", cascade="all, delete-orphan")

class Port(Base):
    __tablename__ = 'ports'
    id = Column(Integer, primary_key=True)
    host_id = Column(Integer, ForeignKey('hosts.id'))
    port_number = Column(Integer)
    protocol = Column(String)
    service_name = Column(String)
    product_version = Column(String)
    discovered = Column(Boolean)
    notes = Column(String)
    commands = Column(Text)
    banner = Column(Text)
    __table_args__ = (UniqueConstraint('host_id', 'port_number', name='_host_port_uc'),)
    host = relationship("Host", back_populates="ports")

class Credential(Base):
    __tablename__ = 'credentials'
    id = Column(Integer, primary_key=True)
    port_id = Column(Integer, ForeignKey('ports.id'))
    username = Column(String)
    password = Column(String)
    hash = Column(String)
    role = Column(String)
    type = Column(String)
    __table_args__ = (UniqueConstraint('username', 'password','port_id', name='uq_credential'),)
    #ports = relationship("Port", back_populates="credentials")

# --- Gestor de Base de Datos ---
class NexusMapperDB:
    def __init__(self, db_url = None):
        load_dotenv()
        db_url = os.getenv("CONNECTION_STRING")
        
        self.engine = create_engine(db_url)

        self.Session = scoped_session(sessionmaker(bind=self.engine))
        Base.metadata.create_all(self.engine)

    
    def process_nmap_xml(self, project_id, xml_content):
        session = self.Session()
        root = ET.fromstring(xml_content)
        
        for host_el in root.findall('host'):
            if host_el.find('status').get('state') != 'up': continue
            
            addr = host_el.find('address').get('addr')
            hostname = host_el.findtext('hostnames/hostname', default=None)
            
            
            # Upsert de Host
            host = session.query(Host).filter_by(ip_address=addr).first()
            if not host:
                host = Host(project_id=project_id, ip_address=addr, hostname=hostname, status='up')
                session.add(host)
            elif host.hostname is None:
                host.hostname = hostname
            
            session.flush() # Para obtener el host.id
            
            # Procesar puertos
            for port_el in host_el.findall('.//port'):
                pid = int(port_el.get('portid'))
                proto = port_el.get('protocol')
                svc = port_el.find('service')
                svc_name = svc.get('name') if svc is not None else None
                product = svc.get('product') if svc is not None else None
                if product:
                    product += " " + svc.get('version', '') if svc is not None else None
                # Upsert de Port
                port = session.query(Port).filter_by(host_id=host.id, port_number=pid).first()
                if not port:
                    port = Port(host_id=host.id, port_number=pid, protocol=proto, service_name=svc_name, product_version=product, discovered=False)
                    
                    session.add(port)
                else:
                    if port.service_name is None:
                        port.service_name = svc_name
                    if  port.product_version is None:
                        port.product_version = product
        
        session.commit()
        session.close()

    ### Proyectos ####
    def create_project(self, name, description=""):
        session = self.Session()
        # Normalizar el nombre a minúsculas para la búsqueda
        name_lower = name.lower()
        # Intentar buscar un proyecto existente con ese nombre (case-insensitive)
        existing_project = session.query(Project).filter(
            Project.name.ilike(name_lower)
        ).first()
        
        if existing_project:
            pid = existing_project.id
            session.close()
            return pid
            
        # Si no existe, crear uno nuevo
        new_project = Project(name=name, description=description)
        session.add(new_project)
        session.commit()
        pid = new_project.id
        session.close()
        return pid

    def get_poject_information(self, id):
        session = self.Session()
        project = session.query(Project).filter(Project.id == id).first()
        data = {"name":project.name, "description": project.description , "id": project.id }
        return data
    
    def get_projects(self):
        session = self.Session()
        results = session.query(Project)
        data = [{"name": p.name, "id":p.id} for p in results]
        session.close()
        return data

    ### Fin de Proyectos ####


    def get_project_data(self, project_id):
        session = self.Session()
        results = session.query(Host, Port).join(Port).filter(Host.id == Port.host_id, Host.project_id==project_id).all()
        # Transformar a formato diccionario compatible con el frontend
        data = [{
            "ip": h.ip_address, 
            "port": p.port_number,
            "service_name": p.service_name, 
            "protocol":p.protocol,
            "port_id":p.id,
            "discovered":p.discovered,
            "commands": p.commands,
            "banner": p.banner[:150] if p.banner else '',
            "product_version":p.product_version} for h, p in results]
        
        session.close()
        return data
    
    def get_find_services(self, project_id:int):
        session = self.Session()
        query = session.query(Port.service_name, func.count(Port.id).label("count")). \
            join(Host, Host.id == Port.host_id). \
                filter(Host.project_id==project_id, 
                       Port.service_name!='null',
                       Port.service_name!='tcpwrapped') \
                       .group_by(Port.service_name).order_by(func.count(Port.id).desc()).all()
        
                       
        data = [row._asdict()  for row in query]
        session.close()
        return data
    
    def get_services(self, project_id:int):
        session = self.Session()
        results = session.query(Port.service_name, Port.port_number, func.count(Port.port_number).label("count")). \
            join(Host, Host.id == Port.host_id). \
            filter(Host.project_id==project_id, 
            Port.service_name != 'tcpwrapped') \
            .group_by(Port.service_name, Port.port_number).all()
        
        data = [{"service_name":p.service_name,"port":p.port_number, "count":p.count} for p in results]
        session.close()
        return data
    
    def get_port(self, port_id:int):
        session = self.Session()
        try:
            results = session.query(Port, Host.ip_address.label("ip_address")). \
                        join(Host, Host.id == Port.host_id). \
                        filter(Port.id == port_id) .first()
            return results
        finally:
            session.close()

    
    def get_http_services(self, project_id:int):
        session = self.Session()
        query = session.query(Port.id, Port.port_number, Host.ip_address). \
            join(Host, Host.id == Port.host_id). \
            filter(Host.project_id==project_id, Port.service_name.in_(['http','https','httpd','http-proxy','https-alt']))
        
        data = [row._asdict()  for row in query]
        return data
        
    
    def get_product_summary(self, project_id:int):
        session = self.Session()
        results = session.query(Port.product_version, func.count(Host.ip_address).label("count")).join(Host) \
        .filter(Host.id == Port.host_id, Host.project_id==project_id, Port.service_name != 'tcpwrapped', Port.product_version != 'null') \
        .group_by(Port.product_version).order_by(func.count(Host.ip_address).desc()).all()

        data = [{"product_version":p.product_version, "count":p.count} for p in results]
        session.close()
        return data

    def add_command(self, port_id:int, command:str):
        if command:
            session = self.Session()
            query = session.query(Port).filter(Port.id == port_id).first()
            

            if query.commands:
                query.commands = f'\r{command}'
            else:
                query.commands = command
            
            session.commit()
            session.close()

    def update_port(self, port_id:int, fields):
        session = self.Session()
        port = session.query(Port).filter_by(id=port_id).first()

        for key, value in fields.items():
            if hasattr(port, key):
                setattr(port, key, value)
        
        session.commit()
        session.close()
    
    # def update_banner(self, port_id:int, banner:str):
    #     session = self.Session()
    #     port = session.query(Port).filter_by(id=port_id).first()
    #     if banner:
    #         port.banner = banner
        
    #     session.commit()
    #     session.close()


###### Hosts #####
    def get_hosts(self, project_id:int):
        session = self.Session()
        query = session.query(Host).filter(Host.project_id==project_id).all()
        data = [{"hostname":h.hostname, "os_name":h.os_name, "id":h.id,"ip_address":h.ip_address} for h in query]
        session.close()
        return data
    
    def update_host(self, host_id:int, fields):
        session = self.Session()
        host = session.query(Host).filter_by(id=host_id).first()

        for key, value in fields.items():
            if hasattr(host, key):
                setattr(host, key, value)
        
        session.commit()
        session.close()


###############


######Credentials#####
    def create_credential(self,credential:Credential):
        session = self.Session()
        query = session.query(Credential).filter(Credential.port_id == credential.port_id, 
                                                 Credential.username == credential.username, 
                                                 Credential.password == credential.password,
                                                 Credential.role == credential.role).first()
        if not query:
            session.add(credential)
            session.commit()
        
        session.close()
    
    def get_credentials(self, project_id:int):
        session = self.Session()
        query = session.query(Host.ip_address, 
                                Port.port_number, 
                                Port.service_name,
                                Port.product_version,
                                Credential.id,Credential.username,Credential.password,Credential.hash,Credential.role,Credential.type) \
                                .join(Port, Host.id == Port.host_id) \
                                .join(Credential, Credential.port_id == Port.id) \
                                .filter(Host.project_id == project_id).all()
        data = [row._asdict()  for row in query]
        session.close()
        return data

### End 
# Port.port_number, Port.service_name
