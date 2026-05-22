from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from API.db.data import NexusMapperDB
from API.models.servicesModel import ServiceResponse, SummaryResponse, ProductSummaryResponse
from API.models.requestsModel import UpdateRequest

router = APIRouter(prefix="/services", tags=["services"])

db = NexusMapperDB()
SSL_PORTS = [443, 8443]
HTTP_PORTS = [8080, 8081, 8082, 8000, 8180, 80]

@router.get('/{project_id}', response_model=List[ServiceResponse])
async def get_project_services(project_id:int):
    data = db.get_project_data(project_id)
    for item in data:
        schema = ''
        if int(item["port"]) in HTTP_PORTS:
            schema='http'
        elif int(item["port"]) in SSL_PORTS:
            schema='https'
        
        if schema:
            url = f'{schema}://{item["ip"]}:{item["port"]}'
            item["url"] = url
    
    return data


@router.get('/summary/{project_id}', response_model=List[SummaryResponse])
async def get_detail_services(project_id:int):
    services = db.get_services(project_id)
    return services


@router.get('/product_summary/{project_id}', response_model=List[ProductSummaryResponse])
async def get_detail_services(project_id:int):
    products = db.get_product_summary(project_id)
    return products



@router.post('/upload/{project_id}')
async def upload(project_id:int, file: UploadFile= File(...)):
    if not file.filename.endswith('.xml'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un XML")
    
    try:
        xml_data = await file.read()
        db.process_nmap_xml(int(project_id), xml_data.decode('utf-8'))
        return {"message": "Archivo procesado con éxito", "project_id": project_id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/update')
async def update_port(model: UpdateRequest):
    try:
        db.update_port(model.id, {model.name:model.value} )
        return {"status":f"Actualizado con exito {model.id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




    
    