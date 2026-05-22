from pydantic import BaseModel
from typing import Optional, List


class ProjectRequest(BaseModel):
    name:str
    
class UpdateRequest(BaseModel):
    id:int
    name:str
    value:Optional[str]

class CredentialRequest(BaseModel):
    username:str
    password:str
    hash:Optional[str]
    role:str
    ports:Optional[List[int]]
    type:str