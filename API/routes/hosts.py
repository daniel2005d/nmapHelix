from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from API.db.data import NexusMapperDB
from API.models.servicesModel import HostsResponse
from API.models.requestsModel import UpdateRequest

router = APIRouter(prefix="/hosts", tags=["hosts"])

db = NexusMapperDB()

@router.get('/{project_id}', response_model=List[HostsResponse])
async def get_hosts(project_id:int):
    hosts = db.get_hosts(project_id)
    return hosts

@router.post('/update')
async def update(model:UpdateRequest):
    db.update_host(model.id, {model.name:model.value})
    return {"status":f"Actualizado con exito {model.id}"}