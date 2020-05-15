from django.conf.urls import url
from django.contrib import admin
from . import views
from django.urls import path
from show_map.views import *

urlpatterns = [
    path('', googlemap, name='googlemap'),
]
