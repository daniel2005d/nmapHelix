from fastapi import APIRouter
from typing import List
from API.db.data import NexusMapperDB, Credential
from API.models.requestsModel import CredentialRequest
from API.models.servicesModel import CredentialsResponse


db = NexusMapperDB()

router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.post('/create')
async def create(model:CredentialRequest):
    for port in model.ports:
        db.create_credential(Credential(username=model.username, 
                                        password=model.password, 
                                        hash=model.hash, 
                                        type=model.type,
                                        role=model.role, 
                                        port_id=port))
    
    return {"status": "OK"}

@router.get('/{project_id}', response_model=List[CredentialsResponse])
async def get_credentials(project_id:int):
    return db.get_credentials(project_id)


