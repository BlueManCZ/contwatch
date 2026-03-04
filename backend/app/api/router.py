from fastapi import APIRouter

from app.api.actions import router as actions_router
from app.api.attributes import router as attributes_router
from app.api.auth import router as auth_router
from app.api.data_stats import router as data_stats_router
from app.api.data_units import router as data_units_router
from app.api.handlers import router as handlers_router
from app.api.logs import router as logs_router
from app.api.system import router as system_router
from app.api.widgets import router as widgets_router
from app.api.workflow import router as workflow_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(handlers_router)
api_router.include_router(handlers_router, prefix="/core")
api_router.include_router(attributes_router)
api_router.include_router(data_units_router)
api_router.include_router(data_stats_router)
api_router.include_router(widgets_router)
api_router.include_router(workflow_router)
api_router.include_router(actions_router)
api_router.include_router(logs_router)
api_router.include_router(system_router)
