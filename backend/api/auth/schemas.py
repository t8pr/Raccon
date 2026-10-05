from pydantic import BaseModel, Field

class UserRegister(BaseModel):
    name: str
    username: str = Field(..., pattern=r"^[a-z0-9_]+$")
    email: str
    phone_number: str = Field(..., pattern=r"^\d{9}$")
    password: str = Field(max_length=72)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(max_length=72)