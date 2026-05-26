from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from API.db.data import NexusMapperDB
from API.models.servicesModel import ServiceResponse, SummaryResponse, ProductSummaryResponse
from API.models.requestsModel import UpdateRequest, CommandRequest

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

@router.get('/service_total/{project_id}')
async def get_total_services(project_id:int):
    return db.get_find_services(project_id)

@router.get('/summary/{project_id}', response_model=List[SummaryResponse])
async def get_detail_services(project_id:int):
    services = db.get_services(project_id)
    return services


@router.get('/product_summary/{project_id}', response_model=List[ProductSummaryResponse])
async def get_detail_services(project_id:int):
    products = db.get_product_summary(project_id)
    return products


@router.post('/add_command')
async def add_command(model: CommandRequest):
    try:
        db.add_command(model.id, model.command)
        return {"status":"OK"}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"{e} for command {model.command} and portId: {model.id}") 


@router.post('/upload/{project_id}')
async def upload(project_id:int, files: List[UploadFile]= File(...)):
    results = []
    
    for file in files:
        if not file.filename.endswith('.xml'):
            raise HTTPException(status_code=400, detail=f"El archivo {file.filename} debe ser un XML")
        
        try:
            xml_data = await file.read()
            # Procesamos cada archivo
            db.process_nmap_xml(int(project_id), xml_data.decode('utf-8'))
            results.append(file.filename)
            
        except Exception as e:
            print(f"Error procesando {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Error al procesar {file.filename}: {str(e)}")

    return {
        "message": "Archivos procesados con éxito", 
        "project_id": project_id, 
        "processed_files": results
    }

@router.post('/update')
async def update_port(model: UpdateRequest):
    try:
        db.update_port(model.id, {model.name:model.value} )
        return {"status":f"Actualizado con exito {model.id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/bind_title/{project_id}')
async def update_title(project_id:int):
    http_services = db.get_http_services(project_id)
    return {"status":"OK"}




    
    