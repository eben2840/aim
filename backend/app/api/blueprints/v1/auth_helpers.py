from flask_jwt_extended import create_access_token


def make_jwt(user) -> str:
    return create_access_token(
        identity=user.id,
        additional_claims={
            "userId": user.id,
            "tenantId": user.tenant_id,
            "role": user.role.value,
        },
    )
