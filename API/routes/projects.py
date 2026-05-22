from fastapi import APIRouter
from typing import List
from API.db.data import NexusMapperDB
from API.models.servicesModel import ProjectsResponse
from API.models.requestsModel import ProjectRequest

db = NexusMapperDB()

router = APIRouter(prefix="/projects", tags=["services"])

@router.get('/', response_model=List[ProjectsResponse])
async def get_pojects():
    projects = db.get_projects()
    return projects

@router.post('/create')
async def create_project(model:ProjectRequest):
    project_id = db.create_project(model.name)
    return {"project_id":project_id}
