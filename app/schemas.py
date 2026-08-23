from pydantic import BaseModel, Field, EmailStr, ConfigDict



class CreateUser(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30
    )

    fullname: str = Field(
        min_length=3,
        max_length=100
    )

    email: EmailStr

    phone_number: str = Field(
        min_length=10,
        max_length=15
    )

    password: str = Field(
        min_length=8,
        max_length=100
    )



class UpdateUser(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30
    )

    fullname: str = Field(
        min_length=3,
        max_length=100
    )

    email: EmailStr

    phone_number: str = Field(
        min_length=10,
        max_length=15
    )



class UserLogin(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=30
    )

    password: str = Field(
        min_length=8,
        max_length=50
    )



class UpdatePassword(BaseModel):
    password: str = Field(
        min_length=8,
        max_length=50
    )

    new_password: str = Field(
        min_length=8,
        max_length=50
    )




class UserResponse(BaseModel):
    user_id: int
    username: str
    fullname: str
    email: EmailStr
    phone_number: str

    model_config = ConfigDict(
        from_attributes=True
    )




class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"




class MessageResponse(BaseModel):
    message: str




class UserCreatedResponse(MessageResponse):
    user_id: int




class DeleteAllUsersResponse(MessageResponse):
    deleted_users: int