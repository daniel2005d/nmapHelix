from pydantic import BaseModel
from typing import Optional

class ServiceResponse(BaseModel):
    ip: str
    port:int
    service_name: Optional[str] = None
    protocol: str
    port_id:int
    discovered:bool
    product_version: Optional[str] = None

    class Config:
        from_attributes = True 

class SummaryResponse(BaseModel):
    service_name: str
    port: int
    count: int
    
    class Config:
        from_attributes = True 

class ProductSummaryResponse(BaseModel):
    product_version: str
    count: int
    
    class Config:
        from_attributes = True 

class ProjectsResponse(BaseModel):
    name: str
    id: int
    
    class Config:
        from_attributes = True 

class HostsResponse(BaseModel):
    id: int
    hostname: Optional[str]
    os_name: Optional[str]
    ip_address: str
    
    
    class Config:
        from_attributes = True 


class CredentialsResponse(BaseModel):
    id: int
    ip_address: str
    port_number: int
    service_name:Optional[str]
    product_version:Optional[str]
    username: str
    password: str
    hash: Optional[str]
    role: str
    type: str
    
    
    class Config:
        from_attributes = True 